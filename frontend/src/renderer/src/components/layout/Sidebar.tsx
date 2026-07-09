function Sidebar(): React.JSX.Element {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <div className="px-4 py-4 text-sm font-medium text-neutral-200">AI Learning Workspace</div>
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-neutral-500">
        No workspaces yet
      </div>
    </aside>
  )
}

export default Sidebar
