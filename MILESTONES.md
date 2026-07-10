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
10. **Search** — scoped to the currently open workspace (not global across
    workspaces, matching how workspaces already behave as separate
    contexts). Builds on Milestone 9's substring search rather than adding
    a new UI surface (a dedicated overlay is closer to Milestone 11's
    command-palette territory):
    - Backend: `GET /workspaces/{id}/notes` (both the plain list and `?q=`
      search) now returns a content snippet per note — centered on the
      matched text for a content hit, otherwise the start of the note —
      and accepts `favorite_only=true` to filter to favorited notes,
      composable with `q`.
    - Frontend: `NoteList` shows the snippet under each note's title, has a
      favorites-only toggle (star button next to the search input), and
      highlights the matched substring in both title and snippet via a
      `highlightMatch` helper.
    - Verified against the real app: created three notes with distinct
      content, favorited one, confirmed the snippet preview renders for
      all three, searched a content-only term (narrows correctly),
      toggled favorites-only (narrows correctly), and confirmed the match
      highlight renders on a hit.
    - Tags and folders (also named in the search milestone's description)
      don't exist as note properties yet — both are Milestone 11 concepts
      (sidebar: folders/tags/favorites/recent/pinned). Search is built to
      extend to them once that data exists rather than adding unused
      fields now.
11. **Command palette, tabs, and the rest of the sidebar.** The full
    original scope landed in one pass:
    - **Data model**: notes gained `folder` (a "/"-separated path,
      organizational only — doesn't move the `.md` file on disk), `tags`,
      and a soft-delete `trashed`/`trashed_at` pair. `opened_at` is bumped
      every time a note is fetched for editing, powering Recent.
      `DELETE /notes/{id}` is now a soft delete (moves to Trash); a new
      `DELETE /notes/{id}/permanent` does the real removal, with
      `POST /notes/{id}/restore` to undo. New endpoints:
      `GET /notes/recent`, `GET /notes/trash`, `PATCH /notes/{id}/folder`,
      `PATCH /notes/{id}/tags`, `GET /folders`, `GET /tags`; `list`/`search`
      gained a `pinned_only` filter alongside the existing `favorite_only`.
    - **Tabs**: `App.tsx` now owns `openTabs`/`activeTabId` instead of a
      single open note. A new `TabBar` supports switching, closing via the
      `×` button, middle-click close (`onAuxClick`, button 1), and
      drag-to-reorder (native HTML5 DnD — the handlers only track index
      state, not `dataTransfer` payloads). Only the active tab's editor is
      mounted, so the "unsaved" dot only reflects the active tab's live
      save status (see follow-up).
    - **Sidebar rework**: `WorkspaceList` and workspace selection moved up
      into `App.tsx` (via a lifted `useWorkspaces()` call) so the command
      palette can search/switch workspaces from outside the sidebar.
      `NoteList` gained a view switcher (All/Favorites/Pinned/Recent/Trash)
      and folder/tag filter dropdowns; Trash view swaps the normal
      favorite/delete row actions for Restore/permanently-delete.
    - **Organize panel**: a note-header toggle (`Tag` icon) for setting a
      note's folder and comma-separated tags.
    - **Command palette**: `Ctrl+Shift+P` opens an overlay that substring-
      matches (not true fuzzy matching — no new dependency for that, same
      approach the rest of the app already uses) over: switch-workspace
      commands, open-note commands for the active workspace, "New note",
      and "New workspace"; arrow keys + Enter to navigate/execute.
    - Verified against the real app end-to-end: multiple tabs open/switch/
      close (both via `×` and middle-click), the unsaved dot appearing
      while typing and clearing once autosaved, the palette opening via
      the shortcut and reopening a closed note by search, all four
      non-default sidebar views (Favorites/Pinned/Recent/Trash) showing
      the right notes, the Organize panel persisting folder/tags, the
      folder filter narrowing correctly, and trash → restore working.
12. **AI API integration (Mistral).** Full original scope, verified against
    the real Mistral API with a working key (not mocked):
    - **Settings (minimal, ahead of Milestone 13)**: a `settings.json` next
      to the workspaces root stores the Mistral API key and writing-style
      examples — a stand-in for the real Settings UI, since that milestone
      hasn't landed yet. `GET /settings` never echoes the key back (just
      `mistral_api_key_configured: bool`); `.env`'s `MISTRAL_API_KEY` is a
      fallback for local dev, but `settings.json` (set via the UI) wins.
    - **Mistral client** (`ai_service.py`, `httpx`-based, streaming):
      `open_action_stream` opens the connection and confirms a non-error
      status *before* any content streams, so the router can turn a
      missing key / rate limit / 5xx into a real HTTP status (422/429/502)
      instead of an error embedded mid-stream — StreamingResponse can't
      change its status code once the first chunk goes out. Retries with
      backoff on 429/5xx during that connection phase; a genuine mid-stream
      drop has no clean recovery (accepted, documented below).
    - **9 endpoints**: `/ai/summarize`, `/explain`, `/key-points`,
      `/questions`, `/flashcards`, `/checklist`, `/table`,
      `/rewrite` (`mode`: expand/shorten/examples), and `/style` (rewrite
      using the saved style examples, or a generic clarity rewrite if none
      are set) — all stream plain text. Every prompt explicitly instructs
      staying faithful to the source and flagging ambiguity rather than
      inventing, per the plan's accuracy-over-creativity rule.
    - **Resource-processing tie-in**: `process_resource` now also asks the
      AI for a faithful summary of the fetched content (`summary.txt`
      alongside `content.txt`). The AI call is best-effort — if it fails
      (no key configured, rate limited), the resource still completes
      using its raw fetched content; only the bonus summary is skipped.
    - **Frontend**: `lib/api.ts` gained `streamText` (reads the response
      body via `getReader()`, decoding chunks as they arrive — no SSE
      framing needed since both ends are ours). `useAiAction` wraps that
      with cancellation (`AbortController`) and accumulates the streamed
      result. A new `AiPanel` in the note editor runs any action against
      the current CodeMirror selection (or the whole note if nothing's
      selected) and offers Replace selection / Insert below / Copy.
      CodeMirror's selection is surfaced via `MarkdownEditor`'s
      `onUpdate` — typed against a minimal local structural interface
      instead of importing `@codemirror/view` directly, since installing
      it as a direct dependency kept stalling in this sandbox (see
      follow-up).
    - **Settings view**: API key field (write-only, shows a
      configured/not-configured indicator, never displays the stored key),
      style-example list (add/remove), and a live "preview rewrite in my
      style" using the real endpoint.
    - Verified against the real app with a real API key end-to-end:
      summarize on a whole note → Insert below appended the real streamed
      result; select-all → Shorten → Replace selection correctly replaced
      the note's content with the (real, coherent) shortened rewrite;
      Settings showed the configured indicator, added a casual-tone style
      example, and Preview visibly changed tone to match it. Also verified
      live via curl: all 9 endpoints, both 422 paths (empty text, and no
      key configured — temporarily cleared the real key to confirm), and
      the resource-processing summary appearing in a fetched resource's
      `summary.txt`. The 429/502 status-code paths were only checked by
      code review, not by actually exhausting a real rate limit or forcing
      a 5xx from Mistral.
13. **Settings** — complete preferences management (theme, font size, editor
    font, autosave delay, default workspace, default editor mode, custom
    keyboard shortcuts) folded with the previous AI Settings.
    - Backend: schemas and `settings_service` updated with default data. Added
      `PATCH /settings` endpoint to partially update preferences in
      `settings.json` on disk.
    - Frontend: shared settings state via a React Context. Applied theme
      (Light, Dark, Warm Cozy) dynamically at document level and to components
      (CodeMirror and Excalidraw).
    - Preference bindings: editor font/font size linked to CodeMirror,
      autosave delay linked to editor debouncer, default editor mode linked to
      `EditorView`, default workspace selected on launch.
    - Shortcuts recording: custom shortcuts utility to match modifier keys.
      Interactive key listener in Settings UI to record and customize the
      Command Palette trigger.
    - Redesigned Settings UI: premium tabbed layout with visual theme card
      previews, ranges/sliders for size/delay configuration, AI Tone samples
      editor, and keyboard shortcut settings.
14. **UI polish** — premium cozy aesthetic with `framer-motion` transitions
    (sliding sidebar lists, panel expansion in the note editor, command
    palette fade/slide), a warm glowing `EmptyState` with action cards, and
    glassmorphic/rounded surfaces throughout.

    Redone in a follow-up pass into a single cohesive design system rather
    than scattered spot-styling:
    - Fixed invalid `border-neutral-750`/`neutral-850` utilities in
      `EmptyState.tsx` (Tailwind's default neutral scale has no 750/850
      step, so those classes were silently no-ops) and a stray empty
      `mb-` class.
    - Replaced every native `<select>` (note list folder/tag filters,
      Settings' default-workspace picker) with a themed `Select`
      component (`components/ui/Select.tsx`) matching the app's own
      rounded/bordered input style instead of OS-default dropdown chrome.
    - Styled the font-size/autosave-delay range sliders in Settings with
      a custom thumb and an amber gradient fill (`.range-slider` in
      `main.css`) instead of the unstyled browser default.
    - Unified icon-button hover treatment (rounded + `hover:bg-neutral-800`)
      across `NoteEditor`'s toolbar and `NoteDrawingEditor`'s Save/Close,
      which previously had no hover background at all.
    - `TabBar` tabs got rounded top corners, a real active-tab background
      (not just the amber underline), and a hover-reveal close button.
    - Replaced Settings' bare `<table>` shortcuts cheat-sheet with a card
      list matching the rest of Settings' sections.
    - Replaced bare `×` delete buttons (`NoteList`, `WorkspaceList`) with
      a consistent `lucide-react` `X` icon.
    - Settled on amber as the one consistent accent/brand color; emerald/
      red/sky stay reserved for semantic success/danger/info states only.
    - Verified against the real app across all three themes (Dark/Light/
      Warm Cozy): empty state, note editor toolbar, tab bar with multiple
      tabs, both Select dropdowns open, both range sliders, and the
      shortcuts card list all screenshotted and confirmed coherent.

    Second follow-up, root-causing a "sections feel too close together"
    report: `main.css`'s `*, *::before, *::after { margin: 0 }` reset sat
    *outside* any `@layer` block. Per the CSS cascade-layers spec,
    unlayered rules always beat layered rules regardless of specificity —
    and Tailwind v4's utilities (including every `space-y-*`/`mb-*`/`mt-*`
    class) live inside `@layer utilities`. That reset was silently
    nullifying every margin utility in the app (confirmed via
    `getComputedStyle` showing `margin-top: 0px` even with `space-y-12`
    applied), not just in Settings — this is almost certainly why an
    earlier commit's "increase bottom margins in EmptyState" fix never
    visibly helped. Fixed by wrapping the reset in `@layer base { ... }`,
    then bumped Settings' per-tab section spacing from `space-y-8` to
    `space-y-12` now that it actually renders. Verified via
    `getBoundingClientRect()` diffs between sections (0px before the fix,
    48px after) and re-screenshotted Settings and the empty state.

**Follow-up features (not part of the original milestone plan):**
- **Custom window chrome**: macOS keeps its native traffic-light frame
  (`titleBarStyle: 'hiddenInset'`); Windows/Linux now get `frame: false`
  with a renderer-drawn `TitleBar.tsx` (drag region + minimize/maximize/
  restore/close), wired through new `ipcMain` handlers
  (`window:minimize`/`window:toggle-maximize`/`window:close`/
  `window:is-maximized`) and a `windowControls` object on the preload
  `api`. Maximize state is pushed to the renderer via a
  `window:maximized-changed` IPC event so the button icon flips between
  "maximize" and "restore" in sync with the real `BrowserWindow` state
  (also catches OS-level double-click/drag maximize, not just the
  button).
- **Zoom shortcuts**: `Ctrl`/`Cmd` + `=`/`-`/`0` handled entirely in the
  main process via `webContents.on('before-input-event', ...)` — no
  renderer or preload changes needed. Clamped to ±4 zoom levels.
- **Minimal scrollbar**: themed `::-webkit-scrollbar` rules in
  `main.css` using the existing `var(--color-neutral-700)` token, so it
  follows Dark/Light/Warm-Cozy automatically.
- **Mini-tray Toggle (always-on-top mini editor)**: toggled by a global keyboard
  shortcut (default `Ctrl+Alt+Shift+M`) or via settings. Displays only the
  editor for the active note in the main window in a small, 353×743px frameless
  and transparent, always-on-top window positioned at the bottom-right of the
  work area. The active note's identity is synced over IPC via `active-note:changed`.
  Autosaves in sync with the main window, and clicking `Esc` inside the mini window
  or toggling the shortcut again hides it.
- **Bug fix**: with a `default_workspace_id` set, clicking the sidebar's
  back arrow (`onSelectWorkspace(null)`) was immediately overridden back
  into that workspace, because `App.tsx`'s auto-select effect only
  guarded on `!selectedWorkspace` — indistinguishable from "user backed
  out." Fixed with a `useRef` flag so the auto-select only ever fires
  once, on startup.
- Verified against the real app: the back-arrow bug fix (confirmed
  landing on `WorkspaceList` and staying there), maximize/restore via
  the actual button (checked against real `BrowserWindow.isMaximized()`,
  not just DOM state), zoom via `sendInputEvent` (a real native input,
  unlike a synthetic renderer `KeyboardEvent` which never reaches
  `before-input-event`) with before/after `getZoomLevel()` values, and a
  themed scrollbar rendering on a long note's preview pane.
- **Rounded window corners** (Windows/Linux): the frameless `BrowserWindow`
  is now `transparent: true`, with `App.tsx`'s root wrapper carrying
  `rounded-lg overflow-hidden` so the app's own corners — not an opaque
  OS rectangle — define the window's visible shape; `html`/`body`/`#root`
  are set to `background: transparent` in `main.css` so nothing paints
  behind the rounded content. Squared off again while maximized (a new
  shared `useIsMaximized` hook, extracted from `TitleBar.tsx` so both it
  and `App.tsx` react to the same state) since rounded corners flush
  against the screen edges just read as a rendering glitch. Verified by
  inspecting the actual alpha channel of `capturePage()`'s output
  (not just eyeballing a screenshot, since near-black content is hard to
  tell apart from true transparency): alpha 1 at the exact corner pixel,
  238 on the anti-aliased curve, 255 just past the 8px radius and at
  the content center — confirming the corner is a genuine transparent
  hole through to the desktop, not merely dark-colored content.

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
  rendering an empty-scene placeholder, not an actual drawn shape.
  Follow-up bugfix: with a real non-empty drawing, the embed rendered a
  broken image icon in Preview — the CSP's `img-src` directive allowed
  `data:` but not `blob:`, and `DrawingEmbed` sets `<img src>` to a
  `URL.createObjectURL()` blob from `exportToBlob()`. Fixed by adding
  `blob:` to `img-src` in `frontend/src/renderer/index.html`; verified by
  drawing a real rectangle via canvas pointer events (selecting the
  rectangle tool through its `data-testid`, since Excalidraw's tools are
  radio inputs, not buttons), saving it, embedding it in a note, and
  confirming Preview now renders the shape instead of a broken icon.
- The Organize panel (folder/tags) and the sidebar's `NoteList` are
  separate component trees with independent `useNotes` state, same as the
  pre-existing title/favorite/pin sync gap above — setting a note's folder
  or tags via the Organize panel doesn't refresh the sidebar's folder/tag
  filter dropdowns until you navigate back to the workspace list and back
  in. Same root cause, same deferral reasoning (would need lifting note
  state up to `App`).
- Tab drag-to-reorder only carries an in-memory index (the drag handlers
  never read/write `dataTransfer`), so it can't be dragged in from or out
  to anything outside the tab bar — reordering within the bar is the only
  supported interaction, which is all Milestone 11 asked for.
- The tab bar's "unsaved" dot only reflects the *active* tab's live save
  status — only the active tab's `NoteEditor`/`useNoteEditor` is mounted,
  so background tabs have no live save-status to show a dot for. Showing
  per-tab dirty state for inactive tabs would need lifting the debounced-
  save logic out of `NoteEditor` to a shared place; deferred as
  disproportionate to what Milestone 11 asked for.
- The command palette's "New workspace" action creates it but doesn't
  auto-select it (the created workspace shows up in `WorkspaceList` like
  any other) — `useWorkspaces().create` only returns `void` today. Wiring
  it to return the created workspace so the palette can switch to it
  immediately was left as a small follow-up rather than changing that
  hook's shared contract mid-milestone.
- Command palette matching is substring-only (same approach as the rest of
  the app's search), not true fuzzy matching — no fuzzy-match library is
  installed, and adding one for this alone seemed like overkill.
- No dedicated `/ai/process-resource` HTTP endpoint — the "process a
  resource" action from the plan's endpoint list is invoked internally
  by `resource_service.process_resource` (via `ai_service.run_action`)
  rather than exposed over the API, since nothing in the frontend calls
  it directly today; the resource pipeline is the only caller.
- `@codemirror/view` isn't a direct dependency — `pnpm add` for it stalled
  repeatedly in this sandbox (slow/stuck registry fetch for that one
  package, unclear why). Worked around by typing `MarkdownEditor`'s
  `onUpdate` callback against a minimal local structural interface
  (`{ selectionSet, state: { selection, sliceDoc } }`) instead of
  importing `ViewUpdate` — TypeScript's structural typing accepts the real
  object at runtime regardless. Revisit adding the real dependency (and
  its proper types) later if this causes friction.
- Mid-stream Mistral failures (the connection opens fine, then drops or
  errors partway through) have no clean recovery — the partial text
  already sent to the frontend just stops, with no retry or resumption.
  Only the pre-stream connection phase (missing key, rate limit, 5xx) gets
  retries and a proper HTTP error status; documented as an accepted gap
  rather than building stream-resumption logic.
- The AI panel's action buttons are always all enabled regardless of
  whether the input is realistically too long for the model's context — no
  client-side length guard or truncation warning yet.
- Style-example "preview" and the actual "rewrite in my style" action
  share the same backend prompt logic, but there's no limit on how many/
  how long style examples can be — a very large example set would inflate
  every `/ai/style` request's prompt size. Fine at the scale of "a few
  paragraphs," not stress-tested beyond that.

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
