import tempfile
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete
from typing import List

from app.database.session import get_db
from app.schemas.document import DocumentResponse, DocumentCreate
from app.services.document import DocumentService
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.document import Document

router = APIRouter()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_type = file.filename.split(".")[-1].lower()
    if file_type not in ["pdf", "docx", "doc", "txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Allowed: pdf, docx, doc, txt")

    # Save to a persistent temp file — background task will clean it up
    temp_dir = tempfile.gettempdir()
    safe_name = f"{current_user.id}_{file.filename.replace(' ', '_')}"
    temp_path = os.path.join(temp_dir, safe_name)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create document record (status = PROCESSING)
    doc_in = DocumentCreate(
        filename=file.filename,
        file_type=file_type,
        user_id=current_user.id
    )
    document = await DocumentService.create_document(db, doc_in)

    # CRITICAL: Only pass the document ID — NOT the db session.
    # The request session will be closed before the background task runs.
    background_tasks.add_task(
        DocumentService.process_document_background,
        document.id,
        temp_path,
        file_type
    )

    return document


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
    )
    return result.scalars().all()


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = await db.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Delete all Citation rows that reference this document.
    #    The Citation model has a FK to document.id but the Document model
    #    has no cascade on that relationship, so we must delete them manually
    #    to avoid a ForeignKeyViolationError.
    from app.models.citation import Citation
    await db.execute(
        sql_delete(Citation).where(Citation.document_id == document_id)
    )

    # 2. Delete the document (DocumentChunks cascade via the ORM relationship).
    await db.delete(doc)
    await db.commit()

    # 3. Best-effort: remove vectors from Qdrant so stale results don't appear.
    try:
        from app.vector_db.qdrant_client import qdrant_db
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        await qdrant_db.client.delete(
            collection_name=qdrant_db.collection_name,
            points_selector=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            ),
        )
    except Exception:
        pass  # Non-critical — vectors will simply not be returned for this document

    return {"status": "success"}
