import Sidebar from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default AppShell
