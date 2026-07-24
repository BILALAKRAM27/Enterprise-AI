"""
LLM Generator using the google-genai SDK directly with the stable v1 API.

Includes:
- Exponential backoff retry on 429 RESOURCE_EXHAUSTED errors (tenacity).
- Automatic model fallback: gemini-2.0-flash → gemini-1.5-flash when the
  primary model's daily/minute free-tier quota is exhausted.
"""
import asyncio

from google import genai
from google.genai import types as genai_types
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from fastapi import HTTPException
from app.core.config import settings
from app.rag.retriever import Retriever
from loguru import logger

# Ordered list of models to try. Falls through on quota exhaustion.
_MODELS = ["gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"]


def _is_rate_limit_error(exc: Exception) -> bool:
    """Return True only for transient 429 quota errors worth retrying."""
    msg = str(exc)
    return "429" in msg or "RESOURCE_EXHAUSTED" in msg


class Generator:
    def __init__(self):
        self._configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())

        if self._configured:
            # Force stable v1 endpoint
            self._client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options={"api_version": "v1"},
            )
            logger.info(
                f"LLM Generator initialized via google-genai SDK "
                f"(models: {_MODELS}, endpoint: v1)."
            )
        else:
            self._client = None
            logger.warning(
                "GEMINI_API_KEY is not set — LLM is DISABLED. "
                "Chat will return a placeholder response. "
                "Set GEMINI_API_KEY in backend/.env to enable AI responses."
            )

        self.system_prompt = (
            "You are an enterprise AI knowledge assistant. "
            "Answer the user's question using ONLY the provided context. "
            "If the context is empty or does not contain the answer, say: "
            "'I could not find relevant information in your uploaded documents.' "
            "Always cite the document filename when referencing source material."
        )

    @retry(
        retry=retry_if_exception(_is_rate_limit_error),
        wait=wait_exponential(multiplier=2, min=3, max=60),
        stop=stop_after_attempt(4),
        reraise=True,
    )
    async def _call_model(self, model: str, prompt: str) -> str:
        """Call a single Gemini model with retry on 429."""
        response = await self._client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(temperature=0),
        )
        return response.text

    async def _generate_with_fallback(self, prompt: str) -> str:
        """Try each model in order, falling back on quota exhaustion."""
        last_error: Exception | None = None
        for model in _MODELS:
            try:
                logger.info(f"Attempting generation with model: {model}")
                text = await self._call_model(model, prompt)
                logger.info(f"Generation succeeded with model: {model}")
                return text
            except Exception as e:
                msg = str(e)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                    logger.warning(
                        f"Model {model} quota exhausted — "
                        f"{'trying next model' if model != _MODELS[-1] else 'all models exhausted'}."
                    )
                    last_error = e
                    # Small pause before switching models
                    await asyncio.sleep(2)
                    continue
                # Non-quota error — raise immediately
                raise

        raise last_error  # type: ignore[misc]

    async def generate_answer(self, query: str, user_id: int) -> dict:
        # Phase 6: 1. Retrieve relevant chunks from Qdrant, strictly isolated by user_id.
        # If vector storage / embedding infrastructure fails, propagate HTTP 500 error.
        try:
            chunks = await Retriever.get_relevant_chunks(query, user_id=user_id)
        except Exception as err:
            logger.error(f"Vector search/retrieval pipeline failed for user_id={user_id}: {err}")
            raise HTTPException(
                status_code=500,
                detail=f"Knowledge retrieval service failed: {err}"
            ) from err

        # Phase 6: 2. If retrieval succeeds cleanly but no relevant chunks exist, return exact fallback message
        if not chunks:
            logger.info(f"Retrieval returned 0 chunks for user_id={user_id}. Skipping LLM generation.")
            return {
                "answer": "I could not find relevant information in your uploaded documents.",
                "citations": [],
            }

        # 3. Build context string
        context_text = ""
        for i, chunk in enumerate(chunks):
            context_text += (
                f"\n--- Context {i+1} (Source: {chunk.get('filename', 'unknown')}) ---\n"
                f"{chunk.get('text_content', '')}\n"
            )

        # 4. If LLM not configured, raise 500 error
        if not self._configured:
            raise HTTPException(
                status_code=500,
                detail="The AI language model is not configured. Please set GEMINI_API_KEY in backend/.env."
            )

        # 5. Build prompt
        full_prompt = (
            self.system_prompt
            + "\n\nContext:\n"
            + context_text
            + f"\n\nUser question: {query}"
        )

        # 6. Generate response (with fallback + retry)
        try:
            answer = await self._generate_with_fallback(full_prompt)
        except Exception as e:
            logger.error(f"LLM generation error (all models exhausted): {e}")
            answer = (
                "I'm temporarily unable to generate a response because the AI quota has been "
                "exhausted for today. Please try again later, or upgrade your Gemini API plan "
                "at https://ai.google.dev/gemini-api/docs/rate-limits"
            )

        # If the LLM output indicates no relevant info was found, do not attach citations
        fallback_phrases = [
            "could not find relevant information",
            "could not find any relevant information",
            "no relevant information",
            "temporarily unable to generate",
            "no documents have been uploaded",
        ]
        answer_lower = answer.lower()
        if any(phrase in answer_lower for phrase in fallback_phrases):
            return {
                "answer": answer,
                "citations": [],
            }

        return {
            "answer": answer,
            "citations": chunks,
        }


generator = Generator()

