import React, { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from "react-router-dom"
import { useSetAtom, useAtomValue } from "jotai"
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AppSidebar } from "./components/app-sidebar"
import { AIChatSidebar } from "./components/ai-chat-sidebar"
import { AIPage } from "./components/ai-page"
import { NoteEditor } from "./components/note-editor"
import { HomePage } from "./components/home-page"
import { useNotes } from "./hooks/use-notes"
import { DeployPage } from "./components/deploy-page"
import { PremiumPage } from "./components/premium-page"
import { ThemeToggle } from "./components/theme-toggle"
import { Settings, Globe, Share, Download, FileText, File, Menu, X, MoreVertical, LogOut, RefreshCw, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { PublishModal } from "./components/publish-modal"
import { PublishUpdateModal } from "./components/publish-update-modal"
import { WalletDirectModal } from "./components/wallet-direct-modal"
import { WalletDirectLogo } from "./components/wallet-direct-logo"
import { SettingsPage } from "./components/settings-page"
import { useIsMobile } from "./hooks/use-mobile"
import { isAuthenticatedAtom, loginAtom, userProfileAtom, userWorkspacesAtom, defaultWorkspaceAtom, setDefaultWorkspaceAtom, walletDirectConnectedAtom, aiSessionAtom } from "./store"
import { AuthPage } from "./components/signin-page"
import type { Notebook } from "@/types/notebook"
import { cn } from "@/lib/utils"
import { Identity } from "@dfinity/agent"
import { AuthClient } from "@dfinity/auth-client"
import { createActor as createDotaneActor, canisterId as dotaneCanisterId } from "@declarations/dotane_ic_backend"
import type { UserProfile, Workspace } from "./store"
import {Toaster} from "react-hot-toast"

// Main App Component with Router
export default function NoteApp() {
  return (
    <Router>
      <NoteAppContent />
    </Router>
  )
}

// Inner component that uses router hooks
function NoteAppContent() {
  const {
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
  } = useNotes()

  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const userProfile = useAtomValue(userProfileAtom)
  const userWorkspaces = useAtomValue(userWorkspacesAtom)
  const defaultWorkspace = useAtomValue(defaultWorkspaceAtom)
  const walletDirectConnected = useAtomValue(walletDirectConnectedAtom)

  const login = useSetAtom(loginAtom)
  const setDefaultWorkspace = useSetAtom(setDefaultWorkspaceAtom)
  const setAiSession = useSetAtom(aiSessionAtom)

  const [showPublish, setShowPublish] = useState(false)
  const [showPublishUpdate, setShowPublishUpdate] = useState(false)
  const [showWalletDirect, setShowWalletDirect] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiChatCollapsed, setAiChatCollapsed] = useState(true)
 

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [navigate, isMobile])

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote()
      // Navigate immediately after creating the note
      navigate(`/notes/${newNote.id}`)
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  const handleCreateNotebook = async () => {
    try {
      await createNotebook()
    } catch (error) {
      console.error('Error creating notebook:', error)
    }
  }

  const handleUpdateNotebook = async (notebookId: string, updates: Partial<Notebook>) => {
    try {
      await updateNotebook(notebookId, updates)
    } catch (error) {
      console.error('Error updating notebook:', error)
    }
  }

  const handleNoteSelect = (noteId: string) => {
    setActiveNoteId(noteId)
    navigate(`/notes/${noteId}`)
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId)
      navigate('/')
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const handleNotebookSelect = (notebookId: string) => {
    setSelectedNotebookId(selectedNotebookId === notebookId ? null : notebookId)
    navigate('/')
  }

  const handleLinkDomain = () => {
    navigate('/deploy')
  }

  const handlePremiumUpgrade = () => {
    navigate('/premium')
  }

  const handleBackToNotes = () => {
    navigate('/')
  }

  const handleHomeNavigation = () => {
    setActiveNoteId(null)
    setSelectedNotebookId(null)
    navigate('/')
  }

  const handleAINavigation = () => {
    setActiveNoteId(null)
    setSelectedNotebookId(null)
    navigate('/ai')
  }

  const handlePublish = () => {
    const activeNote = getActiveNote()
    if (activeNote?.is_published && activeNote?.publish_url) {
      // If note is published, show the update modal
      setShowPublishUpdate(true)
    } else {
      // If note is not published, show the regular publish modal
      setShowPublish(true)
    }
  }

  const handleSettings = () => {
    navigate('/settings')
  }

  const handleWalletDirect = () => {
    setShowWalletDirect(true)
  }

  const handleLogout = async () => {
    let client = await AuthClient.create()
    client.logout()
    navigate('/')
    window.location.reload()
  }



  const handleAuthenticated = async (identity?: Identity) => {
    if (!identity) {
      let client = await AuthClient.create()
      client.login(
        {
          identityProvider: process.env.NODE_ENV === "development" ? `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943` : "https://identity.ic0.app",
          onSuccess: async () => {
            identity = client.getIdentity()
            await handleLoginWithIdentity(identity)
          }
        }
      )
    } else {
      await handleLoginWithIdentity(identity)
    }
  }

  const handleLoginWithIdentity = async (identity: Identity) => {
    try {
      console.log('handleLoginWithIdentity', identity.getPrincipal().toString())
      // Create actor with the provided identity
      const dotaneActor = createDotaneActor(dotaneCanisterId, {
        agentOptions: {
          identity: identity,
          ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
        }
      })

      let session = await dotaneActor.create_session()
      console.log('Session:', session)
      
      // Store AI session in atom
      setAiSession(session)
      
      // Fetch user profile from backend
      const profileResult = await dotaneActor.get_my_profile()
      if ('Err' in profileResult) {
        throw new Error(`Failed to get user profile: ${profileResult.Err}`)
      }
      
      const userProfile: UserProfile = profileResult.Ok
      
      // Fetch workspaces from backend
      const backendWorkspaces = await dotaneActor.get_workspaces()
      
      // Convert backend workspace format to frontend format
      const workspaces: Workspace[] = backendWorkspaces.map(workspace => ({
        canister_id: workspace.canister_id,
        domain: Array.isArray(workspace.domain) ? workspace.domain[0] : workspace.domain
      }))
      
      // Pass all data to the login atom
      await login({
        identity,
        userProfile,
        workspaces
      })
      
    } catch (error) {
      console.error('Error during authentication:', error)
      // Handle error appropriately - you might want to show a toast or error message
    }
  }

  const handleStorageChange = async (canisterId: string) => {
    try {
      console.log('Changing storage to:', canisterId)
      await setDefaultWorkspace(canisterId)
      console.log('Storage preference updated and saved to IndexedDB:', canisterId)
      
      // Verify the preference was saved
      try {
        const { indexedDBService } = await import('./lib/indexeddb')
        const savedPreference = await indexedDBService.getPreference('defaultStorage')
        console.log('Verified saved preference:', savedPreference)
      } catch (error) {
        console.error('Error verifying saved preference:', error)
      }
    } catch (error) {
      console.error('Error updating storage preference:', error)
    }
  }

  const handleExport = (format: string) => {
    const activeNote = getActiveNote()
    if (!activeNote) {
      console.log("No active note to export")
      return
    }

    switch (format) {
      case "pdf":
        console.log("Exporting as PDF:", activeNote.title)
        // TODO: Implement PDF export
        break
      case "markdown":
        console.log("Exporting as Markdown:", activeNote.title)
        // TODO: Implement Markdown export
        break
      case "html":
        console.log("Exporting as HTML:", activeNote.title)
        // TODO: Implement HTML export
        break
      case "txt":
        console.log("Exporting as Text:", activeNote.title)
        // TODO: Implement Text export
        break
      case "docx":
        console.log("Exporting as Word:", activeNote.title)
        // TODO: Implement Word export
        break
      case "json":
        console.log("Exporting as JSON:", activeNote.title)
        // TODO: Implement JSON export
        break
      default:
        console.log("Unknown export format:", format)
    }
  }

  const activeNote = getActiveNote()

  const getHeaderTitle = () => {
    const pathname = window.location.pathname
    if (pathname === '/') {
      return "Dotane.io"
    } else if (pathname === '/ai') {
      return "AI Assistant"
    } else if (pathname === '/deploy') {
      return "Deploy Storage Canister"
    } else if (pathname === '/settings') {
      return "Settings"
    } else if (pathname.startsWith('/notes/')) {
      return activeNote ? activeNote.title || "Untitled" : "Dotane.io"
    }
    return "Dotane.io"
  }

  const showPublishButton = window.location.pathname.startsWith('/notes/') && activeNote

  // Show authentication page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage onBack={() => {}} onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <Toaster />
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-50 h-full bg-card border-r transition-transform duration-300 ease-in-out
        ${isMobile ? 'w-80 transform' : 'w-80'}
        ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        ${!isMobile ? 'block' : ''}
      `}>
        <AppSidebar
          notes={getFilteredNotes()}
          notebooks={notebooks}
          activeNoteId={activeNoteId}
          selectedNotebookId={selectedNotebookId}
          userProfile={userProfile}
          onNoteSelect={handleNoteSelect}
          onNotebookSelect={handleNotebookSelect}
          onCreateNote={handleCreateNote}
          onCreateNotebook={handleCreateNotebook}
          onUpdateNotebook={handleUpdateNotebook}
          onDeleteNote={handleDeleteNote}
          onLinkDomain={handleLinkDomain}
          onHomeNavigation={handleHomeNavigation}
          onAINavigation={handleAINavigation}
          onPremiumUpgrade={handlePremiumUpgrade}
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        aiChatCollapsed ? "pr-12" : "pr-96"
      )}>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            )}
            
            <span className="font-medium truncate">{getHeaderTitle()}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Publish Button - Only show when editing a note */}
              {showPublishButton && (
                <Button 
                  onClick={handlePublish} 
                  size="sm" 
                  className={
                    activeNote?.is_published 
                      ? "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20" 
                      : "bg-primary hover:bg-primary/90"
                  }
                  variant={activeNote?.is_published ? "outline" : "default"}
                >
                  {activeNote?.is_published ? (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  ) : (
                    <Share className="w-4 h-4 mr-2" />
                  )}
                  {activeNote?.is_published ? "Publish Update" : "Publish"}
                </Button>
              )}

              {/* Export Dropdown - Only show when editing a note */}
              {showPublishButton && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("markdown")}>
                      <File className="w-4 h-4 mr-2" />
                      Export as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("html")}>
                      <Globe className="w-4 h-4 mr-2" />
                      Export as HTML
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("txt")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export as Text
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport("docx")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export as Word
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("json")}>
                      <File className="w-4 h-4 mr-2" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Storage Selector */}
              <Select value={defaultWorkspace?.canister_id || ""} onValueChange={handleStorageChange}>
                <SelectTrigger className="w-48">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select storage" />
                </SelectTrigger>
                <SelectContent>
                  {userWorkspaces.map((workspace) => (
                    <SelectItem key={workspace.canister_id} value={workspace.canister_id}>
                      <div className="flex items-center gap-2">
                        <span>{workspace.domain || `https://${workspace.canister_id}.icp0.io`}</span>
                        {workspace.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* WalletDirect Button */}
              <Button 
                onClick={handleWalletDirect} 
                variant={walletDirectConnected ? "default" : "outline"} 
                size="sm"
                className={walletDirectConnected ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                <WalletDirectLogo className="w-4 h-4 mr-2" />
                {walletDirectConnected ? "Connected" : "WalletDirect"}
              </Button>
            </div>

            {/* AI Chat Toggle */}
            <Button 
              onClick={() => setAiChatCollapsed(!aiChatCollapsed)} 
              variant="ghost" 
              size="sm"
              className={aiChatCollapsed ? "bg-primary/10" : ""}
            >
              <Bot className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">A.I Chat</span>
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings Button */}
            <Button onClick={handleSettings} variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>

            {/* Logout Button */}
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>

            {/* Mobile Actions Menu */}
            {isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Publish Button for Mobile */}
                  {showPublishButton && (
                    <>
                      <DropdownMenuItem onClick={handlePublish}>
                        <Share className="w-4 h-4 mr-2" />
                        {activeNote?.is_published ? "Publish Update" : "Publish Note"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Export Options for Mobile */}
                  {showPublishButton && (
                    <>
                      <DropdownMenuItem onClick={() => handleExport("pdf")}>
                        <FileText className="w-4 h-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("markdown")}>
                        <File className="w-4 h-4 mr-2" />
                        Export as Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("html")}>
                        <Globe className="w-4 h-4 mr-2" />
                        Export as HTML
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("txt")}>
                        <FileText className="w-4 h-4 mr-2" />
                        Export as Text
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Storage Selector for Mobile */}
                  <div className="px-2 py-1.5">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Note Storage</label>
                    <Select value={defaultWorkspace?.canister_id || ""} onValueChange={handleStorageChange}>
                      <SelectTrigger className="w-full">
                        <Globe className="w-3 h-3 mr-2" />
                        <SelectValue placeholder="Select storage" />
                      </SelectTrigger>
                      <SelectContent>
                        {userWorkspaces.map((workspace) => (
                          <SelectItem key={workspace.canister_id} value={workspace.canister_id}>
                            <div className="flex items-center gap-2">
                              <span>{workspace.domain || `https://${workspace.canister_id}.icp0.io`}</span>
                              {workspace.isDefault && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Default</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DropdownMenuSeparator />

                  {/* AI Chat for Mobile */}
                  <DropdownMenuItem onClick={() => setAiChatCollapsed(!aiChatCollapsed)}>
                    <Bot className="w-4 h-4 mr-2" />
                    {aiChatCollapsed ? "Show A.I Chat" : "Hide A.I Chat"}
                  </DropdownMenuItem>

                  {/* WalletDirect for Mobile */}
                  <DropdownMenuItem onClick={handleWalletDirect}>
                    <WalletDirectLogo className="w-4 h-4 mr-2" />
                    {walletDirectConnected ? "WalletDirect (Connected)" : "WalletDirect"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Logout for Mobile */}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        
        {/* Routes */}
        <Routes>
          <Route path="/" element={
            <HomePage
              notes={notes}
              notebooks={notebooks}
              onNoteSelect={handleNoteSelect}
              onNotebookSelect={handleNotebookSelect}
              onNoteDelete={handleDeleteNote}
            />
          } />
          <Route path="/ai" element={
            <AIPage
              notes={notes}
              publicNotes={[]}
            />
          } />
          <Route path="/deploy" element={<DeployPage onBack={handleBackToNotes} />} />
                      <Route path="/premium" element={<PremiumPage onBack={handleBackToNotes} />} />
          <Route path="/settings" element={<SettingsPage onBack={handleBackToNotes} />} />
          <Route path="/notes/:noteId" element={<NoteEditorWrapper />} />
        </Routes>
      </div>
      
      {/* AI Chat Sidebar */}
      <AIChatSidebar
        notes={notes}
        isCollapsed={aiChatCollapsed}
        onToggleCollapse={() => setAiChatCollapsed(!aiChatCollapsed)}
      />

      {/* Modals */}
      <PublishModal open={showPublish} onOpenChange={setShowPublish} noteTitle={activeNote?.title} />
      <PublishUpdateModal 
        open={showPublishUpdate} 
        onOpenChange={setShowPublishUpdate} 
        noteTitle={activeNote?.title}
        publishedUrl={activeNote?.publish_url}
      />
      <WalletDirectModal open={showWalletDirect} onOpenChange={setShowWalletDirect} />
    </div>
  )
}

// Wrapper component for NoteEditor to handle route params
function NoteEditorWrapper() {
  const { noteId } = useParams<{ noteId: string }>()
  const { getActiveNote, updateNote, setActiveNoteId, notebooks } = useNotes()
  
  // Set the active note when the component mounts
  useEffect(() => {
    if (noteId) {
      setActiveNoteId(noteId)
    }
  }, [noteId, setActiveNoteId])
  
  const note = getActiveNote()
  
  return <NoteEditor note={note} notebooks={notebooks} onUpdateNote={updateNote} />
}
