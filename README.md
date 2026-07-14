# Ticks - AI Learning Workspace

A local-first desktop app for learning from docs, blogs, PDFs, and technical articles — capture fast, let AI turn it into notes, edit, and organize.

## Features

- **Local-first Architecture**: Your data stays local with seamless file system integration.
- **AI-Powered Notes**: Generate summaries, explain topics, and capture ideas quickly.
- **Focus Mode**: Press `F11` or use the toggle button to hide sidebars and toolbars for a distraction-free writing experience.
- **Interactive Previews**: Check off task lists (`- [ ]`) directly from the Markdown preview panel.
- **Integrated Whiteboard**: Draw and embed Excalidraw diagrams straight into your notes.
- **Global Quick Capture**: Capture text from anywhere on your system and append it to your notes.

## Architecture

This project is a monorepo managed by [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/).

- `apps/ticks/` — Electron + React + TypeScript + Vite desktop app (UI: Tailwind CSS, Framer Motion)
- `apps/api/` — Node.js Express service exposing AI and resource-processing endpoints (integrates with the Model Context Protocol SDK)
- `packages/types/` — Shared TypeScript types used across both the frontend and backend.

## Usage & Development

Since this is a Turborepo workspace, you can easily start both the frontend and backend concurrently from the root directory.

```bash
# 1. Install dependencies at the root
pnpm install

# 2. Start the development servers
pnpm dev
```

This will automatically start the Node.js API server and launch the Electron application.

To build the application for production, run:
```bash
pnpm build
```
