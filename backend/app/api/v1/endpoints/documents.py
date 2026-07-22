import tempfile
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete
from typing import List, Optional
from loguru import logger

from app.database.session import get_db
from app.schemas.document import DocumentResponse, DocumentCreate
from app.services.document import DocumentService
from app.api.v1.endpoints.auth import get_current_user
from app.services.auth import AuthService
from app.models.user import User
from app.models.document import Document, DocumentStatus

router = APIRouter()


async def get_current_user_from_header_or_query(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Query(None)
) -> User:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    auth_token = token
    if not auth_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ")[1]
            
    if not auth_token:
        raise credentials_exception
        
    payload = AuthService.verify_token(auth_token)
    if payload is None:
        raise credentials_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_type = file.filename.split(".")[-1].lower()
    if file_type not in ["pdf", "docx", "doc", "txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Allowed: pdf, docx, doc, txt")

    # Create document record first (status = PROCESSING) to obtain unique ID
    doc_in = DocumentCreate(
        filename=file.filename,
        file_type=file_type,
        user_id=current_user.id
    )
    document = await DocumentService.create_document(db, doc_in)

    # Save to a persistent upload directory under RAG/backend/uploads
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    persistent_path = os.path.join(upload_dir, f"{document.id}.{file_type}")

    with open(persistent_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # CRITICAL: Only pass the document ID — NOT the db session.
    # The request session will be closed before the background task runs.
    background_tasks.add_task(
        DocumentService.process_document_background,
        document.id,
        persistent_path,
        file_type
    )

    return document


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
    )
    return result.scalars().all()


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = await db.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Delete all Citation rows that reference this document.
    #    The Citation model has a FK to document.id but the Document model
    #    has no cascade on that relationship, so we must delete them manually
    #    to avoid a ForeignKeyViolationError.
    from app.models.citation import Citation
    await db.execute(
        sql_delete(Citation).where(Citation.document_id == document_id)
    )

    # 2. Delete the document (DocumentChunks cascade via the ORM relationship).
    await db.delete(doc)
    await db.commit()

    # 3. Delete the persistent file if it exists.
    try:
        upload_dir = os.path.join(os.getcwd(), "uploads")
        file_path = os.path.join(upload_dir, f"{document_id}.{doc.file_type}")
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Failed to delete persistent file {document_id}: {e}")

    # 4. Best-effort: remove vectors from Qdrant so stale results don't appear.
    try:
        from app.vector_db.qdrant_client import qdrant_db
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        await qdrant_db.client.delete(
            collection_name=qdrant_db.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(key="document_id", match=MatchValue(value=document_id)),
                    FieldCondition(key="user_id", match=MatchValue(value=current_user.id))
                ]
            ),
        )
    except Exception:
        pass  # Non-critical — vectors will simply not be returned for this document

    return {"status": "success"}


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_header_or_query)
):
    doc = await db.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    upload_dir = os.path.join(os.getcwd(), "uploads")
    file_path = os.path.join(upload_dir, f"{doc.id}.{doc.file_type}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original file not found on server")

    return FileResponse(
        path=file_path,
        filename=doc.filename,
        media_type="application/octet-stream"
    )


@router.post("/{document_id}/retry", response_model=DocumentResponse)
async def retry_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = await db.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != DocumentStatus.FAILED:
        raise HTTPException(status_code=400, detail="Only failed documents can be retried")

    # Reset status
    doc.status = DocumentStatus.PROCESSING
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    upload_dir = os.path.join(os.getcwd(), "uploads")
    file_path = os.path.join(upload_dir, f"{doc.id}.{doc.file_type}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original document file not found to retry")

    background_tasks.add_task(
        DocumentService.process_document_background,
        doc.id,
        file_path,
        doc.file_type
    )

    return doc
