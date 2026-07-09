# AI Learning Workspace

A local-first desktop app for learning from docs, blogs, PDFs, and technical
articles — capture fast, let AI turn it into notes, edit, and organize.

## Structure

- `frontend/` — Electron + React + TypeScript + Vite desktop app (UI: Tailwind CSS, shadcn/ui, Framer Motion)
- `backend/` — FastAPI service exposing AI and resource-processing endpoints

## Status

Milestone 1 (project initialization) complete: both apps scaffold, typecheck,
build, and run. No features implemented yet.

## Running the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## Running the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Health check: `GET http://127.0.0.1:8000/health`
Interactive docs: `http://127.0.0.1:8000/docs`
