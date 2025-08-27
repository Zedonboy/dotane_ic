import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { indexedDBService } from '../lib/indexeddb'
import { useIndexedDB } from '../hooks/use-indexeddb'

export function DatabaseTest() {
  const { loadAllData, saveNote, saveNotebook, getDatabaseInfo, clearAllData } = useIndexedDB()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testResults, setTestResults] = useState<string[]>([])
  const [dbInfo, setDbInfo] = useState<{ notes: number; notebooks: number; lastSync: number } | null>(null)

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const runDatabaseTest = async () => {
    setTestStatus('testing')
    setTestResults([])
    
    try {
      addTestResult('Starting IndexedDB test...')
      
      // Test 1: Initialize database
      addTestResult('Initializing database...')
      await indexedDBService.initialize()
      addTestResult('✓ Database initialized successfully')
      
      // Test 2: Create test notebook
      addTestResult('Creating test notebook...')
      const testNotebook = {
        id: 'test-notebook-1',
        name: 'Test Notebook',
        color: 'bg-blue-500',
        noteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await indexedDBService.saveNotebook(testNotebook)
      addTestResult('✓ Test notebook saved')
      
      // Test 3: Create test note
      addTestResult('Creating test note...')
      const testNote = {
        id: 'test-note-1',
        title: 'Test Note',
        content: 'This is a test note for IndexedDB functionality.',
        createdAt: new Date(),
        updatedAt: new Date(),
        notebookId: 'test-notebook-1',
      }
      await indexedDBService.saveNote(testNote)
      addTestResult('✓ Test note saved')
      
      // Test 4: Test preferences
      addTestResult('Testing preferences...')
      await indexedDBService.savePreference('testPreference', 'testValue')
      const savedPreference = await indexedDBService.getPreference('testPreference')
      if (savedPreference === 'testValue') {
        addTestResult('✓ Preferences working correctly')
      } else {
        throw new Error('Preference test failed')
      }
      
      // Test 5: Retrieve data
      addTestResult('Retrieving saved data...')
      const [notes, notebooks] = await Promise.all([
        indexedDBService.getAllNotes(),
        indexedDBService.getAllNotebooks()
      ])
      addTestResult(`✓ Retrieved ${notes.length} notes and ${notebooks.length} notebooks`)
      
      // Test 6: Get database info
      addTestResult('Getting database info...')
      const info = await indexedDBService.getDatabaseInfo()
      setDbInfo(info)
      addTestResult(`✓ Database info: ${info.notes} notes, ${info.notebooks} notebooks`)
      
      // Test 7: Update note
      addTestResult('Updating test note...')
      const updatedNote = { ...testNote, title: 'Updated Test Note', content: 'This note has been updated.' }
      await indexedDBService.saveNote(updatedNote)
      addTestResult('✓ Test note updated')
      
      // Test 8: Delete test data
      addTestResult('Cleaning up test data...')
      await indexedDBService.deleteNote('test-note-1')
      await indexedDBService.deleteNotebook('test-notebook-1')
      await indexedDBService.deletePreference('testPreference')
      addTestResult('✓ Test data cleaned up')
      
      addTestResult('🎉 All tests passed! IndexedDB is working correctly.')
      setTestStatus('success')
      
    } catch (error) {
      addTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTestStatus('error')
    }
  }

  const loadCurrentData = async () => {
    try {
      const info = await getDatabaseInfo()
      setDbInfo(info)
      addTestResult(`Current data loaded: ${info.notes} notes, ${info.notebooks} notebooks`)
    } catch (error) {
      addTestResult(`Error loading current data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const clearDatabase = async () => {
    try {
      await clearAllData()
      setDbInfo({ notes: 0, notebooks: 0, lastSync: 0 })
      addTestResult('Database cleared successfully')
    } catch (error) {
      addTestResult(`Error clearing database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testStoragePreferences = async () => {
    try {
      addTestResult('Testing storage preferences...')
      
      // Test saving storage preference
      await indexedDBService.savePreference('defaultStorage', 'test-canister-id')
      addTestResult('✓ Storage preference saved')
      
      // Test retrieving storage preference
      const savedStorage = await indexedDBService.getPreference('defaultStorage')
      if (savedStorage === 'test-canister-id') {
        addTestResult('✓ Storage preference retrieved correctly')
      } else {
        throw new Error('Storage preference retrieval failed')
      }
      
      // Test updating storage preference
      await indexedDBService.savePreference('defaultStorage', 'updated-canister-id')
      const updatedStorage = await indexedDBService.getPreference('defaultStorage')
      if (updatedStorage === 'updated-canister-id') {
        addTestResult('✓ Storage preference updated correctly')
      } else {
        throw new Error('Storage preference update failed')
      }
      
      // Clean up
      await indexedDBService.deletePreference('defaultStorage')
      addTestResult('✓ Storage preference test completed successfully')
      
    } catch (error) {
      addTestResult(`❌ Storage preference test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const checkCurrentStoragePreference = async () => {
    try {
      const currentPreference = await indexedDBService.getPreference('defaultStorage')
      if (currentPreference) {
        addTestResult(`Current storage preference: ${currentPreference}`)
      } else {
        addTestResult('No storage preference found in IndexedDB')
      }
    } catch (error) {
      addTestResult(`Error checking storage preference: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const saveTestStoragePreference = async () => {
    try {
      await indexedDBService.savePreference('defaultStorage', 'personal-canister')
      addTestResult('Test storage preference saved: personal-canister')
    } catch (error) {
      addTestResult(`Error saving test preference: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const reloadPreferences = async () => {
    try {
      // This would need to be imported from the store, but for now we'll just check what's in IndexedDB
      const currentPreference = await indexedDBService.getPreference('defaultStorage')
      if (currentPreference) {
        addTestResult(`Reloaded preference from IndexedDB: ${currentPreference}`)
      } else {
        addTestResult('No preference found in IndexedDB')
      }
    } catch (error) {
      addTestResult(`Error reloading preferences: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const checkNoteBlocks = async () => {
    try {
      const notes = await indexedDBService.getAllNotes()
      addTestResult(`Found ${notes.length} notes in IndexedDB`)
      
      for (const note of notes) {
        const hasBlocksId = note.blocksId
        addTestResult(`Note (${note.title}): blocksId = ${hasBlocksId || 'undefined'}`)
        
        if (hasBlocksId) {
          const blocks = await indexedDBService.getBlocks(hasBlocksId)
          const blocksInfo = blocks ? `${blocks.length} blocks` : 'blocks not found'
          addTestResult(`  └─ Blocks: ${blocksInfo}`)
          
          if (blocks) {
            console.log(`Note ${note.title} blocks:`, blocks)
          }
        } else {
          addTestResult(`  └─ No blocksId assigned`)
        }
      }
    } catch (error) {
      addTestResult(`Error checking note blocks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            IndexedDB Test Panel
          </CardTitle>
          <CardDescription>
            Test IndexedDB functionality and view current database status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={runDatabaseTest}
              disabled={testStatus === 'testing'}
              variant="default"
            >
              {testStatus === 'testing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Database Test'
              )}
            </Button>
            <Button onClick={loadCurrentData} variant="outline">
              Load Current Data
            </Button>
            <Button onClick={testStoragePreferences} variant="outline">
              Test Storage Preferences
            </Button>
            <Button onClick={checkCurrentStoragePreference} variant="outline">
              Check Storage Preference
            </Button>
            <Button onClick={saveTestStoragePreference} variant="outline">
              Save Test Preference
            </Button>
            <Button onClick={reloadPreferences} variant="outline">
              Reload Preferences
            </Button>
            <Button onClick={checkNoteBlocks} variant="outline">
              Check Note Blocks
            </Button>
            <Button onClick={clearDatabase} variant="destructive">
              Clear Database
            </Button>
          </div>

          {testStatus !== 'idle' && (
            <div className="flex items-center gap-2">
              {testStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
              {testStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
              <span className="text-sm font-medium">
                {testStatus === 'testing' && 'Running tests...'}
                {testStatus === 'success' && 'Tests completed successfully'}
                {testStatus === 'error' && 'Tests failed'}
              </span>
            </div>
          )}

          {dbInfo && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Database Status:</h4>
              <div className="flex gap-2">
                <Badge variant="outline">Notes: {dbInfo.notes}</Badge>
                <Badge variant="outline">Notebooks: {dbInfo.notebooks}</Badge>
                <Badge variant="outline">Blocks: {dbInfo.blocks}</Badge>
                <Badge variant="outline">
                  Last Sync: {dbInfo.lastSync > 0 ? new Date(dbInfo.lastSync).toLocaleTimeString() : 'Never'}
                </Badge>
              </div>
            </div>
          )}

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Test Results:</h4>
              <div className="bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-xs font-mono">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 