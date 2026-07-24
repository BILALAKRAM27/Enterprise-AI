import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from app.rag.retriever import Retriever
from app.rag.generator import Generator
from app.vector_db.qdrant_client import QdrantDBClient
from qdrant_client.models import PayloadSchemaType


@pytest.mark.asyncio
async def test_ensure_payload_indexes_idempotent(monkeypatch):
    """Verify that ensure_payload_indexes creates missing payload indexes idempotently."""
    client = QdrantDBClient()

    mock_collection_info = MagicMock()
    # Simulate user_id index already present, others missing
    mock_collection_info.payload_schema = {
        "user_id": MagicMock()
    }

    client.client.get_collection = AsyncMock(return_value=mock_collection_info)
    client.client.create_payload_index = AsyncMock()

    await client.ensure_payload_indexes()

    # Should attempt creation for document_id, chunk_id, page_number
    created_fields = [call.kwargs["field_name"] for call in client.client.create_payload_index.call_args_list]
    assert "document_id" in created_fields
    assert "chunk_id" in created_fields
    assert "page_number" in created_fields
    assert "user_id" not in created_fields


@pytest.mark.asyncio
async def test_multi_user_vector_isolation(monkeypatch):
    """Verify that search passes user_id filter and isolated results are returned."""
    client = QdrantDBClient()
    mock_query_points = AsyncMock()
    
    # Mock response points
    mock_point = MagicMock()
    mock_point.payload = {
        "user_id": 101,
        "document_id": 5,
        "chunk_id": 12,
        "page_number": 1,
        "filename": "user101_doc.pdf",
        "text_content": "Confidential data for User 101"
    }
    mock_point.score = 0.95
    
    mock_response = MagicMock()
    mock_response.points = [mock_point]
    mock_query_points.return_value = mock_response
    
    monkeypatch.setattr(client.client, "query_points", mock_query_points)

    # Execute search for User 101
    results = await client.search(query_vector=[0.1] * 3072, user_id=101, limit=5)
    
    assert len(results) == 1
    assert results[0].payload["user_id"] == 101

    # Check filter passed to Qdrant
    call_args = mock_query_points.call_args
    passed_filter = call_args.kwargs["query_filter"]
    assert passed_filter.must[0].key == "user_id"
    assert passed_filter.must[0].match.value == 101


@pytest.mark.asyncio
async def test_retrieval_failure_raises_500_error(monkeypatch):
    """Verify that when Qdrant search fails, Generator raises HTTPException 500 and does NOT call LLM."""
    gen = Generator()
    
    # Mock retriever failure
    async def mock_get_relevant_chunks_failing(query, user_id):
        raise RuntimeError("Qdrant index required error: Index required but not found for user_id")
        
    monkeypatch.setattr(Retriever, "get_relevant_chunks", mock_get_relevant_chunks_failing)
    
    # Mock LLM call to verify it is NEVER invoked
    mock_llm_call = AsyncMock()
    monkeypatch.setattr(gen, "_generate_with_fallback", mock_llm_call)

    with pytest.raises(HTTPException) as exc_info:
        await gen.generate_answer("What is the quarterly revenue?", user_id=42)

    assert exc_info.value.status_code == 500
    assert "Knowledge retrieval service failed" in exc_info.value.detail
    mock_llm_call.assert_not_called()


@pytest.mark.asyncio
async def test_empty_retrieval_returns_fallback_without_llm_call(monkeypatch):
    """Verify that when retrieval returns 0 chunks, Generator returns default response without invoking LLM."""
    gen = Generator()
    
    # Mock retriever returning empty list
    async def mock_get_relevant_chunks_empty(query, user_id):
        return []
        
    monkeypatch.setattr(Retriever, "get_relevant_chunks", mock_get_relevant_chunks_empty)
    
    # Mock LLM call to ensure zero calls occur
    mock_llm_call = AsyncMock()
    monkeypatch.setattr(gen, "_generate_with_fallback", mock_llm_call)

    response = await gen.generate_answer("Where is my invoice?", user_id=42)

    assert response["answer"] == "I could not find relevant information in your uploaded documents."
    assert response["citations"] == []
    mock_llm_call.assert_not_called()
