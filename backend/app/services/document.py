import os
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.models.document import Document, DocumentStatus
from app.models.document_chunk import DocumentChunk
from app.schemas.document import DocumentCreate
from app.rag.document_parser import DocumentParser
from app.rag.chunker import Chunker
import uuid
from app.rag.embeddings import embedder
from qdrant_client.http.models import PointStruct
from app.vector_db.qdrant_client import qdrant_db
from app.database.session import AsyncSessionLocal
from loguru import logger


class DocumentService:
    @staticmethod
    async def create_document(db: AsyncSession, document_in: DocumentCreate) -> Document:
        db_doc = Document(
            user_id=document_in.user_id,
            filename=document_in.filename,
            file_type=document_in.file_type,
            status=DocumentStatus.PROCESSING
        )
        db.add(db_doc)
        await db.commit()
        await db.refresh(db_doc)
        return db_doc

    @staticmethod
    async def process_document_background(doc_id: int, file_path: str, file_type: str):
        """
        Background task that creates its OWN database session.
        
        Critical bug fix: the original code passed the request-scoped AsyncSession
        from the endpoint handler. By the time the background task runs, FastAPI has
        already closed that session (it exits the `async with` block in get_db).
        Attempting to use it raises 'session is closed'. We now open a fresh session.
        """
        async with AsyncSessionLocal() as db:
            try:
                doc = await db.get(Document, doc_id)
                if not doc:
                    logger.error(f"Background task: Document {doc_id} not found.")
                    return

                logger.info(f"Processing document {doc_id}: {doc.filename}")

                # Clean up existing database chunks and Qdrant vectors before processing to avoid duplicates
                from app.models.document_chunk import DocumentChunk
                from sqlalchemy import delete as sql_delete
                await db.execute(sql_delete(DocumentChunk).where(DocumentChunk.document_id == doc_id))
                await db.commit()

                try:
                    from app.vector_db.qdrant_client import qdrant_db
                    from qdrant_client.models import Filter, FieldCondition, MatchValue
                    await qdrant_db.client.delete(
                        collection_name=qdrant_db.collection_name,
                        points_selector=Filter(
                            must=[FieldCondition(key="document_id", match=MatchValue(value=doc_id))]
                        ),
                    )
                except Exception as q_err:
                    logger.warning(f"Failed to delete old qdrant vectors for doc {doc_id}: {q_err}")

                # 1. Parse
                if file_type.lower() == "pdf":
                    text = DocumentParser._parse_pdf(file_path)
                elif file_type.lower() in ["docx", "doc"]:
                    text = DocumentParser._parse_docx(file_path)
                elif file_type.lower() == "txt":
                    text = DocumentParser._parse_txt(file_path)
                else:
                    raise ValueError(f"Unsupported type: {file_type}")

                if not text or not text.strip():
                    raise ValueError("Parsed document is empty.")

                # 2. Chunk
                chunker = Chunker()
                chunks = chunker.chunk_text(text)
                logger.info(f"Document {doc_id}: {len(chunks)} chunks created.")

                # 3. Save chunks to DB
                db_chunks = []
                for i, chunk_text in enumerate(chunks):
                    db_chunk = DocumentChunk(
                        document_id=doc_id,
                        page_number=None,
                        chunk_index=i,
                        chunk_text=chunk_text
                    )
                    db.add(db_chunk)
                    db_chunks.append(db_chunk)

                await db.flush()

                # 4. Embed + Upsert to Qdrant (only if OpenAI key is configured)
                if chunks and embedder.is_configured():
                    logger.info(f"Document {doc_id}: generating embeddings...")
                    vectors = embedder.embed_documents(chunks)
                    points = []
                    for i, chunk in enumerate(db_chunks):
                        points.append(
                            PointStruct(
                                id=str(uuid.uuid4()),
                                vector=vectors[i],
                                payload={
                                    "document_id": doc_id,
                                    "chunk_id": chunk.id,
                                    "chunk_index": chunk.chunk_index,
                                    "text_content": chunk.chunk_text,
                                    "filename": doc.filename,
                                    "user_id": doc.user_id,
                                    "page_number": chunk.page_number
                                }
                            )
                        )
                    await qdrant_db.upsert_vectors(points)
                    logger.info(f"Document {doc_id}: {len(points)} vectors upserted to Qdrant.")
                else:
                    logger.warning(
                        f"Document {doc_id}: Google Generative AI not configured, skipping embeddings. "
                        "Set GEMINI_API_KEY in .env to enable vector search."
                    )

                doc.status = DocumentStatus.READY
                db.add(doc)
                await db.commit()
                logger.info(f"Document {doc_id} processed successfully — status: READY")

            except Exception as e:
                logger.error(f"Error processing document {doc_id}: {e}")
                try:
                    # Use a fresh, clean database session to guarantee status update to FAILED
                    async with AsyncSessionLocal() as fail_db:
                        fail_doc = await fail_db.get(Document, doc_id)
                        if fail_doc:
                            fail_doc.status = DocumentStatus.FAILED
                            fail_db.add(fail_doc)
                            await fail_db.commit()
                            logger.info(f"Document {doc_id} marked as FAILED in database.")
                except Exception as inner_e:
                    logger.error(f"Failed to update document status to FAILED: {inner_e}")
            finally:
                # Do not delete files in our persistent uploads directory so they can be opened and retried
                if "uploads" not in file_path and os.path.exists(file_path):
                    os.remove(file_path)

    @staticmethod
    async def reindex_all_documents():
        """
        Re-indexes all READY documents from PostgreSQL into Qdrant on startup to ensure
        all existing vectors have the correct user_id payload field attached.
        """
        from app.database.session import AsyncSessionLocal
        from app.models.document import Document, DocumentStatus
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        import uuid

        if not embedder.is_configured():
            logger.warning("Reindex: embedder not configured, skipping backfill.")
            return

        async with AsyncSessionLocal() as db:
            try:
                result = await db.execute(
                    select(Document)
                    .where(Document.status == DocumentStatus.READY)
                    .options(selectinload(Document.chunks))
                )
                docs = result.scalars().all()
                if not docs:
                    logger.info("Reindex: No ready documents to reindex.")
                    return

                logger.info(f"Reindex: Syncing {len(docs)} existing documents to Qdrant with user_id payload...")
                import asyncio
                for doc in docs:
                    if not doc.chunks:
                        continue

                    chunk_texts = [c.chunk_text for c in doc.chunks]
                    
                    # Retry loop for rate limits (429)
                    for attempt in range(3):
                        try:
                            # Clean old points for this doc
                            try:
                                from app.vector_db.qdrant_client import qdrant_db
                                from qdrant_client.models import Filter, FieldCondition, MatchValue
                                await qdrant_db.client.delete(
                                    collection_name=qdrant_db.collection_name,
                                    points_selector=Filter(
                                        must=[FieldCondition(key="document_id", match=MatchValue(value=doc.id))]
                                    ),
                                )
                            except Exception:
                                pass

                            vectors = embedder.embed_documents(chunk_texts)
                            points = []
                            for i, chunk in enumerate(doc.chunks):
                                points.append(
                                    PointStruct(
                                        id=str(uuid.uuid4()),
                                        vector=vectors[i],
                                        payload={
                                            "document_id": doc.id,
                                            "chunk_id": chunk.id,
                                            "chunk_index": chunk.chunk_index,
                                            "text_content": chunk.chunk_text,
                                            "filename": doc.filename,
                                            "user_id": doc.user_id,
                                            "page_number": chunk.page_number
                                        }
                                    )
                                )
                            await qdrant_db.upsert_vectors(points)
                            logger.info(f"Reindex: Document {doc.id} ({doc.filename}) re-indexed with user_id={doc.user_id}.")
                            await asyncio.sleep(0.5)  # Throttling delay to stay under RPM limits
                            break
                        except Exception as doc_err:
                            err_str = str(doc_err)
                            if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and attempt < 2:
                                logger.warning(f"Reindex rate limited on doc {doc.id}. Pausing 12s before retry (attempt {attempt+1}/3)...")
                                await asyncio.sleep(12)
                            else:
                                logger.error(f"Failed to reindex document {doc.id} ({doc.filename}): {doc_err}")
                                break

            except Exception as e:
                logger.error(f"Reindex error: {e}")

