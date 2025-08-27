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

import type { Note, Notebook } from '../store'

const DB_NAME = 'DotaneNotesDB'
const DB_VERSION = 3

// Store names
const NOTES_STORE = 'notes'
const NOTEBOOKS_STORE = 'notebooks'
const BLOCKS_STORE = 'blocks'
const SYNC_STORE = 'sync'
const PREFERENCES_STORE = 'preferences'

// Sync metadata interface
interface SyncMetadata {
  id: string
  lastSync: number
  version: number
}

// IndexedDB service class
export class IndexedDBService {
  private db: IDBDatabase | null = null
  private isInitialized = false

  // Initialize the database
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        console.log('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create notes store
        if (!db.objectStoreNames.contains(NOTES_STORE)) {
          const notesStore = db.createObjectStore(NOTES_STORE, { keyPath: 'id' })
          notesStore.createIndex('notebookId', 'notebookId', { unique: false })
          notesStore.createIndex('createdAt', 'createdAt', { unique: false })
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Create notebooks store
        if (!db.objectStoreNames.contains(NOTEBOOKS_STORE)) {
          const notebooksStore = db.createObjectStore(NOTEBOOKS_STORE, { keyPath: 'id' })
          notebooksStore.createIndex('createdAt', 'createdAt', { unique: false })
          notebooksStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Create blocks store
        if (!db.objectStoreNames.contains(BLOCKS_STORE)) {
          const blocksStore = db.createObjectStore(BLOCKS_STORE, { keyPath: 'id' })
          blocksStore.createIndex('noteId', 'noteId', { unique: false })
          blocksStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }

        // Create sync metadata store
        if (!db.objectStoreNames.contains(SYNC_STORE)) {
          db.createObjectStore(SYNC_STORE, { keyPath: 'id' })
        }

        // Create preferences store
        if (!db.objectStoreNames.contains(PREFERENCES_STORE)) {
          db.createObjectStore(PREFERENCES_STORE, { keyPath: 'id' })
        }

        console.log('IndexedDB schema created/updated')
      }
    })
  }

  // Ensure database is initialized
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  // Generic transaction wrapper
  private async transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], mode)
      const store = transaction.objectStore(storeName)
      const request = operation(store)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)

      transaction.oncomplete = () => {
        // Transaction completed successfully
      }

      transaction.onerror = () => {
        reject(transaction.error)
      }
    })
  }

  // Notes operations
  async saveNote(note: Note): Promise<void> {
    // Ensure all new fields are included with defaults
    const noteToSave = {
      ...note,
      localId: note.localId || note.id,
      synced: note.synced || false,
      is_published: note.is_published || false,
      workspace_id: note.workspace_id || null,
      lastSyncedAt: note.lastSyncedAt || null,
      publish_url: note.publish_url || null
    }
    
    await this.transaction(NOTES_STORE, 'readwrite', (store) => {
      return store.put(noteToSave)
    })
    await this.updateSyncMetadata('notes')
  }

  async getNote(id: string): Promise<Note | null> {
    try {
      const note = await this.transaction(NOTES_STORE, 'readonly', (store) => {
        return store.get(id)
      })
      
      if (!note) return null
      
      // Ensure the note has the new fields with defaults
      return {
        ...note,
        localId: note.localId || note.id,
        synced: note.synced || false,
        is_published: note.is_published || false,
        workspace_id: note.workspace_id || null,
        lastSyncedAt: note.lastSyncedAt || null,
        publish_url: note.publish_url || null
      }
    } catch (error) {
      console.error('Error getting note:', error)
      return null
    }
  }

  async getAllNotes(): Promise<Note[]> {
    try {
      const notes = await this.transaction(NOTES_STORE, 'readonly', (store) => {
        return store.getAll()
      })
      
      // Ensure all notes have the new fields with defaults
      const normalizedNotes = notes.map(note => ({
        ...note,
        localId: note.localId || note.id,
        synced: note.synced || false,
        is_published: note.is_published || false,
        workspace_id: note.workspace_id || null,
        lastSyncedAt: note.lastSyncedAt || null,
        publish_url: note.publish_url || null
      }))
      
      return normalizedNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (error) {
      console.error('Error getting all notes:', error)
      return []
    }
  }

  async getNotesByNotebook(notebookId: string): Promise<Note[]> {
    try {
      const notes = await this.transaction(NOTES_STORE, 'readonly', (store) => {
        const index = store.index('notebookId')
        return index.getAll(notebookId)
      })
      return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (error) {
      console.error('Error getting notes by notebook:', error)
      return []
    }
  }

  async deleteNote(id: string): Promise<void> {
    await this.transaction(NOTES_STORE, 'readwrite', (store) => {
      return store.delete(id)
    })
    await this.updateSyncMetadata('notes')
  }

  async deleteAllNotes(): Promise<void> {
    await this.transaction(NOTES_STORE, 'readwrite', (store) => {
      return store.clear()
    })
    await this.updateSyncMetadata('notes')
  }

  // Blocks operations
  async saveBlocks(noteId: string, blocks: any[]): Promise<void> {
    const blocksData = {
      id: noteId,
      noteId: noteId,
      blocks: blocks,
      updatedAt: new Date()
    }
    
    await this.transaction(BLOCKS_STORE, 'readwrite', (store) => {
      return store.put(blocksData)
    })
    await this.updateSyncMetadata('blocks')
  }

  async getBlocks(noteId: string): Promise<any[] | null> {
    try {
      const blocksData = await this.transaction(BLOCKS_STORE, 'readonly', (store) => {
        return store.get(noteId)
      })
      return blocksData?.blocks || null
    } catch (error) {
      console.error('Error getting blocks:', error)
      return null
    }
  }

  async deleteBlocks(noteId: string): Promise<void> {
    await this.transaction(BLOCKS_STORE, 'readwrite', (store) => {
      return store.delete(noteId)
    })
    await this.updateSyncMetadata('blocks')
  }

  async deleteAllBlocks(): Promise<void> {
    await this.transaction(BLOCKS_STORE, 'readwrite', (store) => {
      return store.clear()
    })
    await this.updateSyncMetadata('blocks')
  }

  // Notebooks operations
  async saveNotebook(notebook: Notebook): Promise<void> {
    await this.transaction(NOTEBOOKS_STORE, 'readwrite', (store) => {
      return store.put(notebook)
    })
    await this.updateSyncMetadata('notebooks')
  }

  async getNotebook(id: string): Promise<Notebook | null> {
    try {
      const notebook = await this.transaction(NOTEBOOKS_STORE, 'readonly', (store) => {
        return store.get(id)
      })
      return notebook || null
    } catch (error) {
      console.error('Error getting notebook:', error)
      return null
    }
  }

  async getAllNotebooks(): Promise<Notebook[]> {
    try {
      const notebooks = await this.transaction(NOTEBOOKS_STORE, 'readonly', (store) => {
        return store.getAll()
      })
      return notebooks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (error) {
      console.error('Error getting all notebooks:', error)
      return []
    }
  }

  async deleteNotebook(id: string): Promise<void> {
    await this.transaction(NOTEBOOKS_STORE, 'readwrite', (store) => {
      return store.delete(id)
    })
    await this.updateSyncMetadata('notebooks')
  }

  async deleteAllNotebooks(): Promise<void> {
    await this.transaction(NOTEBOOKS_STORE, 'readwrite', (store) => {
      return store.clear()
    })
    await this.updateSyncMetadata('notebooks')
  }

  // Batch operations
  async saveNotes(notes: Note[]): Promise<void> {
    await this.transaction(NOTES_STORE, 'readwrite', (store) => {
      notes.forEach(note => store.put(note))
      return store.getAll() // Dummy request to complete transaction
    })
    await this.updateSyncMetadata('notes')
  }

  async saveNotebooks(notebooks: Notebook[]): Promise<void> {
    await this.transaction(NOTEBOOKS_STORE, 'readwrite', (store) => {
      notebooks.forEach(notebook => store.put(notebook))
      return store.getAll() // Dummy request to complete transaction
    })
    await this.updateSyncMetadata('notebooks')
  }

  // Sync metadata operations
  private async updateSyncMetadata(storeType: string): Promise<void> {
    const metadata: SyncMetadata = {
      id: storeType,
      lastSync: Date.now(),
      version: 1
    }

    await this.transaction(SYNC_STORE, 'readwrite', (store) => {
      return store.put(metadata)
    })
  }

  async getSyncMetadata(storeType: string): Promise<SyncMetadata | null> {
    try {
      const metadata = await this.transaction(SYNC_STORE, 'readonly', (store) => {
        return store.get(storeType)
      })
      return metadata || null
    } catch (error) {
      console.error('Error getting sync metadata:', error)
      return null
    }
  }

  // Clear all data (for logout)
  async clearAllData(): Promise<void> {
    await this.deleteAllNotes()
    await this.deleteAllNotebooks()
    await this.deleteAllBlocks()
    await this.clearAllPreferences()
    
    // Clear sync metadata
    await this.transaction(SYNC_STORE, 'readwrite', (store) => {
      return store.clear()
    })
  }

  // Get database size info
  async getDatabaseInfo(): Promise<{ notes: number; notebooks: number; blocks: number; lastSync: number }> {
    const notes = await this.getAllNotes()
    const notebooks = await this.getAllNotebooks()
    const notesMetadata = await this.getSyncMetadata('notes')
    const notebooksMetadata = await this.getSyncMetadata('notebooks')
    const blocksMetadata = await this.getSyncMetadata('blocks')

    const lastSync = Math.max(
      notesMetadata?.lastSync || 0,
      notebooksMetadata?.lastSync || 0,
      blocksMetadata?.lastSync || 0
    )

    return {
      notes: notes.length,
      notebooks: notebooks.length,
      blocks: 0, // We'll calculate this separately if needed
      lastSync
    }
  }

  // Preferences operations
  async savePreference(id: string, value: any): Promise<void> {
    await this.transaction(PREFERENCES_STORE, 'readwrite', (store) => {
      return store.put({ id, value, updatedAt: Date.now() })
    })
  }

  async getPreference(id: string): Promise<any | null> {
    try {
      const preference = await this.transaction(PREFERENCES_STORE, 'readonly', (store) => {
        return store.get(id)
      })
      return preference?.value || null
    } catch (error) {
      console.error('Error getting preference:', error)
      return null
    }
  }

  async getAllPreferences(): Promise<Record<string, any>> {
    try {
      const preferences = await this.transaction(PREFERENCES_STORE, 'readonly', (store) => {
        return store.getAll()
      })
      const result: Record<string, any> = {}
      preferences.forEach(pref => {
        result[pref.id] = pref.value
      })
      return result
    } catch (error) {
      console.error('Error getting all preferences:', error)
      return {}
    }
  }

  async deletePreference(id: string): Promise<void> {
    await this.transaction(PREFERENCES_STORE, 'readwrite', (store) => {
      return store.delete(id)
    })
  }

  async clearAllPreferences(): Promise<void> {
    await this.transaction(PREFERENCES_STORE, 'readwrite', (store) => {
      return store.clear()
    })
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
    }
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService() 