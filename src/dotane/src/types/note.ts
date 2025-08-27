import type { BlockNoteEditor } from "@blocknote/core"

export interface Note {
  id: string
  title: string
  content: string
  blocksId?: string // Reference to blocks in separate store
  createdAt: Date
  updatedAt: Date
  notebookId?: string
  is_published?: boolean // Whether the note is published
  publish_url?: string // URL where the note is published
  backendId?: string // Backend canister ID
  synced?: boolean // Track sync status
  lastSyncedAt?: Date
  workspace_id?: string // ID of the workspace this note belongs to
}
