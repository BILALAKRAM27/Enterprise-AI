from app.rag.embeddings import embedder
from app.vector_db.qdrant_client import qdrant_db
from loguru import logger


class Retriever:
    @staticmethod
    async def get_relevant_chunks(query: str, user_id: int, top_k: int = 5) -> list:
        """
        Retrieve the most relevant document chunks for a query, isolated by user_id.
        Returns an empty list if embeddings are not configured or Qdrant is unavailable.
        """
        if not embedder.is_configured():
            logger.warning("Retriever: embedder not configured — returning empty chunks.")
            return []

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
            logger.error(f"Retriever error: {e}")
            return []
