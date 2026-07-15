from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Distance, VectorParams
from qdrant_client.models import PointStruct, Query
from app.core.config import settings
from loguru import logger


class QdrantDBClient:
    def __init__(self):
        self.client = AsyncQdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT,
            api_key=settings.QDRANT_API_KEY or None,
            https=False,
            prefer_grpc=False,
        )
        self.collection_name = "enterprise_knowledge"

    async def init_collection(self):
        """Create the Qdrant collection if it doesn't already exist."""
        try:
            exists = await self.client.collection_exists(self.collection_name)
            if not exists:
                await self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
                )
                logger.info(f"Qdrant collection '{self.collection_name}' created.")
            else:
                logger.info(f"Qdrant collection '{self.collection_name}' already exists.")
        except Exception as e:
            logger.warning(f"Qdrant collection init failed: {e}")

    async def upsert_vectors(self, points: list):
        await self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

    async def search(self, query_vector: list[float], limit: int = 5) -> list:
        """
        Search for nearest vectors.
        Uses query_points() — the current API for AsyncQdrantClient (qdrant-client >= 1.8).
        The legacy .search() method was removed from the async client.
        """
        try:
            results = await self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=limit,
                with_payload=True,
            )
            # query_points returns a QueryResponse with a .points list
            return results.points
        except Exception as e:
            logger.warning(f"Qdrant search failed: {e}")
            return []


qdrant_db = QdrantDBClient()
