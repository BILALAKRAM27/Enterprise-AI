# Enterprise-AI — RAG System Deep Dive

A complete walkthrough of how your **Enterprise Knowledge AI Assistant** works: the tech stack, every file's job, and the full data flow from "upload a PDF" to "get a cited answer."

---

## Running the Project
## Backend

cd backend
docker compose up --build

## Frontend

cd frontend
npm expo start -c

## 1. The Big Picture

This project is a **RAG (Retrieval-Augmented Generation)** application. In plain terms:

> Instead of asking an LLM to answer from what it memorized during training, you first **retrieve** relevant snippets from *your own documents*, then hand those snippets to the LLM and say "answer using **only** this." This is what stops the model from hallucinating and lets it cite your actual files.

Your system has two halves:

| Layer | Tech | Job |
|---|---|---|
| **Backend** | FastAPI + PostgreSQL + Qdrant + Gemini | Parses documents, embeds them, stores vectors, retrieves context, generates grounded answers |
| **Frontend** | React Native (Expo) | Mobile/web app for login, uploading documents, and chatting with the assistant |

Everything is containerized with **Docker Compose**, spinning up three services: `api` (FastAPI), `db` (Postgres), `qdrant` (vector database).

---

## 2. Full Technology Stack

### Backend (`/backend`)
| Tech | Purpose |
|---|---|
| **FastAPI** | Async Python web framework — serves the REST API |
| **PostgreSQL** (via `asyncpg` + SQLAlchemy 2.0 async ORM) | Stores structured data: users, documents, chats, messages, citations, chunk *text* |
| **Qdrant** | Vector database — stores chunk *embeddings* for semantic search |
| **Alembic** | Database migrations |
| **google-genai SDK** | Talks to Google's Gemini models directly (both for embeddings and text generation) |
| **`gemini-embedding-001`** | Embedding model (3072-dim vectors) |
| **`gemini-3.1-flash-lite` → `gemini-2.0-flash` → `gemini-1.5-flash`** | LLM generation, with automatic fallback chain |
| **LangChain (`langchain-text-splitters`)** | `RecursiveCharacterTextSplitter` for chunking |
| **PyMuPDF (`fitz`)** | PDF text extraction |
| **`python-docx`** | Word (.docx) text extraction |
| **PyJWT + bcrypt** | Auth: JWT access tokens + password hashing |
| **Tenacity** | Retry logic with exponential backoff for Gemini rate limits |
| **Loguru** | Structured logging |

### Frontend (`/frontend`)
| Tech | Purpose |
|---|---|
| **Expo + React Native** | Cross-platform (iOS/Android/Web) app shell |
| **Expo Router** | File-based navigation (`app/` directory = routes) |
| **Redux Toolkit + redux-persist** | Auth state management, persisted across sessions |
| **TanStack React Query** | Server-state caching (chats, documents, messages) |
| **Axios** | HTTP client to the FastAPI backend |
| **NativeWind + Tailwind** | Styling |
| **react-hook-form + zod** | Form handling & validation (login/register) |
| **expo-document-picker** | Native file picker for document upload |
| **expo-secure-store** | Secure JWT token storage on-device |

---

## 3. Backend Directory Map — What Each File Does

```
backend/app/
├── main.py                      → App entrypoint, startup hooks, CORS, router mounting
├── core/
│   ├── config.py                → All environment settings (DB, Qdrant, Gemini key)
│   └── exceptions.py            → Global error handlers
├── database/
│   ├── session.py                → Async SQLAlchemy engine + session factory
│   ├── base.py / base_class.py  → Declarative Base, auto table-naming
│   └── repository.py            → (generic DB helper base)
├── models/                      → SQLAlchemy ORM tables
│   ├── user.py                  → User (email, hashed_password)
│   ├── document.py              → Document (status: processing/ready/failed)
│   ├── document_chunk.py        → DocumentChunk (raw chunk text, tied to a Document)
│   ├── chat.py                  → Chat (a conversation thread)
│   ├── message.py                → Message (user or AI turn)
│   └── citation.py              → Citation (links an AI message → source document + score)
├── schemas/                     → Pydantic request/response models
├── api/v1/
│   ├── api.py                   → Mounts all routers under /api/v1
│   └── endpoints/
│       ├── auth.py              → /register, /login, get_current_user dependency
│       ├── users.py             → /users/me
│       ├── documents.py         → upload/list/delete/download/retry documents
│       └── chat.py              → create chat, list history, send message, get messages
├── services/                    → Business logic orchestration layer
│   ├── auth.py                  → Password hashing/verify, JWT create/verify
│   ├── document.py              → THE INGESTION PIPELINE (parse→chunk→embed→store)
│   └── chat.py                  → THE QUERY PIPELINE (save msg→RAG→save answer+citations)
├── rag/                          → THE CORE RAG ENGINE
│   ├── document_parser.py       → Extracts raw text from PDF/DOCX/TXT
│   ├── chunker.py                → Splits text into overlapping chunks
│   ├── embeddings.py             → Turns text into vectors (Gemini embedding model)
│   ├── retriever.py              → Given a query, fetches top-k relevant chunks from Qdrant
│   └── generator.py              → Builds the prompt + calls Gemini LLM + returns answer
└── vector_db/
    └── qdrant_client.py          → Qdrant collection setup, upsert, and vector search
```

---

## 4. Workflow #1 — Document Ingestion (turning a PDF into searchable knowledge)

This is triggered when a user uploads a file via `POST /api/v1/documents/upload`.

```
User uploads PDF/DOCX/TXT
        │
        ▼
[documents.py] upload_document()
  1. Validates file extension (pdf/docx/doc/txt only)
  2. Creates a Document DB row immediately, status = PROCESSING
     → this gives the frontend an ID to poll/display right away
  3. Saves the raw file permanently to backend/uploads/{doc_id}.{ext}
  4. Schedules a FastAPI BackgroundTask → DocumentService.process_document_background()
     (returns to the user instantly — processing happens async, off the request thread)
        │
        ▼
[services/document.py] process_document_background()
  ⚠ Opens its OWN fresh DB session — the original request's session is already
    closed by the time this background task runs (a real bug the code fixed).

  Step 1 — PARSE  (rag/document_parser.py)
     • PDF   → PyMuPDF (`fitz`) reads text page by page
     • DOCX  → python-docx reads all paragraphs
     • TXT   → plain read
     → produces one big raw text string

  Step 2 — CHUNK  (rag/chunker.py)
     • LangChain's RecursiveCharacterTextSplitter
     • chunk_size = 1000 chars, chunk_overlap = 100 chars
     • Overlap matters: it prevents a sentence/idea from being cut in half
       between two chunks and losing meaning at the boundary

  Step 3 — SAVE CHUNKS TO POSTGRES
     • Each chunk becomes a DocumentChunk row (chunk_index, chunk_text)
     • This is the durable, human-readable copy of your knowledge base

  Step 4 — EMBED  (rag/embeddings.py)
     • Only runs if GEMINI_API_KEY is configured
     • Calls Gemini's `gemini-embedding-001` model with task_type=RETRIEVAL_DOCUMENT
     • Each chunk → a 3072-dimension float vector (a numeric "meaning fingerprint")

  Step 5 — UPSERT TO QDRANT  (vector_db/qdrant_client.py)
     • Each vector is wrapped in a PointStruct with payload:
       {document_id, chunk_id, chunk_index, text_content, filename}
     • Pushed into the "enterprise_knowledge" Qdrant collection (COSINE distance)

  Step 6 — MARK READY
     • Document.status = READY (or FAILED if any step throws)
     • Failed documents can be retried via POST /documents/{id}/retry
```

**Why store chunks in both Postgres AND Qdrant?**
- **Postgres** = the source of truth for the actual text (durable, relational, queryable by document).
- **Qdrant** = a specialized index optimized for "find the 5 chunks most *semantically similar* to this query" — something a normal SQL `WHERE` clause can't do, because it needs vector math (cosine similarity), not exact text matching.

---

## 5. Workflow #2 — Answering a Question (the actual "R-A-G" moment)

Triggered by `POST /api/v1/chat/{chat_id}/completions`.

```
User types a question in the chat UI
        │
        ▼
[chat.py] chat_completion() → ChatService.process_query()
        │
        ▼
[services/chat.py] process_query()
  1. Saves the user's message to Postgres (role=USER)
  2. Calls generator.generate_answer(query)   ← this is the RAG core
  3. Saves the AI's answer (role=AI)
  4. Saves each retrieved chunk as a Citation row, linked to the AI message
     (so the UI can show "this answer came from invoice.pdf, page X, score Y")
        │
        ▼
[rag/generator.py] generate_answer(query)
  ┌─── RETRIEVAL ───────────────────────────────────────────┐
  │ [rag/retriever.py] get_relevant_chunks(query, top_k=5)   │
  │   1. embedder.embed_query(query)                         │
  │      → Gemini embeds the QUESTION with task_type=        │
  │        RETRIEVAL_QUERY (a different mode than documents, │
  │        tuned so query vectors and document vectors       │
  │        align well in the same vector space)               │
  │   2. qdrant_db.search(query_vector, limit=5)              │
  │      → Qdrant returns the 5 chunks whose vectors are      │
  │        closest (cosine similarity) to the query vector    │
  │   3. Returns list of {score, document_id, chunk_id,       │
  │      text_content, filename, page_number}                 │
  └────────────────────────────────────────────────────────┘
        │
        ▼
  ┌─── AUGMENTATION ────────────────────────────────────────┐
  │ Builds a context string like:                             │
  │                                                            │
  │  --- Context 1 (Source: policy.pdf) ---                   │
  │  <chunk text>                                              │
  │  --- Context 2 (Source: handbook.docx) ---                 │
  │  <chunk text>                                              │
  │  ...                                                        │
  │                                                            │
  │ Then wraps it with a system prompt that instructs the LLM: │
  │  "Answer using ONLY the provided context. If the context   │
  │   doesn't contain the answer, say you couldn't find it.    │
  │   Always cite the filename."                                │
  └────────────────────────────────────────────────────────┘
        │
        ▼
  ┌─── GENERATION ──────────────────────────────────────────┐
  │ _generate_with_fallback(prompt)                            │
  │   Tries models in order: gemini-3.1-flash-lite →           │
  │   gemini-2.0-flash → gemini-1.5-flash                       │
  │   • temperature=0 (deterministic, factual — good for RAG)  │
  │   • @retry decorator (tenacity): on 429/RESOURCE_EXHAUSTED, │
  │     exponential backoff, up to 4 attempts, before falling  │
  │     through to the next model in the list                  │
  └────────────────────────────────────────────────────────┘
        │
        ▼
  Returns {"answer": "...", "citations": [chunks used]}
```

This retrieve → augment → generate sequence **is** RAG. The key insight: the LLM never "knows" about your documents in its weights — every single answer is grounded by whatever gets pulled from Qdrant *at query time*.

---

## 6. Data Model Relationships

```
User ──< Document ──< DocumentChunk        (1 user has many docs, each doc has many chunks)
User ──< Chat ──< Message ──< Citation >── Document
                    (a Message can have many Citations,
                     each Citation points back to the source Document)
```

- **`Document.status`**: `processing → ready` (or `failed`, retryable)
- **`Citation.score`**: the cosine-similarity score from Qdrant — lets the frontend show "how confident" a citation is
- Deleting a document cascades: chunks (via ORM `cascade="all, delete-orphan"`), citations (manually deleted first to avoid FK errors), the Qdrant vectors (best-effort filter-delete by `document_id`), and the physical file on disk

---

## 7. Auth Flow (supporting infrastructure)

- `POST /auth/register` → hashes password with **bcrypt** (10 rounds, run in a thread pool via `run_in_executor` so it never blocks FastAPI's event loop)
- `POST /auth/login` → verifies password, issues a **JWT** (HS256, 8-day expiry) containing `{"sub": user_id}`
- Every protected endpoint uses `Depends(get_current_user)`, which decodes the JWT and loads the `User` row
- `documents.py` has a second variant, `get_current_user_from_header_or_query`, because file **downloads** need to work with a token in the URL query string (browsers can't attach `Authorization` headers to a plain link click)

---

## 8. Frontend Structure (Expo/React Native)

```
frontend/
├── app/                              ← Expo Router: file path = route
│   ├── (auth)/login.tsx, register.tsx → Auth screens (outside tab navigation)
│   ├── (tabs)/index.tsx               → Home tab
│   ├── (tabs)/chat/[id].tsx, index.tsx → Chat list + conversation screen
│   ├── (tabs)/documents/index.tsx     → Document list + upload screen
│   ├── (tabs)/profile.tsx             → User profile
│   ├── EnterpriseAILandingScreen.tsx  → Main landing page UI component
│   └── landing.tsx                    → Public route pointing to landing page
├── components/                       → Reusable UI & guard components (AuthGuard, etc.)
├── services/                         → API interaction clients using Axios
│   ├── api.ts                         → Axios instance, base URL, auth header injection
│   ├── auth.ts                        → login/register calls
│   ├── chat.ts                        → getChats, createChat, getMessages, sendMessage
│   └── document.ts                    → getDocuments, uploadDocument, delete, retry, open
├── store/                            → Redux Toolkit auth state management
├── utils/
│   ├── cn.ts                          → Tailwind class merger utility
│   ├── polyfills.js                   → Critical Hermes runtime environment polyfills
│   ├── polyfills.ts                   → Polyfill helper
│   └── storage.ts                     → LocalStorage abstraction
├── index.js                          → Global React Native entry point (imports polyfills)
├── app.json                          → App configuration, package identifiers, EAS settings
└── eas.json                          → EAS build & submit pipeline definitions
```

The frontend is a thin client: it uploads files, polls/displays document status, and renders chat messages with their citations — all the RAG logic lives entirely in the backend.

---

## 9. End-to-End Example

1. You upload `employee-handbook.pdf` → backend parses it into ~40 chunks → embeds each → stores vectors in Qdrant, text in Postgres. Status flips to `READY`.
2. You ask in chat: *"How many vacation days do new hires get?"*
3. Backend embeds your question → Qdrant returns the 5 chunks most similar to it (likely the PTO policy section) → those get stitched into a prompt with strict "only use this context" instructions → Gemini generates an answer → the answer + citation to `employee-handbook.pdf` (with a similarity score) is saved and returned.
4. If Qdrant returns nothing relevant (e.g., no documents uploaded, or an off-topic question), the LLM is instructed to say it couldn't find the answer instead of guessing.

---

## 10. Notable Engineering Details Worth Knowing

- **Stable v1 API forcing**: The code explicitly forces `api_version: "v1"` for the Gemini client because `text-embedding-004`/`gemini-embedding-001` aren't exposed on the default `v1beta` endpoint that newer `langchain-google-genai` versions default to.
- **Model fallback chain**: If your primary Gemini model hits its free-tier quota, the app automatically retries with a cheaper/older model rather than failing the whole request.
- **Background-task DB session bug (fixed)**: A comment in `services/document.py` documents a real bug that was fixed — background tasks must open their own DB session since the request-scoped one is already closed by the time they run.
- **Vector size mismatch handling**: `qdrant_client.py` checks if an existing collection's vector size doesn't match 3072 (e.g., if you switch embedding models) and auto-recreates the collection.
- **Graceful degradation without an API key**: If `GEMINI_API_KEY` isn't set, the app still lets you upload/chunk/store documents — it just skips embedding and returns a clear placeholder message instead of crashing.
- **Strict User-Level Data Isolation**: Enforces tenant/user partitioning at the storage layer. Every vector point in Qdrant is tagged with uploader's `user_id` payload. Vector search queries, retrieval steps, and document/vector deletion requests strictly filter by the authenticated user's ID. PostgreSQL schema queries similarly restrict records by `user_id`.
- **Automatic Vector Backfilling**: During server start up, a non-blocking background re-indexing task runs to verify and backfill existing ready database documents with the proper `user_id` payload in Qdrant, handling Gemini API rate limits with exponential backoffs.
- **Expo Go / Metro Polyfill Header Injection**: Solves Hermes engine compatibility limitations (missing standard browser interfaces like `DOMException`, `PerformanceEntry`, `ReactNativeStartupTiming`, `AbortController`, `TextEncoder`, etc.) by using Metro's `serializer.getPolyfills` configuration to prepend a comprehensive polyfill header at the absolute top of the native bundle.
- **Zero-Config Mobile Networking Strategy**: Resolves backend host URLs automatically on local mobile platforms. Prioritizes project-root `.env` `EXPO_PUBLIC_API_URL`, falls back to extracting host LAN IPs dynamically from Expo's manifest (`Constants.expoConfig.hostUri`) for physical devices in Expo Go, and falls back to `10.0.2.2` for the Android emulator.
- **API Health & Error Classification**: Implemented startup health checking via `/api/v1/health` with a custom Axios interceptor class to map network, timeout, auth, or server failures into descriptive, user-friendly notices.
- **Postgres Citations Cascade Delete Workaround**: Citations are manually deleted prior to deleting a document since SQL constraints would otherwise raise a `ForeignKeyViolationError` (due to missing cascade rule on SQLAlchemy relationship mappings).
- **Expo EAS Configuration**: App has build/submit configuration for EAS pipelines, including Android package metadata in `app.json` and build profiles in `eas.json`.

---

## 11. Glossary (RAG terms used in this project)

| Term | Meaning here |
|---|---|
| **Embedding** | A vector (3072 numbers) representing the *meaning* of a piece of text |
| **Chunk** | A ~1000-character slice of a document, small enough to embed meaningfully, with 100-char overlap to preserve context at boundaries |
| **Vector DB (Qdrant)** | Database indexed for fast "nearest neighbor" search over embeddings |
| **Cosine similarity / score** | How close two vectors point in the same direction — the metric used to rank retrieved chunks |
| **top_k** | Number of chunks retrieved per query (currently 5) |
| **Grounding** | Forcing the LLM to answer only from retrieved context, reducing hallucination |
| **Citation** | A record tying an AI answer back to the specific document/chunk/score it came from |
