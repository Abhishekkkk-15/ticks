import WorkspaceDrawingsList from './WorkspaceDrawingsList'

interface DrawingViewProps {
  workspaceId: string | null
}

function DrawingView({ workspaceId }: DrawingViewProps): React.JSX.Element {
  if (!workspaceId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Select a workspace first.
      </div>
    )
  }

  return <WorkspaceDrawingsList workspaceId={workspaceId} />
}

export default DrawingView
