import AppShell from './components/layout/AppShell'

function App(): React.JSX.Element {
  return (
    <AppShell>
      <div className="flex h-full items-center justify-center text-center text-sm text-neutral-500">
        Open or create a workspace to get started
      </div>
    </AppShell>
  )
}

export default App
