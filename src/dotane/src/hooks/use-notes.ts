import { useAtomValue, useSetAtom } from "jotai"
import {
  notesAtom,
  notebooksAtom,
  activeNoteIdAtom,
  selectedNotebookIdAtom,
  activeNoteAtom,
  filteredNotesAtom,
  createNoteAtom,
  updateNoteAtom,
  deleteNoteAtom,
  setActiveNoteIdAtom,
  setSelectedNotebookIdAtom,
  createNotebookAtom,
  updateNotebookAtom,
  type Note,
  type Notebook
} from "../store"

export function useNotes() {
  // Atoms for reading state
  const notes = useAtomValue(notesAtom)
  const notebooks = useAtomValue(notebooksAtom)
  const activeNoteId = useAtomValue(activeNoteIdAtom)
  const selectedNotebookId = useAtomValue(selectedNotebookIdAtom)
  const activeNote = useAtomValue(activeNoteAtom)
  const filteredNotes = useAtomValue(filteredNotesAtom)

  // Atoms for writing state
  const createNoteAtomSetter = useSetAtom(createNoteAtom)
  const updateNoteAtomSetter = useSetAtom(updateNoteAtom)
  const deleteNoteAtomSetter = useSetAtom(deleteNoteAtom)
  const setActiveNoteId = useSetAtom(setActiveNoteIdAtom)
  const setSelectedNotebookId = useSetAtom(setSelectedNotebookIdAtom)
  const createNotebookAtomSetter = useSetAtom(createNotebookAtom)
  const updateNotebookAtomSetter = useSetAtom(updateNotebookAtom)

  // Helper functions that maintain the same interface
  const getActiveNote = () => activeNote

  const getFilteredNotes = () => filteredNotes

  // Wrapper functions to handle async operations
  const createNote = async () => {
    try {
      const newNote = await createNoteAtomSetter(selectedNotebookId)
      return newNote
    } catch (error) {
      console.error('Error creating note:', error)
      throw error
    }
  }

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      await updateNoteAtomSetter(id, updates)
    } catch (error) {
      console.error('Error updating note:', error)
      throw error
    }
  }

  const deleteNote = async (id: string) => {
    try {
      await deleteNoteAtomSetter(id)
    } catch (error) {
      console.error('Error deleting note:', error)
      throw error
    }
  }

  const createNotebook = async () => {
    try {
      const newNotebook = await createNotebookAtomSetter()
      return newNotebook
    } catch (error) {
      console.error('Error creating notebook:', error)
      throw error
    }
  }

  const updateNotebook = async (id: string, updates: Partial<Notebook>) => {
    try {
      await updateNotebookAtomSetter(id, updates)
    } catch (error) {
      console.error('Error updating notebook:', error)
      throw error
    }
  }

  return {
    notes,
    notebooks,
    activeNoteId,
    selectedNotebookId,
    setActiveNoteId,
    setSelectedNotebookId,
    createNote,
    createNotebook,
    updateNotebook,
    updateNote,
    deleteNote,
    getActiveNote,
    getFilteredNotes,
  }
}
