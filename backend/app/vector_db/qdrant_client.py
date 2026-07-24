from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Distance, VectorParams
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue, PayloadSchemaType
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
        """Create the Qdrant collection and required payload indexes if they don't already exist."""
        try:
            exists = await self.client.collection_exists(self.collection_name)
            if exists:
                try:
                    info = await self.client.get_collection(self.collection_name)
                    vectors_config = info.config.params.vectors
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
                logger.info(f"Qdrant collection '{self.collection_name}' created (size=3072, distance=Cosine).")
            else:
                logger.info(f"Qdrant collection '{self.collection_name}' already exists.")

            # Phase 2: Create required payload indexes idempotently
            await self.ensure_payload_indexes()

            # Phase 7: Log complete startup verification
            info = await self.client.get_collection(self.collection_name)
            indexed_fields = list((getattr(info, "payload_schema", {}) or {}).keys())
            logger.info(
                f"✓ Qdrant initialization verified: collection='{self.collection_name}', "
                f"vector_dim=3072, payload_indexes={indexed_fields}"
            )
        except Exception as e:
            logger.error(f"Qdrant collection init failed: {e}")
            raise e

    async def ensure_payload_indexes(self):
        """Ensure all required payload indexes exist on the collection idempotently."""
        required_indexes = {
            "user_id": PayloadSchemaType.INTEGER,
            "document_id": PayloadSchemaType.INTEGER,
            "chunk_id": PayloadSchemaType.INTEGER,
            "page_number": PayloadSchemaType.INTEGER,
        }
        try:
            collection_info = await self.client.get_collection(self.collection_name)
            existing_schema = getattr(collection_info, "payload_schema", {}) or {}

            for field_name, field_schema in required_indexes.items():
                if field_name not in existing_schema:
                    try:
                        await self.client.create_payload_index(
                            collection_name=self.collection_name,
                            field_name=field_name,
                            field_schema=field_schema,
                        )
                        logger.info(f"✓ Created payload index for field '{field_name}' ({field_schema}).")
                    except Exception as idx_err:
                        # Log warning if index already being created or error occurred
                        logger.warning(f"Payload index creation note for '{field_name}': {idx_err}")
                else:
                    logger.info(f"✓ Payload index for field '{field_name}' already present.")
        except Exception as e:
            logger.error(f"Failed ensuring payload indexes: {e}")
            raise e

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
                logger.error(f"Qdrant search failed: {e}")
                raise RuntimeError(f"Qdrant search failed: {e}") from e
        except Exception as e:
            logger.error(f"Qdrant search failed: {e}")
            raise RuntimeError(f"Qdrant search failed: {e}") from e


qdrant_db = QdrantDBClient()

