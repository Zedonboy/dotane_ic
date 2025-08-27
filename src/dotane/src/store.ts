// Copyright 2025 Declan Nnadozie
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     https://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Identity } from '@dfinity/agent'
import { atom } from 'jotai'
import { canisterId as dotaneCanisterId } from "@declarations/dotane_ic_backend"

// Authentication state interface
export interface AuthState {
  isAuthenticated: boolean
  identity: Identity | null
  isLoading: boolean
  error: string | null
}

// User profile interface matching backend UserProfile
export interface UserProfile {
  name: string
  email: string
  bio: string
  avatar: string
  created_at: bigint
  updated_at: bigint
  premium: boolean
  marked_public: boolean
}

// Workspace interface matching backend Workspace
export interface Workspace {
  canister_id: string
  domain?: string
}

// User workspace interface with additional UI properties
export interface UserWorkspace extends Workspace {
  isDefault: boolean
}

// Note interface
export interface Note {
  id: string
  localId?: string // Local IndexedDB ID
  backendId?: string // Backend canister ID
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  synced: boolean // Track sync status
  lastSyncedAt?: Date
  is_published: boolean // Whether the note is published
  publish_url?: string // URL where the note is published
  workspace_id?: string // ID of the workspace this note belongs to
  blocksId?: string // Reference to blocks in separate store
  notebookId?: string
}

// Notebook interface
export interface Notebook {
  id: string
  name: string
  color: string
  noteCount: number
  createdAt: Date
  updatedAt: Date
}

// Initial authentication state
const initialAuthState: AuthState = {
  isAuthenticated: false,
  identity: null,
  isLoading: false,
  error: null
}

// Authentication atom
export const authAtom = atom<AuthState>(initialAuthState)

// User data atom
export const userDataAtom = atom<UserProfile | null>(null)

// User workspace atoms
export const userWorkspacesAtom = atom<UserWorkspace[]>([])
export const defaultWorkspaceAtom = atom<UserWorkspace | null>(null)

// Notes and notebooks atoms
export const notesAtom = atom<Note[]>([])
export const notebooksAtom = atom<Notebook[]>([])
export const activeNoteIdAtom = atom<string | null>(null)
export const selectedNotebookIdAtom = atom<string | null>(null)

// Preferences atoms
export const preferencesAtom = atom<Record<string, any>>({})

// Wallet direct connection atom
export const walletDirectConnectedAtom = atom<boolean>(false)

// AI Session atom
export const aiSessionAtom = atom<any>(null)

// Wallet direct connection actions
export const setWalletDirectConnectedAtom = atom(
  null,
  (get, set, connected: boolean) => {
    set(walletDirectConnectedAtom, connected)
  }
)

// Load preferences atom
export const loadPreferencesAtom = atom(
  null,
  async (get, set, workspaces: Workspace[]) => {
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      await indexedDBService.initialize()
      
      console.log('Loading preferences from IndexedDB...')
      
      const savedDefaultWorkspace = await indexedDBService.getPreference('defaultWorkspace')
      
      if (savedDefaultWorkspace) {
        console.log('Found saved default workspace preference:', savedDefaultWorkspace)
        const userWorkspaces = workspaces.map(workspace => ({
          ...workspace,
          isDefault: workspace.canister_id === savedDefaultWorkspace
        }))
        console.log('Updated workspaces with saved preference:', userWorkspaces)
        set(userWorkspacesAtom, userWorkspaces)
        const defaultWorkspace = userWorkspaces.find(workspace => workspace.isDefault) || userWorkspaces[0]
        console.log('Setting default workspace to:', defaultWorkspace)
        set(defaultWorkspaceAtom, defaultWorkspace)
        return savedDefaultWorkspace
      } else {
        console.log('No saved workspace preference found, using first workspace as default')
        const userWorkspaces = workspaces.map((workspace, index) => ({
          ...workspace,
          isDefault: index === 0 // First workspace is default
        }))
        set(userWorkspacesAtom, userWorkspaces)
        set(defaultWorkspaceAtom, userWorkspaces[0] || null)
        return userWorkspaces[0]?.canister_id || null
      }
    } catch (error) {
      console.error('Error loading preferences from IndexedDB:', error)
      return null
    }
  }
)

// Derived atoms for easier access
export const isAuthenticatedAtom = atom(
  (get) => get(authAtom).isAuthenticated
)

export const authIdentityAtom = atom(
  (get) => get(authAtom).identity
)

export const authLoadingAtom = atom(
  (get) => get(authAtom).isLoading
)

export const authErrorAtom = atom(
  (get) => get(authAtom).error
)

export const userProfileAtom = atom(
  (get) => get(userDataAtom)
)

export const currentWorkspaceAtom = atom(
  (get) => get(defaultWorkspaceAtom)
)

// Derived atoms for notes
export const activeNoteAtom = atom(
  (get) => {
    const notes = get(notesAtom)
    const activeNoteId = get(activeNoteIdAtom)
    return notes.find(note => note.id === activeNoteId) || null
  }
)

export const filteredNotesAtom = atom(
  (get) => {
    const notes = get(notesAtom)
    const selectedNotebookId = get(selectedNotebookIdAtom)
    if (!selectedNotebookId) return notes
    return notes.filter(note => note.notebookId === selectedNotebookId)
  }
)

// Authentication actions
export const setAuthLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(authAtom, { ...get(authAtom), isLoading: loading })
  }
)

export const setAuthErrorAtom = atom(
  null,
  (get, set, error: string | null) => {
    set(authAtom, { ...get(authAtom), error, isLoading: false })
  }
)

export const loginAtom = atom(
  null,
  async (get, set, data: { identity: Identity; userProfile: UserProfile; workspaces: Workspace[] }) => {
    try {
      // Set loading state
      set(authAtom, { ...get(authAtom), isLoading: true, error: null })
      
      // Load data from IndexedDB
      let savedDefaultWorkspace: string | null = null
      let dbNotes: Note[] = []
      let dbNotebooks: Notebook[] = []
      
      try {
        const { indexedDBService } = await import('./lib/indexeddb')
        await indexedDBService.initialize()
        
        console.log('Loading data from IndexedDB...')
        
        const [notes, notebooks, defaultWorkspace] = await Promise.all([
          indexedDBService.getAllNotes(),
          indexedDBService.getAllNotebooks(),
          indexedDBService.getPreference('defaultWorkspace')
        ])
        
        dbNotes = notes
        dbNotebooks = notebooks
        savedDefaultWorkspace = defaultWorkspace
        
        console.log(`Loaded from IndexedDB: ${dbNotes.length} notes, ${dbNotebooks.length} notebooks, workspace preference: ${savedDefaultWorkspace}`)
        
      } catch (error) {
        console.error('Error loading data from IndexedDB:', error)
        // Continue with empty data if IndexedDB fails
      }
      
      // Set authentication state
      set(authAtom, {
        isAuthenticated: true,
        identity: data.identity,
        isLoading: false,
        error: null
      })
      
      // Set user profile from provided data
      set(userDataAtom, data.userProfile)
      
      // Set notes and notebooks from IndexedDB (or empty arrays if none)
      set(notesAtom, dbNotes)
      set(notebooksAtom, dbNotebooks)
      
      // Process workspaces and set default workspace
      if (data.workspaces.length > 0) {
        // Add the main canister as the first workspace if not already present
        const mainWorkspace: Workspace = {
          canister_id: dotaneCanisterId,
          domain: "dotane.io"
        }
        
        const allWorkspaces = [mainWorkspace, ...data.workspaces]
        
        // Apply saved default workspace preference or use first workspace as default
        const userWorkspaces: UserWorkspace[] = allWorkspaces.map(workspace => ({
          canister_id: workspace.canister_id,
          domain: Array.isArray(workspace.domain) ? workspace.domain[0] : workspace.domain,
          isDefault: savedDefaultWorkspace ? workspace.canister_id === savedDefaultWorkspace : workspace.canister_id === dotaneCanisterId
        }))
        
        set(userWorkspacesAtom, userWorkspaces)
        const defaultWorkspace = userWorkspaces.find(workspace => workspace.isDefault) || userWorkspaces[0]
        set(defaultWorkspaceAtom, defaultWorkspace)
        
        console.log('Workspaces loaded:', userWorkspaces)
        console.log('Default workspace set to:', defaultWorkspace)
      } else {
        // Fallback to just the main canister
        const fallbackWorkspace: UserWorkspace = {
          canister_id: dotaneCanisterId,
          domain: "dotane.io",
          isDefault: true
        }
        set(userWorkspacesAtom, [fallbackWorkspace])
        set(defaultWorkspaceAtom, fallbackWorkspace)
        console.log('No workspaces provided, using fallback:', fallbackWorkspace)
      }
      
    } catch (error) {
      console.error('Error during login data setup:', error)
      set(authAtom, {
        isAuthenticated: false,
        identity: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login data setup failed'
      })
      throw error
    }
  }
)



// User data actions
export const updateUserProfileAtom = atom(
  null,
  (get, set, updates: Partial<UserProfile>) => {
    const currentUser = get(userDataAtom)
    if (currentUser) {
      set(userDataAtom, {
        ...currentUser,
        ...updates,
        updated_at: BigInt(Date.now())
      })
    }
  }
)

export const setUserDataAtom = atom(
  null,
  (get, set, userData: UserProfile) => {
    set(userDataAtom, userData)
  }
)

// Workspace management actions
export const setDefaultWorkspaceAtom = atom(
  null,
  async (get, set, canisterId: string) => {
    const workspaces = get(userWorkspacesAtom)
    const newWorkspaces = workspaces.map(workspace => ({
      ...workspace,
      isDefault: workspace.canister_id === canisterId
    }))
    set(userWorkspacesAtom, newWorkspaces)
    set(defaultWorkspaceAtom, newWorkspaces.find(workspace => workspace.isDefault) || null)
    
    // Save preference to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      await indexedDBService.savePreference('defaultWorkspace', canisterId)
      console.log('Default workspace preference saved to IndexedDB:', canisterId)
    } catch (error) {
      console.error('Error saving default workspace preference to IndexedDB:', error)
    }
  }
)

export const addUserWorkspaceAtom = atom(
  null,
  (get, set, workspace: UserWorkspace) => {
    const currentWorkspaces = get(userWorkspacesAtom)
    set(userWorkspacesAtom, [...currentWorkspaces, workspace])
  }
)

export const removeUserWorkspaceAtom = atom(
  null,
  (get, set, canisterId: string) => {
    const currentWorkspaces = get(userWorkspacesAtom)
    const filteredWorkspaces = currentWorkspaces.filter(workspace => workspace.canister_id !== canisterId)
    set(userWorkspacesAtom, filteredWorkspaces)
    
    // If we removed the default workspace, set the first available as default
    const currentDefault = get(defaultWorkspaceAtom)
    if (currentDefault?.canister_id === canisterId && filteredWorkspaces.length > 0) {
      set(defaultWorkspaceAtom, filteredWorkspaces[0])
    }
  }
)



// Note management actions
export const createNoteAtom = atom(
  null,
  async (get, set, selectedNotebookId?: string | null) => {
    const currentWorkspace = get(defaultWorkspaceAtom)
    
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      localId: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Local ID
      title: "Untitled",
      content: "",
      blocksId: undefined, // Will be set when blocks are first saved
      createdAt: new Date(),
      updatedAt: new Date(),
      synced: false, // New note is not synced yet
      is_published: false, // New note is not published
      workspace_id: currentWorkspace?.canister_id, // Set current workspace
      notebookId: selectedNotebookId || undefined,
    }
    
    const currentNotes = get(notesAtom)
    set(notesAtom, [newNote, ...currentNotes])
    set(activeNoteIdAtom, newNote.id)
    
    // Save to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      await indexedDBService.saveNote(newNote)
      console.log('New note saved to IndexedDB:', newNote.id)
    } catch (error) {
      console.error('Error saving new note to IndexedDB:', error)
    }
    
    // Update notebook counts if note is assigned to a notebook
    if (selectedNotebookId) {
      // Recalculate notebook counts after adding the new note
      const currentNotebooks = get(notebooksAtom)
      const allNotes = [newNote, ...get(notesAtom)]
      
      // Calculate new counts
      const notebookCounts = new Map<string, number>()
      
      // Initialize all notebooks with 0 count
      currentNotebooks.forEach(notebook => {
        notebookCounts.set(notebook.id, 0)
      })
      
      // Count notes for each notebook
      allNotes.forEach(note => {
        if (note.notebookId) {
          const currentCount = notebookCounts.get(note.notebookId) || 0
          notebookCounts.set(note.notebookId, currentCount + 1)
        }
      })
      
      // Update notebooks with new counts
      const updatedNotebooks = currentNotebooks.map(notebook => ({
        ...notebook,
        noteCount: notebookCounts.get(notebook.id) || 0,
        updatedAt: new Date()
      }))
      
      set(notebooksAtom, updatedNotebooks)
      
      // Save updated notebooks to IndexedDB
      try {
        const { indexedDBService } = await import('./lib/indexeddb')
        for (const notebook of updatedNotebooks) {
          await indexedDBService.saveNotebook(notebook)
        }
        console.log('Notebook counts updated in IndexedDB after creating note')
      } catch (error) {
        console.error('Error updating notebook counts in IndexedDB:', error)
      }
    }
    
    return newNote
  }
)

export const updateNoteAtom = atom(
  null,
  async (get, set, id: string, updates: Partial<Note>) => {
    const currentNotes = get(notesAtom)
    const updatedNotes = currentNotes.map(note => 
      note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
    )
    set(notesAtom, updatedNotes)
    
    // Save updated note to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      const updatedNote = updatedNotes.find(note => note.id === id)
      if (updatedNote) {
        await indexedDBService.saveNote(updatedNote)
        console.log('Note updated in IndexedDB:', id)
      }
    } catch (error) {
      console.error('Error updating note in IndexedDB:', error)
    }
  }
)

export const saveBlocksAtom = atom(
  null,
  async (get, set, noteId: string, blocks: any[]) => {
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      
      // Save blocks to separate store
      await indexedDBService.saveBlocks(noteId, blocks)
      
      // Extract first text content from blocks
      let firstTextContent = ""
      if (blocks && blocks.length > 0) {
        for (const block of blocks) {
          if (block.content && Array.isArray(block.content)) {
            for (const contentItem of block.content) {
              if (contentItem.type === "text" && contentItem.text && contentItem.text.trim()) {
                firstTextContent = contentItem.text.trim()
                break
              }
            }
            if (firstTextContent) break
          }
        }
      }
      
      // Update note to reference the blocks and set content
      const currentNotes = get(notesAtom)
      const updatedNotes = currentNotes.map(note => 
        note.id === noteId ? { 
          ...note, 
          blocksId: noteId, 
          content: firstTextContent,
          updatedAt: new Date() 
        } : note
      )
      set(notesAtom, updatedNotes)
      
      // Save the updated note
      const updatedNote = updatedNotes.find(note => note.id === noteId)
      if (updatedNote) {
        await indexedDBService.saveNote(updatedNote)
      }
      
      console.log('Blocks saved to IndexedDB:', noteId, 'content:', firstTextContent)
    } catch (error) {
      console.error('Error saving blocks to IndexedDB:', error)
    }
  }
)

export const updateNoteBlocksAtom = atom(
  null,
  async (get, set, noteId: string, blocks: any[]) => {
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      
      // Save blocks to separate store
      await indexedDBService.saveBlocks(noteId, blocks)
      
      // Extract first text content from blocks
      let firstTextContent = ""
      if (blocks && blocks.length > 0) {
        for (const block of blocks) {
          if (block.content && Array.isArray(block.content)) {
            for (const contentItem of block.content) {
              if (contentItem.type === "text" && contentItem.text && contentItem.text.trim()) {
                firstTextContent = contentItem.text.trim()
                break
              }
            }
            if (firstTextContent) break
          }
        }
      }
      
      // Update note's blocksId, content, and updatedAt timestamp
      const currentNotes = get(notesAtom)
      const updatedNotes = currentNotes.map(note => 
        note.id === noteId ? { 
          ...note, 
          blocksId: noteId, 
          content: firstTextContent,
          updatedAt: new Date() 
        } : note
      )
      set(notesAtom, updatedNotes)
      
      // Save the updated note
      const updatedNote = updatedNotes.find(note => note.id === noteId)
      if (updatedNote) {
        await indexedDBService.saveNote(updatedNote)
        console.log('Note updated with blocksId:', noteId, 'blocksId:', updatedNote.blocksId, 'content:', firstTextContent)
      }
      
      console.log('Note blocks updated in IndexedDB:', noteId)
    } catch (error) {
      console.error('Error updating note blocks in IndexedDB:', error)
    }
  }
)

export const loadBlocksAtom = atom(
  null,
  async (get, set, noteId: string) => {
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      const blocks = await indexedDBService.getBlocks(noteId)
      return blocks
    } catch (error) {
      console.error('Error loading blocks from IndexedDB:', error)
      return null
    }
  }
)

export const deleteNoteAtom = atom(
  null,
  async (get, set, id: string) => {
    const currentNotes = get(notesAtom)
    const filteredNotes = currentNotes.filter(note => note.id !== id)
    set(notesAtom, filteredNotes)
    
    // If we deleted the active note, clear the active note ID
    const activeNoteId = get(activeNoteIdAtom)
    if (activeNoteId === id) {
      set(activeNoteIdAtom, null)
    }
    
    // Delete from IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      await indexedDBService.deleteNote(id)
      await indexedDBService.deleteBlocks(id) // Also delete blocks
      console.log('Note and blocks deleted from IndexedDB:', id)
    } catch (error) {
      console.error('Error deleting note from IndexedDB:', error)
    }
  }
)

export const setActiveNoteIdAtom = atom(
  null,
  (get, set, noteId: string | null) => {
    set(activeNoteIdAtom, noteId)
  }
)

export const setSelectedNotebookIdAtom = atom(
  null,
  (get, set, notebookId: string | null) => {
    set(selectedNotebookIdAtom, notebookId)
  }
)

// Notebook management actions
export const createNotebookAtom = atom(
  null,
  async (get, set) => {
    const colors = [
      "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500",
      "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500",
      "bg-teal-500", "bg-cyan-500", "bg-emerald-500", "bg-violet-500"
    ]
    
    const currentNotebooks = get(notebooksAtom)
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    const notebookNumber = currentNotebooks.length + 1
    
    const newNotebook: Notebook = {
      id: Date.now().toString(),
      name: `Notebook ${notebookNumber}`,
      color: randomColor,
      noteCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    set(notebooksAtom, [...currentNotebooks, newNotebook])
    
    // Save to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      await indexedDBService.saveNotebook(newNotebook)
      console.log('New notebook saved to IndexedDB:', newNotebook.id)
    } catch (error) {
      console.error('Error saving new notebook to IndexedDB:', error)
    }
    
    return newNotebook
  }
)

export const updateNotebookAtom = atom(
  null,
  async (get, set, id: string, updates: Partial<Notebook>) => {
    const currentNotebooks = get(notebooksAtom)
    const updatedNotebooks = currentNotebooks.map(notebook => 
      notebook.id === id ? { ...notebook, ...updates, updatedAt: new Date() } : notebook
    )
    set(notebooksAtom, updatedNotebooks)
    
    // Save updated notebook to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      const updatedNotebook = updatedNotebooks.find(notebook => notebook.id === id)
      if (updatedNotebook) {
        await indexedDBService.saveNotebook(updatedNotebook)
        console.log('Notebook updated in IndexedDB:', id)
      }
    } catch (error) {
      console.error('Error updating notebook in IndexedDB:', error)
    }
  }
)

// Atom to update notebook counts when notes are assigned/unassigned
export const updateNotebookCountsAtom = atom(
  null,
  async (get, set, noteId: string, newNotebookId: string | undefined, oldNotebookId?: string | undefined) => {
    const currentNotebooks = get(notebooksAtom)
    const currentNotes = get(notesAtom)
    
    // Calculate new counts
    const notebookCounts = new Map<string, number>()
    
    // Initialize all notebooks with 0 count
    currentNotebooks.forEach(notebook => {
      notebookCounts.set(notebook.id, 0)
    })
    
    // Count notes for each notebook
    currentNotes.forEach(note => {
      if (note.notebookId) {
        const currentCount = notebookCounts.get(note.notebookId) || 0
        notebookCounts.set(note.notebookId, currentCount + 1)
      }
    })
    
    // Update notebooks with new counts
    const updatedNotebooks = currentNotebooks.map(notebook => ({
      ...notebook,
      noteCount: notebookCounts.get(notebook.id) || 0,
      updatedAt: new Date()
    }))
    
    set(notebooksAtom, updatedNotebooks)
    
    // Save updated notebooks to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      for (const notebook of updatedNotebooks) {
        await indexedDBService.saveNotebook(notebook)
      }
      console.log('Notebook counts updated in IndexedDB')
    } catch (error) {
      console.error('Error updating notebook counts in IndexedDB:', error)
    }
  }
)

// Utility atoms for note metadata
export const publishedNotesAtom = atom(
  (get) => get(notesAtom).filter(note => note.is_published)
)

export const unpublishedNotesAtom = atom(
  (get) => get(notesAtom).filter(note => !note.is_published)
)

export const syncedNotesAtom = atom(
  (get) => get(notesAtom).filter(note => note.synced)
)

export const unsyncedNotesAtom = atom(
  (get) => get(notesAtom).filter(note => !note.synced)
)

export const notesByWorkspaceAtom = atom(
  (get) => {
    const notes = get(notesAtom)
    const currentWorkspace = get(defaultWorkspaceAtom)
    
    return notes.filter(note => 
      note.workspace_id === currentWorkspace?.canister_id
    )
  }
)

// Action to mark note as published
export const markNoteAsPublishedAtom = atom(
  null,
  async (get, set, noteId: string, publishUrl: string, workspaceId?: string) => {
    const currentNotes = get(notesAtom)
    const updatedNotes = currentNotes.map(note => 
      note.id === noteId ? { 
        ...note, 
        is_published: true,
        publish_url: publishUrl,
        workspace_id: workspaceId || note.workspace_id, // Update workspace_id if provided
        updatedAt: new Date()
      } : note
    )
    set(notesAtom, updatedNotes)
    
    // Save to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      const updatedNote = updatedNotes.find(note => note.id === noteId)
      if (updatedNote) {
        await indexedDBService.saveNote(updatedNote)
        console.log('Note marked as published in IndexedDB:', noteId)
      }
    } catch (error) {
      console.error('Error updating note publish status in IndexedDB:', error)
    }
  }
)

// Action to sync note with backend
export const syncNoteWithBackendAtom = atom(
  null,
  async (get, set, noteId: string, backendId: string) => {
    const currentNotes = get(notesAtom)
    const updatedNotes = currentNotes.map(note => 
      note.id === noteId ? { 
        ...note, 
        backendId: backendId,
        synced: true,
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      } : note
    )
    set(notesAtom, updatedNotes)
    
    // Save to IndexedDB
    try {
      const { indexedDBService } = await import('./lib/indexeddb')
      const updatedNote = updatedNotes.find(note => note.id === noteId)
      if (updatedNote) {
        await indexedDBService.saveNote(updatedNote)
        console.log('Note synced with backend in IndexedDB:', noteId)
      }
    } catch (error) {
      console.error('Error syncing note with backend in IndexedDB:', error)
    }
  }
)

