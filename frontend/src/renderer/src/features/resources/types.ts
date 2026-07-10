export type ResourceType = 'website' | 'blog' | 'doc' | 'pdf' | 'markdown' | 'file'
export type ResourceStatus = 'queued' | 'reading' | 'processing' | 'completed' | 'failed'

export interface Resource {
  id: string
  note_id: string
  type: ResourceType
  source: string
  title: string
  status: ResourceStatus
  error: string | null
  created_at: string
  updated_at: string
}
