from langchain_openai import OpenAIEmbeddings
from app.core.config import settings
from loguru import logger


class Embedder:
    def __init__(self):
        self._configured = bool(settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.strip())

        if self._configured:
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base=settings.OPENROUTER_BASE_URL,
                model="text-embedding-3-small",
            )
            logger.info(
                f"Embedder initialized via OpenRouter "
                f"(model: text-embedding-3-small, base: {settings.OPENROUTER_BASE_URL})."
            )
        else:
            self.embeddings = None
            logger.warning(
                "OPENROUTER_API_KEY is not set — embeddings are DISABLED. "
                "Documents will be parsed and chunked but NOT vectorized. "
                "Set OPENROUTER_API_KEY in backend/.env to enable semantic search."
            )

    def is_configured(self) -> bool:
        return self._configured

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not self._configured:
            raise RuntimeError("OPENROUTER_API_KEY not configured — cannot generate embeddings.")
        return self.embeddings.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        if not self._configured:
            raise RuntimeError("OPENROUTER_API_KEY not configured — cannot embed query.")
        return self.embeddings.embed_query(text)


embedder = Embedder()
