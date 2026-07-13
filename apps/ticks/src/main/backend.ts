import { ChildProcess, spawn, execSync } from 'child_process'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import fs from 'fs'
import os from 'os'
import net from 'net'

const HOST = '127.0.0.1'
const PORT = 8000
const LOG_DIR = join(os.homedir(), 'AILearningWorkspace')
const LOG_FILE = join(LOG_DIR, 'backend.log')

let backendProcess: ChildProcess | null = null

export function getApiBaseUrl(): string {
  return `http://${HOST}:${PORT}`
}

/**
 * Check whether a port is already in use.
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => {
      server.close()
      resolve(false)
    })
    server.listen(port, HOST)
  })
}

/**
 * Best-effort kill of whatever process is holding the port.
 * Works on Linux/macOS via `fuser` and on Windows via `netstat`+`taskkill`.
 */
function freePort(port: number): void {
  try {
    if (process.platform === 'win32') {
      // Find PID listening on the port then kill it
      const result = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      )
      const match = result.trim().split(/\s+/).pop()
      if (match && /^\d+$/.test(match)) {
        execSync(`taskkill /PID ${match} /F`, { stdio: 'ignore' })
      }
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' })
    }
  } catch {
    // No process was using the port, or the tool isn't available — ignore
  }
}

/**
 * Kill backendProcess and its entire child process group so the Node server
 * inside the pnpm shell wrapper is also terminated.
 */
function killBackendGroup(): void {
  if (!backendProcess || backendProcess.exitCode !== null) return
  try {
    if (process.platform === 'win32') {
      // On Windows, spawn doesn't support process groups — just kill directly
      backendProcess.kill('SIGTERM')
    } else {
      // Negative PID targets the whole process group
      process.kill(-backendProcess.pid!, 'SIGTERM')
    }
  } catch {
    // Process may already be gone
    backendProcess.kill()
  }
}

// Dev and Packaged: spawns the backend from its local or packaged folder
export async function startBackend(): Promise<void> {
  // Free the port if something is already holding it (e.g. a crashed previous run)
  if (await isPortInUse(PORT)) {
    console.warn(`[backend] Port ${PORT} already in use — attempting to free it...`)
    freePort(PORT)
    // Give the OS a moment to reclaim the port
    await new Promise((r) => setTimeout(r, 500))
  }

  const backendDir = is.dev
    ? join(__dirname, '../../../api')
    : join(process.resourcesPath, 'api')

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
    backendProcess = spawn('npx', ['tsx', 'src/main.ts'], {
      cwd: backendDir,
      shell: true,
      // detached: true creates a new process group so we can kill all children
      detached: true,
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
      detached: true,
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
  killBackendGroup()
  backendProcess = null
}
