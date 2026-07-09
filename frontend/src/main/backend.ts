import { ChildProcess, spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const HOST = '127.0.0.1'
const PORT = 8000

let backendProcess: ChildProcess | null = null

export function getApiBaseUrl(): string {
  return `http://${HOST}:${PORT}`
}

function resolvePythonExecutable(backendDir: string): string | null {
  const venvPython =
    process.platform === 'win32'
      ? join(backendDir, '.venv', 'Scripts', 'python.exe')
      : join(backendDir, '.venv', 'bin', 'python')

  return existsSync(venvPython) ? venvPython : null
}

// Dev-only: spawns the backend from its local .venv next to this repo's
// frontend/ folder. Packaged builds will need a bundled interpreter — left
// for the packaging milestone rather than guessed at here.
export function startBackend(): void {
  if (!is.dev) {
    console.warn('[backend] Auto-start is only wired up for development builds so far.')
    return
  }

  const backendDir = join(__dirname, '../../../backend')
  const pythonExecutable = resolvePythonExecutable(backendDir)

  if (!pythonExecutable) {
    console.error(
      `[backend] No virtualenv found at ${backendDir}/.venv. ` +
        'Run `python3 -m venv .venv && pip install -r requirements.txt -r requirements-dev.txt` in backend/, ' +
        'or start it manually.'
    )
    return
  }

  backendProcess = spawn(
    pythonExecutable,
    ['-m', 'uvicorn', 'app.main:app', '--host', HOST, '--port', String(PORT)],
    {
      cwd: backendDir,
      env: { ...process.env, HOST, PORT: String(PORT) }
    }
  )

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
