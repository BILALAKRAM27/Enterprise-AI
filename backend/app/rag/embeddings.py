"""
Embeddings module using the google-genai SDK directly with the stable v1 API.

langchain-google-genai v4+ uses google-genai as its backend and defaults to
the v1beta endpoint. The text-embedding-004 model is only available on the
stable v1 endpoint, so we call the SDK directly with api_version='v1'.
"""
from google import genai
from google.genai import types as genai_types
from app.core.config import settings
from loguru import logger

_MODEL = "gemini-embedding-001"


class Embedder:
    def __init__(self):
        self._configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())

        if self._configured:
            # Force stable v1 endpoint — v1beta does not expose text-embedding-004
            self._client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options={"api_version": "v1"},
            )
            logger.info(
                f"Embedder initialized via google-genai SDK "
                f"(model: {_MODEL}, endpoint: v1)."
            )
        else:
            self._client = None
            logger.warning(
                "GEMINI_API_KEY is not set — embeddings are DISABLED. "
                "Documents will be parsed and chunked but NOT vectorized. "
                "Set GEMINI_API_KEY in backend/.env to enable semantic search."
            )

    def is_configured(self) -> bool:
        return self._configured

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. Returns a list of float vectors."""
        if not self._configured:
            raise RuntimeError("GEMINI_API_KEY not configured — cannot generate embeddings.")

        result = self._client.models.embed_content(
            model=_MODEL,
            contents=texts,
            config=genai_types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
            ),
        )
        return [embedding.values for embedding in result.embeddings]

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string."""
        if not self._configured:
            raise RuntimeError("GEMINI_API_KEY not configured — cannot embed query.")

        result = self._client.models.embed_content(
            model=_MODEL,
            contents=[text],
            config=genai_types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
            ),
        )
        return result.embeddings[0].values


embedder = Embedder()
