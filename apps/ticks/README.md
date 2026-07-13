# AI Learning Workspace — Frontend

Electron + React + TypeScript + Vite desktop app. See the root
[README](../README.md) for how this fits with the backend.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build:win    # Windows
pnpm build:mac    # macOS
pnpm build:linux  # Linux
```

## Renderer source layout

`src/renderer/src/` is organized feature-first. Each feature owns its own
components, hooks, and API calls; cross-feature UI lives in `components/`.

```
src/renderer/src/
  components/
    layout/     # AppShell, Sidebar — app-wide chrome, not feature-specific
    ui/         # shadcn/ui primitives, added as features need them
  features/
    editor/
    notes/
    workspaces/
    resources/
    search/
    settings/
    ai/
    drawings/
  lib/          # utils, shared helpers (e.g. cn())
```

Feature folders are created as each feature lands rather than scaffolded
empty ahead of time.
