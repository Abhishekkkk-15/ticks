# AI Learning Workspace

A local-first desktop app for learning from docs, blogs, PDFs, and technical
articles — capture fast, let AI turn it into notes, edit, and organize.

## Structure

- `frontend/` — Electron + React + TypeScript + Vite desktop app (UI: Tailwind CSS, shadcn/ui, Framer Motion)
- `backend/` — FastAPI service exposing AI and resource-processing endpoints

## Status

Milestones 1–8 complete (project init through Excalidraw integration). See
[MILESTONES.md](MILESTONES.md) for what's done, known follow-ups, and the
remaining milestones.

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
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env  # optional, defaults work as-is
uvicorn app.main:app --reload
```

Health check: `GET http://127.0.0.1:8000/health`
Interactive docs: `http://127.0.0.1:8000/docs`

Lint/format: `ruff check .` / `ruff format .`
