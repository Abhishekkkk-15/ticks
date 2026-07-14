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

Whether you are breaking down technical documentation, summarizing PDFs, mapping out system architectures with integrated drawings, or syncing your knowledge base via Git, Ticks has you covered.

## 🚀 Key Features

- 🧠 **AI-Powered Workflows**: Select any text to instantly generate summaries, explain complex topics, or capture ideas. Ticks acts as a tireless pair-learner.
- 🔌 **Model Context Protocol (MCP)**: Run and interact with powerful local MCP servers directly inside the app, bridging external tools and APIs seamlessly.
- ☁️ **Seamless Git Sync**: Say goodbye to merge conflicts. Ticks natively integrates with GitHub. Pull, push, and sync your entire workspace with a single click while gracefully handling unrelated histories and auth errors.
- 🎨 **Integrated Whiteboard (Excalidraw)**: Draw complex diagrams, mind maps, and sketches natively. Your drawings are perfectly embedded directly into your Markdown notes.
- 📄 **Beautiful Exports**: Export your notes instantly to **Markdown**, **HTML**, or **PDF**. Ticks automatically resolves your Excalidraw vectors and local images into flawless, self-contained documents with beautiful dark/light mode print stylesheets.
- ⚡ **Global Quick Capture**: Hit a hotkey (`Ctrl+Alt+Shift+C`) anywhere on your OS to capture text and append it straight to your notes without breaking focus.
- 🎯 **Zen Focus Mode**: Press `F11` or toggle the focus button to melt away sidebars and toolbars, leaving you with a distraction-free, cinematic writing experience.
- 🔒 **True Local-First**: Your data is yours. Everything lives on your local file system, ensuring total privacy and lightning-fast performance.
- ✨ **Rich Interactive Previews**: Complete task lists (`- [ ]`), click local resource links, and view your rendered markdown in real-time.

## 🏗️ Architecture & Tech Stack

Ticks is engineered for scale and speed, utilizing a modern monorepo architecture managed by [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/).

- **`apps/ticks/`**: The core desktop application built with **Electron**, **React**, **TypeScript**, and **Vite**. UI is beautifully styled with **Tailwind CSS** and smoothly animated using **Framer Motion**.
- **`apps/api/`**: A lightweight, fast **Node.js Express** service running locally alongside the app. It manages AI processing, file-system operations, Excalidraw resource streaming, and MCP bridging.
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
*This command uses Turbo to instantly spin up the Node.js API server and launch the Electron application concurrently.*

### Building for Production

Ready to package the app for your OS?

```bash
pnpm build
```
*This bundles the app and creates a production-ready executable (like an `.exe` for Windows or `.dmg` for Mac) using `electron-builder`.*

---

<div align="center">
  <i>Built with ❤️ for learners and hackers.</i>
</div>
