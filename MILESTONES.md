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
   Edit/Split/Preview modes, `Mod-B`/`Mod-I` shortcuts. Now backed by real
   per-workspace note files with autosave (Milestone 9), not the old
   in-memory demo document.
8. **Excalidraw integration** — whiteboard with PNG/SVG/`.excalidraw` export
   and a full-screen toggle. Fonts are served from a local copy (not
   Excalidraw's default esm.sh CDN) to keep the app's no-cloud-dependency
   promise; required resolving `EXCALIDRAW_ASSET_PATH` to an absolute URL via
   `document.baseURI` since packaged `file://` builds can't rely on
   `window.location.origin`.
9. **File storage — notes CRUD + autosave.** Notes are Markdown files under
   each workspace's `notes/` dir, with metadata (title, timestamps,
   favorite, pinned) in a per-workspace `notes.jsonl` — no SQL, no vector DB.
   Backend: full CRUD, favorite/pin flags, duplicate, move between
   workspaces, substring search over title+content, Markdown import/export.
   Frontend: workspace list → note list → note editor navigation wired
   through `AppShell`/`Sidebar`; `NoteEditor` header supports rename,
   favorite, pin, duplicate, delete, and export; `NoteList` supports create,
   search, favorite-toggle, delete, and import. Import/export go through
   real native OS file dialogs (Electron's `dialog.showSaveDialog` /
   `showOpenDialog`), not the backend. Autosave is debounced (800ms) client
   side. Verified against the real app: created/edited/renamed/
   favorited/pinned/duplicated/deleted a note and a workspace end-to-end,
   confirmed autosave's "Saving…" → "Saved" transition and live preview
   update, all through actual UI interaction (not just curl/typecheck).

   **Resources & note-linked drawings** (rest of Milestone 9's original
   scope) landed in a follow-up pass:
   - **Resources**: attach a website/blog/doc/pdf/markdown/file to a note.
     Metadata (`resources.jsonl`, keyed by `note_id`) and content
     (`resources/{id}/`) live per-workspace. URL-based resources go through
     a real `queued` → `reading` → `processing` → `completed`/`failed`
     pipeline: `asyncio.to_thread` + stdlib `urllib` fetches the page,
     strips HTML tags/scripts/styles down to plain text (no new
     dependency), and writes `content.txt` — no AI call yet, since that's
     Milestone 12; this pipeline just prepares raw material for it. Local
     files upload via `multipart/form-data` (added `python-multipart`) and
     are copied in synchronously (`completed` immediately, no fetch
     needed). Frontend: a `ResourcesPanel` toggled from the note header
     polls while any resource is non-terminal, shows status/type/an
     external-open link, and supports delete.
   - **Note-linked drawings**: full CRUD on Excalidraw scenes
     (`drawings.jsonl` metadata + `{id}.excalidraw` scene JSON per
     workspace, mirroring the notes pattern). `NoteDrawingsPanel` creates/
     renames/deletes and opens a `NoteDrawingEditor` (the existing
     `DrawingCanvas` wrapped with load/save wired to the new endpoints
     instead of only file export). "Insert" appends
     `![title](drawing://id)` into the note's Markdown; `MarkdownPreview`
     renders that through a new `DrawingEmbed` component that fetches the
     scene and renders a PNG client-side via Excalidraw's own
     `exportToBlob` — no server-side thumbnail generation needed.
   - Bug caught and fixed during verification: react-markdown's default
     `urlTransform` strips unrecognized URI schemes (XSS hardening), which
     silently blanked `drawing://` src values and rendered as a broken
     image. Fixed with a custom `urlTransform` that passes `drawing://`
     through untouched and defers to `defaultUrlTransform` otherwise.
   - Verified against the real app: attached a URL resource and watched it
     reach `completed` with a real fetched-and-stripped page, created a
     drawing, saved and reopened it, inserted an embed and confirmed it
     renders (as an empty-scene placeholder, since the test couldn't
     reliably script real Excalidraw canvas strokes — see follow-up
     below), then deleted everything back to a clean state.

   Milestone 9 is now fully done — all of the original plan's scope for
   this milestone has landed.

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
- `NoteList` (sidebar) doesn't live-refresh when a note's title/favorite/pin
  changes via the open note's editor header — it only picks up the change
  once you navigate back to the workspace list and reopen it. Cross-syncing
  would need lifting note-list state up to `App`/`AppShell` instead of each
  owning its own `useNotes`/`useNoteEditor` state; deferred as
  disproportionate to Milestone 9's scope.
- Moving a note between workspaces is implemented and tested on the backend
  (`POST /workspaces/{id}/notes/{note_id}/move`) but has no frontend UI yet
  — it needs a workspace-picker component that doesn't exist.
- Resource processing for `doc`/`pdf` local uploads doesn't extract text —
  the file is copied in and marked `completed` immediately with no content
  to search/summarize yet. Adding real extraction (e.g. `pypdf`) was
  deferred rather than adding a dependency ahead of Milestone 12 actually
  needing the extracted text for AI calls.
- `ResourcesPanel`'s status polling runs on a plain `setInterval` while any
  resource is non-terminal — fine at today's scale (one note's resources,
  a handful of items) but not designed to survive many notes polling at
  once; revisit if Milestone 15 (performance) finds it relevant.
- Drawing embeds show a static PNG snapshot (regenerated client-side from
  the saved scene on each preview render), not a live-editable canvas
  inline — clicking the embed's edit button opens the full `NoteDrawingEditor`
  instead. This mirrors how Obsidian's Excalidraw plugin embeds work and
  was a deliberate scope choice, not a shortcut forced by a blocker.
- The Milestone 9 UI verification couldn't script real Excalidraw canvas
  strokes (dispatching synthetic `keydown`/`PointerEvent`s didn't select
  the rectangle tool or register a drag), so the embed was only verified
  rendering an empty-scene placeholder, not an actual drawn shape. The
  underlying `exportToBlob` path is the same one Milestone 8 already
  verified visually, so this is a test-automation gap, not an unverified
  code path — but a real non-empty drawing embed hasn't been eyeballed.

## Remaining

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
