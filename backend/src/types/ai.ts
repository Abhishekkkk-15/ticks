export type RewriteMode = 'expand' | 'shorten' | 'examples' | 'format';

export interface AiTextRequest {
  text: string;
  workspace_id?: string | null;
  note_id?: string | null;
}

export interface AiRewriteRequest {
  text: string;
  mode: RewriteMode;
  workspace_id?: string | null;
  note_id?: string | null;
}
