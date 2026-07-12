import { ChildProcess, spawn } from 'child_process'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import fs from 'fs'
import os from 'os'

const HOST = '127.0.0.1'
const PORT = 8000
const LOG_DIR = join(os.homedir(), 'AILearningWorkspace')
const LOG_FILE = join(LOG_DIR, 'backend.log')

let backendProcess: ChildProcess | null = null

export function getApiBaseUrl(): string {
  return `http://${HOST}:${PORT}`
}

// Dev and Packaged: spawns the backend from its local or packaged folder
export function startBackend(): void {
  const backendDir = is.dev
    ? join(__dirname, '../../../backend')
    : join(process.resourcesPath, 'backend')

  // Ensure log directory exists
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  } catch (e) {
    // Ignore
  }

  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'w' })
  logStream.write(`[main] Starting backend. is.dev=${is.dev}\n`)
  logStream.write(`[main] process.execPath: ${process.execPath}\n`)
  logStream.write(`[main] backendDir: ${backendDir}\n`)

  if (is.dev) {
    backendProcess = spawn('pnpm', ['run', 'dev'], {
      cwd: backendDir,
      shell: true,
      env: { ...process.env, HOST, PORT: String(PORT) }
    })
  } else {
    const scriptPath = join(backendDir, 'dist', 'index.js')
    if (!fs.existsSync(scriptPath)) {
      logStream.write(`[error] Packaged backend script not found at: ${scriptPath}\n`)
      logStream.write(`[error] Please run "pnpm run build" in the backend directory before packaging the app.\n`)
      logStream.end()
      return
    }

    // In production / packaged, spawn the compiled CJS bundle using Electron's node engine.
    backendProcess = spawn(process.execPath, [scriptPath], {
      cwd: process.resourcesPath,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        HOST,
        PORT: String(PORT)
      }
    })
  }

  backendProcess.stdout?.on('data', (data) => {
    const text = data.toString()
    console.log(`[backend] ${text.trim()}`)
    logStream.write(`[stdout] ${text}`)
  })

  backendProcess.stderr?.on('data', (data) => {
    const text = data.toString()
    console.error(`[backend] ${text.trim()}`)
    logStream.write(`[stderr] ${text}`)
  })

  backendProcess.on('error', (error) => {
    console.error('[backend] Failed to start:', error)
    logStream.write(`[error] Failed to start backend process: ${error.message}\n`)
  })

  backendProcess.on('exit', (code, signal) => {
    logStream.write(`[exit] Process exited with code ${code}, signal ${signal}\n`)
    logStream.end()
  })
}

export function stopBackend(): void {
  backendProcess?.kill()
  backendProcess = null
}

