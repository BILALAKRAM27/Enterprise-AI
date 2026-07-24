from app.rag.embeddings import embedder
from app.vector_db.qdrant_client import qdrant_db
from loguru import logger


class Retriever:
    @staticmethod
    async def get_relevant_chunks(query: str, user_id: int, top_k: int = 5) -> list:
        """
        Retrieve the most relevant document chunks for a query, strictly isolated by user_id.
        Raises an exception if embedding or Qdrant search encounters an infrastructure failure.
        """
        if not embedder.is_configured():
            logger.error("Retriever error: embedder not configured.")
            raise RuntimeError("Embeddings service is not configured (GEMINI_API_KEY missing).")

        try:
            query_vector = embedder.embed_query(query)
            results = await qdrant_db.search(query_vector=query_vector, user_id=user_id, limit=top_k)
            chunks = []
            for res in results:
                chunks.append({
                    "score": res.score,
                    "document_id": res.payload.get("document_id"),
                    "chunk_id": res.payload.get("chunk_id"),
                    "text_content": res.payload.get("text_content"),
                    "filename": res.payload.get("filename"),
                    "page_number": res.payload.get("page_number"),
                })
            return chunks
        except Exception as e:
            logger.error(f"Retriever error for user_id={user_id}: {e}")
            raise e

