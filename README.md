<div align="center">
  <img src="apps/ticks/resources/icon.png" width="128" alt="Ticks Logo" />
  <h1>Ticks - AI Learning Workspace</h1>
  <p><strong>A local-first, AI-powered desktop app for learning, note-taking, and knowledge management.</strong></p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## 🌟 Overview

**Ticks** is a modern, high-performance desktop application designed for power users who want to learn faster and organize better. It bridges the gap between a robust local-first Markdown editor and advanced AI-driven workflows. 

Whether you are breaking down technical documentation, summarizing PDFs, mapping out system architectures with integrated drawings, or syncing your knowledge base across devices, Ticks has you covered.

## 🚀 Key Features

- 🧠 **AI-Powered Workflows**: Select any text to instantly generate summaries, explain complex topics, or capture ideas. Ticks acts as a tireless pair-learner.
- 🔌 **Model Context Protocol (MCP)**: Run and interact with powerful local MCP servers directly inside the app, bridging external tools and APIs seamlessly. Provide your AI assistants with tools to manage your notes and workspaces.
- ☁️ **Dropbox & Git Sync**: Say goodbye to merge conflicts and lost files. Ticks natively integrates with both **GitHub** and **Dropbox** for lightning-fast, 2-way syncing of your entire workspace across all your devices.
- 🎨 **Integrated Whiteboard (Excalidraw)**: Draw complex diagrams, mind maps, and sketches natively. Your drawings are perfectly embedded directly into your Markdown notes.
- 📄 **Beautiful Exports**: Export your notes instantly to **Markdown**, **HTML**, or **PDF**. Ticks automatically resolves your Excalidraw vectors and local images into flawless, self-contained documents with beautiful dark/light mode print stylesheets.
- ⚡ **Global Quick Capture & Mini Tray**: Hit a hotkey (`Ctrl+Alt+Shift+C`) anywhere on your OS to capture text and append it straight to your notes without breaking focus. Use the Mini Tray (`Ctrl+Alt+Shift+M`) for quick access.
- 🎯 **Zen Focus Mode**: Press `F11` or toggle the focus button to melt away sidebars and toolbars, leaving you with a distraction-free, cinematic writing experience.
- 🔒 **True Local-First**: Your data is yours. Everything lives on your local file system as plain Markdown and JSON, ensuring total privacy and lightning-fast performance.
- ✨ **Rich Interactive Previews**: Complete task lists (`- [ ]`), click local resource links, highlight text, and view your rendered markdown in real-time. Full support for GitHub Flavored Markdown and HTML.

## 🏗️ Architecture & Tech Stack

Ticks is engineered for scale and speed, utilizing a modern monorepo architecture managed by [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/).

- **`apps/ticks/`** (Desktop App): The core desktop application built with **Electron**, **React**, **TypeScript**, and **Vite**. UI is beautifully styled with **Tailwind CSS** and smoothly animated using **Framer Motion**. Features a custom frameless window for native OS integration.
- **`apps/api/`** (Backend Service): A lightweight, fast **Node.js Express** service running locally alongside the app. It manages AI processing, file-system operations, Excalidraw resource streaming, Dropbox syncing, and MCP bridging.
- **`apps/web/`** (Landing Page): A modern **React** + **Vite** web application showcasing Ticks features and providing documentation.
- **`packages/types/`**: A tightly coupled shared library containing strict TypeScript definitions to ensure type-safety across both the frontend and backend.

## 💻 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v9+)
- Git

### Installation & Development

Since Ticks is a Turborepo workspace, starting the entire stack is incredibly simple.

```bash
# 1. Clone the repository
git clone https://github.com/Abhishekkkk-15/ticks.git
cd ticks

# 2. Install dependencies at the root
pnpm install

# 3. Start the development servers
pnpm dev
```
*This command uses Turbo to instantly spin up the Node.js API server, launch the Electron application, and start the Web dev server concurrently.*

### Building for Production

Ready to package the app for your OS?

```bash
pnpm build
```
*This bundles the app and creates a production-ready executable (like an `.exe` for Windows or `.dmg` for Mac) using `electron-builder`.*

