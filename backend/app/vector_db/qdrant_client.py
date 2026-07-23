from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Distance, VectorParams
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
from app.core.config import settings
from loguru import logger


class QdrantDBClient:
    def __init__(self):
        host = settings.QDRANT_HOST

        # Qdrant Cloud returns a full HTTPS URL; the AsyncQdrantClient
        # requires `url=` in that case.  For local Docker we use
        # the separate `host= / port=` params as before.
        if host.startswith("http://") or host.startswith("https://"):
            self.client = AsyncQdrantClient(
                url=host,
                api_key=settings.QDRANT_API_KEY or None,
            )
        else:
            self.client = AsyncQdrantClient(
                host=host,
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
            if exists:
                try:
                    info = await self.client.get_collection(self.collection_name)
                    vectors_config = info.config.params.vectors
                    # If it's a single vector config, it will have a .size attribute
                    current_size = getattr(vectors_config, "size", None)
                    if current_size is not None and current_size != 3072:
                        logger.info(f"Qdrant collection size mismatch ({current_size} != 3072). Recreating...")
                        await self.client.delete_collection(self.collection_name)
                        exists = False
                except Exception as ex:
                    logger.warning(f"Could not verify collection size: {ex}")
            
            if not exists:
                await self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=3072, distance=Distance.COSINE),
                )
                logger.info(f"Qdrant collection '{self.collection_name}' created (size=3072).")
            else:
                logger.info(f"Qdrant collection '{self.collection_name}' already exists.")
        except Exception as e:
            logger.warning(f"Qdrant collection init failed: {e}")

    async def upsert_vectors(self, points: list):
        await self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

    async def search(self, query_vector: list[float], user_id: int, limit: int = 5) -> list:
        """
        Search for nearest vectors, strictly isolated by user_id.
        Tries the modern query_points() API first (qdrant-client >=1.7.x),
        then falls back to the legacy search() API for older versions.
        """
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id),
                )
            ]
        )
        try:
            # Modern API: query_points (qdrant-client >= 1.7.x)
            response = await self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=limit,
                with_payload=True,
            )
            return response.points
        except AttributeError:
            # Fallback: legacy search API (qdrant-client < 1.7.x)
            try:
                results = await self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vector,
                    query_filter=query_filter,
                    limit=limit,
                    with_payload=True,
                )
                return results
            except Exception as e:
                logger.warning(f"Qdrant search failed: {e}")
                return []
        except Exception as e:
            logger.warning(f"Qdrant search failed: {e}")
            return []


qdrant_db = QdrantDBClient()
