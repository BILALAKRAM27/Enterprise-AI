from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings
from app.rag.retriever import Retriever
from loguru import logger


class Generator:
    def __init__(self):
        self._configured = bool(settings.OPENROUTER_API_KEY and settings.OPENROUTER_API_KEY.strip())

        if self._configured:
            self.llm = ChatOpenAI(
                model="openai/gpt-3.5-turbo",
                openai_api_key=settings.OPENROUTER_API_KEY,
                openai_api_base=settings.OPENROUTER_BASE_URL,
                temperature=0,
            )
            logger.info(
                f"LLM Generator initialized via OpenRouter "
                f"(model: openai/gpt-3.5-turbo, base: {settings.OPENROUTER_BASE_URL})."
            )
        else:
            self.llm = None
            logger.warning(
                "OPENROUTER_API_KEY is not set — LLM is DISABLED. "
                "Chat will return a placeholder response. "
                "Set OPENROUTER_API_KEY in backend/.env to enable AI responses."
            )

        self.system_prompt = (
            "You are an enterprise AI knowledge assistant. "
            "Answer the user's question using ONLY the provided context. "
            "If the context is empty or does not contain the answer, say: "
            "'I could not find relevant information in the uploaded documents.' "
            "Always cite the document filename when referencing source material."
        )

    async def generate_answer(self, query: str) -> dict:
        # 1. Retrieve relevant chunks from Qdrant
        chunks = await Retriever.get_relevant_chunks(query)

        # 2. Build context string
        context_text = ""
        for i, chunk in enumerate(chunks):
            context_text += (
                f"\n--- Context {i+1} (Source: {chunk.get('filename', 'unknown')}) ---\n"
                f"{chunk.get('text_content', '')}\n"
            )

        # 3. If LLM not configured, return a helpful error
        if not self._configured:
            return {
                "answer": (
                    "The AI language model is not configured. "
                    "Please set OPENROUTER_API_KEY in backend/.env and restart the server."
                ),
                "citations": chunks,
            }

        # 4. Generate response
        messages = [
            SystemMessage(
                content=self.system_prompt
                + "\n\nContext:\n"
                + (context_text or "No documents have been uploaded yet.")
            ),
            HumanMessage(content=query),
        ]

        try:
            response = await self.llm.ainvoke(messages)
            answer = response.content
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            answer = f"An error occurred while generating the response: {str(e)}"

        return {
            "answer": answer,
            "citations": chunks,
        }


generator = Generator()
