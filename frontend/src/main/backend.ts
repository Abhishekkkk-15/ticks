import { ChildProcess, spawn } from 'child_process'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const HOST = '127.0.0.1'
const PORT = 8000

let backendProcess: ChildProcess | null = null

export function getApiBaseUrl(): string {
  return `http://${HOST}:${PORT}`
}

// Dev and Packaged: spawns the backend from its local or packaged folder
export function startBackend(): void {
  const backendDir = is.dev
    ? join(__dirname, '../../../backend')
    : join(process.resourcesPath, 'backend')

  if (is.dev) {
    backendProcess = spawn('pnpm', ['run', 'dev'], {
      cwd: backendDir,
      shell: true,
      env: { ...process.env, HOST, PORT: String(PORT) }
    })
  } else {
    // In production / packaged, spawn the compiled CJS bundle using Electron's node engine.
    backendProcess = spawn(process.execPath, [join(backendDir, 'dist', 'index.js')], {
      cwd: backendDir,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        HOST,
        PORT: String(PORT)
      }
    })
  }

  backendProcess.stdout?.on('data', (data) => console.log(`[backend] ${data.toString().trim()}`))
  backendProcess.stderr?.on('data', (data) => console.log(`[backend] ${data.toString().trim()}`))

  backendProcess.on('error', (error) => {
    console.error('[backend] Failed to start:', error)
  })

  backendProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.warn(
        `[backend] Process exited with code ${code}. ` +
          'If you already have it running manually (e.g. on port 8000), this is expected.'
      )
    } else if (signal) {
      console.log(`[backend] Process terminated by signal ${signal}`)
    }
    backendProcess = null
  })
}

export function stopBackend(): void {
  backendProcess?.kill()
  backendProcess = null
}

