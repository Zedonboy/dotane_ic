# IndexedDB Implementation for Dotane Notes App

This document describes the IndexedDB implementation that provides persistent local storage for notes and notebooks in the Dotane notes application.

## Overview

The IndexedDB implementation consists of three main components:

1. **IndexedDB Service** (`src/lib/indexeddb.ts`) - Core database operations
2. **IndexedDB Hook** (`src/hooks/use-indexeddb.ts`) - React hook for database operations
3. **Store Integration** (`src/store.ts`) - Jotai atoms with IndexedDB persistence

## Database Schema

The IndexedDB database (`DotaneNotesDB`) contains three object stores:

### 1. Notes Store (`notes`)
- **Key**: `id` (string)
- **Indexes**:
  - `notebookId` - for filtering notes by notebook
  - `createdAt` - for sorting by creation date
  - `updatedAt` - for sorting by last modified date

### 2. Notebooks Store (`notebooks`)
- **Key**: `id` (string)
- **Indexes**:
  - `createdAt` - for sorting by creation date
  - `updatedAt` - for sorting by last modified date

### 3. Sync Metadata Store (`sync`)
- **Key**: `id` (string)
- Stores sync timestamps and version information

### 4. Preferences Store (`preferences`)
- **Key**: `id` (string)
- Stores user preferences including default storage selection
- Includes `updatedAt` timestamp for each preference

## Features

### Automatic Persistence
- All note and notebook operations automatically save to IndexedDB
- Data persists across browser sessions
- Automatic sync metadata tracking

### Data Loading
- On login, data is loaded from IndexedDB if available
- Falls back to mock data if IndexedDB is empty
- Mock data is saved to IndexedDB for future use
- User preferences (including default storage) are loaded and applied

### Data Cleanup
- All data is cleared from IndexedDB on logout
- Individual note/notebook deletion removes from IndexedDB
- Batch operations for efficient data management

### Error Handling
- Graceful fallbacks when IndexedDB operations fail
- Console logging for debugging
- No blocking of UI when database operations fail

## Usage

### Basic Operations

```typescript
import { useIndexedDB } from '@/hooks/use-indexeddb'

function MyComponent() {
  const { 
    loadAllData, 
    saveNote, 
    saveNotebook, 
    getDatabaseInfo,
    clearAllData 
  } = useIndexedDB()

  // Load all data from IndexedDB
  const handleLoadData = async () => {
    const { notes, notebooks } = await loadAllData()
    console.log(`Loaded ${notes.length} notes and ${notebooks.length} notebooks`)
  }

  // Get database statistics
  const handleGetInfo = async () => {
    const info = await getDatabaseInfo()
    console.log('Database info:', info)
  }
}
```

### Store Integration

The Jotai store automatically handles IndexedDB persistence:

```typescript
import { useNotes } from '@/hooks/use-notes'

function NoteComponent() {
  const { createNote, updateNote, deleteNote } = useNotes()

  // These operations automatically save to IndexedDB
  const handleCreate = async () => {
    const newNote = await createNote()
    // Note is automatically saved to IndexedDB
  }

  const handleUpdate = async (id: string) => {
    await updateNote(id, { title: 'Updated Title' })
    // Changes are automatically saved to IndexedDB
  }
}
```

### Storage Preferences

Storage preferences are automatically saved and loaded:

```typescript
import { useSetAtom } from 'jotai'
import { setDefaultStorageAtom } from '@/store'

function StorageSelector() {
  const setDefaultStorage = useSetAtom(setDefaultStorageAtom)

  const handleStorageChange = async (canisterId: string) => {
    await setDefaultStorage(canisterId)
    // Preference is automatically saved to IndexedDB
    // and will be restored on next login
  }
}
```

## Testing

A test component is available in the Settings page under the "Database" tab:

- **Run Database Test**: Comprehensive test of all IndexedDB operations
- **Test Storage Preferences**: Specific test for storage preference functionality
- **Load Current Data**: Display current database statistics
- **Clear Database**: Remove all data from IndexedDB

## Database Info Display

The Settings page shows:
- Total number of notes and notebooks
- Last sync timestamp
- Manual sync button to force data persistence

## Error Recovery

If IndexedDB operations fail:
1. Operations continue with in-memory state
2. Errors are logged to console
3. UI remains responsive
4. Data can be manually synced later

## Browser Compatibility

IndexedDB is supported in all modern browsers:
- Chrome 23+
- Firefox 16+
- Safari 10+
- Edge 12+

## Performance Considerations

- IndexedDB operations are asynchronous and non-blocking
- Batch operations are used for efficiency
- Database connections are managed as singletons
- Automatic cleanup prevents memory leaks

## Future Enhancements

Potential improvements:
- Data compression for large notes
- Incremental sync with cloud storage
- Conflict resolution for offline/online sync
- Data export/import functionality
- Backup and restore features 