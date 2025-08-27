import { useEffect, useCallback } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { indexedDBService } from '../lib/indexeddb'
import {
  notesAtom,
  notebooksAtom,
  activeNoteIdAtom,
  selectedNotebookIdAtom,
  type Note,
  type Notebook
} from '../store'

// Hook for IndexedDB operations with Jotai integration
export function useIndexedDB() {
  const notes = useAtomValue(notesAtom)
  const notebooks = useAtomValue(notebooksAtom)
  const activeNoteId = useAtomValue(activeNoteIdAtom)
  const selectedNotebookId = useAtomValue(selectedNotebookIdAtom)

  const setNotes = useSetAtom(notesAtom)
  const setNotebooks = useSetAtom(notebooksAtom)

  // Initialize IndexedDB on mount
  useEffect(() => {
    const initDB = async () => {
      try {
        await indexedDBService.initialize()
        console.log('IndexedDB initialized in hook')
      } catch (error) {
        console.error('Failed to initialize IndexedDB:', error)
      }
    }

    initDB()

    // Cleanup on unmount
    return () => {
      // Don't close the DB connection as it's a singleton
      // indexedDBService.close()
    }
  }, [])

  // Load all data from IndexedDB
  const loadAllData = useCallback(async () => {
    try {
      console.log('Loading data from IndexedDB...')
      const [dbNotes, dbNotebooks] = await Promise.all([
        indexedDBService.getAllNotes(),
        indexedDBService.getAllNotebooks()
      ])

      console.log(`Loaded ${dbNotes.length} notes and ${dbNotebooks.length} notebooks from IndexedDB`)
      
      setNotes(dbNotes)
      setNotebooks(dbNotebooks)
      
      return { notes: dbNotes, notebooks: dbNotebooks }
    } catch (error) {
      console.error('Error loading data from IndexedDB:', error)
      return { notes: [], notebooks: [] }
    }
  }, [setNotes, setNotebooks])

  // Save a single note to IndexedDB
  const saveNote = useCallback(async (note: Note) => {
    try {
      await indexedDBService.saveNote(note)
      console.log('Note saved to IndexedDB:', note.id)
    } catch (error) {
      console.error('Error saving note to IndexedDB:', error)
    }
  }, [])

  // Save a single notebook to IndexedDB
  const saveNotebook = useCallback(async (notebook: Notebook) => {
    try {
      await indexedDBService.saveNotebook(notebook)
      console.log('Notebook saved to IndexedDB:', notebook.id)
    } catch (error) {
      console.error('Error saving notebook to IndexedDB:', error)
    }
  }, [])

  // Save all current notes to IndexedDB
  const saveAllNotes = useCallback(async () => {
    try {
      await indexedDBService.saveNotes(notes)
      console.log(`Saved ${notes.length} notes to IndexedDB`)
    } catch (error) {
      console.error('Error saving all notes to IndexedDB:', error)
    }
  }, [notes])

  // Save all current notebooks to IndexedDB
  const saveAllNotebooks = useCallback(async () => {
    try {
      await indexedDBService.saveNotebooks(notebooks)
      console.log(`Saved ${notebooks.length} notebooks to IndexedDB`)
    } catch (error) {
      console.error('Error saving all notebooks to IndexedDB:', error)
    }
  }, [notebooks])

  // Delete a note from IndexedDB
  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await indexedDBService.deleteNote(noteId)
      console.log('Note deleted from IndexedDB:', noteId)
    } catch (error) {
      console.error('Error deleting note from IndexedDB:', error)
    }
  }, [])

  // Delete a notebook from IndexedDB
  const deleteNotebook = useCallback(async (notebookId: string) => {
    try {
      await indexedDBService.deleteNotebook(notebookId)
      console.log('Notebook deleted from IndexedDB:', notebookId)
    } catch (error) {
      console.error('Error deleting notebook from IndexedDB:', error)
    }
  }, [])

  // Clear all data from IndexedDB
  const clearAllData = useCallback(async () => {
    try {
      await indexedDBService.clearAllData()
      console.log('All data cleared from IndexedDB')
    } catch (error) {
      console.error('Error clearing data from IndexedDB:', error)
    }
  }, [])

  // Get database info
  const getDatabaseInfo = useCallback(async () => {
    try {
      return await indexedDBService.getDatabaseInfo()
    } catch (error) {
      console.error('Error getting database info:', error)
      return { notes: 0, notebooks: 0, lastSync: 0 }
    }
  }, [])

  // Sync current state to IndexedDB
  const syncToIndexedDB = useCallback(async () => {
    try {
      await Promise.all([
        saveAllNotes(),
        saveAllNotebooks()
      ])
      console.log('State synced to IndexedDB')
    } catch (error) {
      console.error('Error syncing to IndexedDB:', error)
    }
  }, [saveAllNotes, saveAllNotebooks])

  // Preference operations
  const savePreference = useCallback(async (id: string, value: any) => {
    try {
      await indexedDBService.savePreference(id, value)
      console.log('Preference saved to IndexedDB:', id)
    } catch (error) {
      console.error('Error saving preference to IndexedDB:', error)
    }
  }, [])

  const getPreference = useCallback(async (id: string) => {
    try {
      return await indexedDBService.getPreference(id)
    } catch (error) {
      console.error('Error getting preference from IndexedDB:', error)
      return null
    }
  }, [])

  const getAllPreferences = useCallback(async () => {
    try {
      return await indexedDBService.getAllPreferences()
    } catch (error) {
      console.error('Error getting all preferences from IndexedDB:', error)
      return {}
    }
  }, [])

  return {
    loadAllData,
    saveNote,
    saveNotebook,
    saveAllNotes,
    saveAllNotebooks,
    deleteNote,
    deleteNotebook,
    clearAllData,
    getDatabaseInfo,
    syncToIndexedDB,
    savePreference,
    getPreference,
    getAllPreferences
  }
} 