# Milestones

Tracks progress against the project plan's incremental build order. Each
milestone should stay runnable, typecheck/lint clean, and verified against
the real app (not just unit-level checks) before moving on.

## Done

1. **Project initialization** — repo structure, Electron+React+TS+Vite
   frontend, FastAPI backend skeleton, tooling (pnpm, ruff).
2. **Electron setup** — sandboxed renderer, single-instance lock, real app
   identity (`ai-learning-workspace` / `com.ailearningworkspace.app`).
3. **React frontend** — feature-first folder convention, `AppShell` +
   `Sidebar` layout skeleton.
4. **FastAPI backend** — `pydantic-settings` config, CORS, global exception
   handler, logging, ruff tooling.
5. **IPC and API communication** — Electron main process spawns the backend
   (dev-mode only; packaged builds still need a bundled interpreter, see
   Milestone 16), exposes its base URL to the renderer via IPC, renderer has
   an `apiFetch` client and a live backend-connection indicator.
6. **Workspace management** — full CRUD (`/workspaces`), each workspace gets
   a stable slug id and an on-disk skeleton (`notes/`, `drawings/`,
   `resources/`, `assets/images/`, `config.json`); `workspace_id` validated
   against path traversal. `features/workspaces/` in the frontend.
7. **Markdown editor** — CodeMirror 6 source pane + `react-markdown` preview,
   Edit/Split/Preview modes, `Mod-B`/`Mod-I` shortcuts. Currently wired to an
   **in-memory demo document only** — not yet backed by real note files
   (that's Milestone 9).
8. **Excalidraw integration** — whiteboard with PNG/SVG/`.excalidraw` export
   and a full-screen toggle. Fonts are served from a local copy (not
   Excalidraw's default esm.sh CDN) to keep the app's no-cloud-dependency
   promise; required resolving `EXCALIDRAW_ASSET_PATH` to an absolute URL via
   `document.baseURI` since packaged `file://` builds can't rely on
   `window.location.origin`.

### Known follow-ups from completed milestones (not yet fixed)

- `useWorkspaces` has no retry on its initial fetch — if the backend is
  still booting when the UI mounts, the workspace list shows a permanent
  "Failed to fetch" with no recovery.
- Bundle size: CodeMirror's `language-data` + `highlight.js`, and
  Excalidraw's optional mermaid/katex chunks, add several MB. They're lazy
  chunks, not all eagerly loaded, but worth trimming — see Milestone 15.
- shadcn/ui was never fully initialized (no `components.json` or CSS
  variable theming) — Tailwind + `@tailwindcss/typography` were used
  directly instead, deferring shadcn's setup to whenever the theme work in
  Milestone 14 happens for real, to avoid guessing at theme tokens twice.

## Remaining

### 9. File storage

- Wire the editor to **real** per-workspace note files instead of the demo
  doc: create / rename / delete / move / duplicate / search / favorite /
  pin / export / import, with autosave.
- Notes as Markdown files, metadata as JSONL (per the storage philosophy —
  no SQL, no vector DB).
- Resources: attach learning resources (website, blog, doc, PDF, markdown,
  local file) to a note, with source/title/URL-or-file/date-added metadata
  and a processing status (`queued` → `reading` → `processing` →
  `completed`/`failed`). Backend does the processing; frontend only
  uploads and displays status.
- Save/load `.excalidraw` files linked to a note, and embed a drawing
  inside a note.

### 10. Search

- Fast local search across titles, content, tags, folders, recent notes,
  favorites. Explicitly **no vector search**.

### 11. Command palette

- `Ctrl+Shift+P`, VS Code-style, everything reachable through it.
- Rest of the sidebar: folders, tags, favorites, recent, trash, pinned.
- Optional nested folder structure within a workspace (e.g.
  `System Design/networking_notes`, `database_notes`) — user-optional.
- Tabs: multiple open notes, middle-click to close, unsaved indicator, drag
  to reorder — VS Code-like.

### 12. AI API integration

- **Mistral AI only** — no multi-provider abstraction. Backend calls the
  Mistral API exclusively; API key configurable in Settings, stored
  locally, never hardcoded, never touched directly by the renderer.
- Endpoints: `/ai/summarize`, `/ai/explain`, `/ai/rewrite`, `/ai/questions`,
  `/ai/flashcards`, `/ai/key-points`, `/ai/checklist`, `/ai/table`,
  `/ai/style`, `/ai/process-resource`.
- Backend owns: calling Mistral, prompt engineering, conversation/context
  management, error handling + retries, streaming, rate-limit handling,
  and (later) structured outputs.
- Selected-text AI actions in the UI: summarize, explain simply, rewrite in
  my style, extract key points, generate quiz questions, generate
  flashcards, generate examples, expand, shorten, convert to
  checklist/table.
- Writing-style personalization: AI learns the user's note-writing style
  from examples. Frontend needs settings + a preview; backend
  implementation is explicitly allowed to lag behind the UI here.
- AI must prioritize accuracy over creativity when processing resources —
  stay faithful to source material, avoid hallucination, flag uncertainty.

### 13. Settings

- Theme, font size, editor font, autosave, default workspace, AI provider,
  API keys, keyboard shortcuts, markdown preferences.

### 14. UI polish

- The "premium cozy" aesthetic described in the plan: warm dark theme,
  rounded corners, soft shadows, smooth (Framer Motion) animations, glass
  effects where appropriate, readable typography, excellent spacing,
  beautiful empty states, modern icons.
- Inspiration only, not imitation: Obsidian, Linear, Raycast, Arc Browser,
  Notion Calendar, Zed Editor — needs its own identity.
- Likely the right time to properly initialize shadcn/ui (component
  primitives + CSS variable theme) rather than continuing with hand-rolled
  Tailwind utility classes.

### 15. Performance optimization

- Instant startup, lazy loading, minimal memory usage, no unnecessary
  rerenders, virtualized long lists, autosave that doesn't freeze the UI.
- Concrete known targets: trim/lazy-load CodeMirror's `language-data` and
  `highlight.js`; check whether Excalidraw's mermaid/katex chunks can be
  excluded or deferred further.

### 16. Packaging for Windows, Linux, and macOS

- Bundle the Python backend for real (currently spawned from a dev
  `.venv` — production needs a bundled interpreter, e.g. PyInstaller, or
  another self-contained approach).
- Linux `.deb` packaging wants a real `author`/`maintainer` field in
  `package.json` (left unset deliberately in Milestone 2 rather than
  inventing one).
- Real app icons (current ones are the electron-vite scaffold defaults).
- Decide on code signing / auto-update (`electron-builder`'s publish
  config was stripped in Milestone 2 since nothing used it yet).
- Verify actual builds on each target platform.

## Explicitly out of scope for now

Per the plan, these are future-ready considerations only — the
architecture should not block them later, but none should be implemented
as part of the milestones above: OCR, semantic search, cloud sync, git
sync, plugins, extensions, voice notes, video transcription, handwriting
recognition.
