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

  if (existsSync(venvPython)) return venvPython
  return process.platform === 'win32' ? 'python.exe' : 'python3'
}

// Dev and Packaged: spawns the backend from its local or packaged folder
export function startBackend(): void {
  const backendDir = is.dev
    ? join(__dirname, '../../../backend')
    : join(process.resourcesPath, 'backend')
  const pythonExecutable = resolvePythonExecutable(backendDir)

  if (!pythonExecutable) {
    console.error(
      `[backend] No virtualenv or system python found for ${backendDir}. ` +
        'Please start the backend manually.'
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
