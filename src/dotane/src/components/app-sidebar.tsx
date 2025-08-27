// @ts-nocheck
import { useState, useRef, useEffect } from "react"
import { Plus, Search, Trash2, ChevronDown, ChevronUp, Home, Crown, Edit2, Check, X, Info, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WalletDirectLogo } from "./wallet-direct-logo"
import { DotaneLogo } from "./dotane-logo"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Note } from "@/types/note"
import type { Notebook } from "@/types/notebook"
import type { UserProfile } from "../store"

interface AppSidebarProps {
  notes: Note[]
  notebooks: Notebook[]
  activeNoteId: string | null
  selectedNotebookId?: string | null
  userProfile?: UserProfile | null
  onNoteSelect: (noteId: string) => void
  onNotebookSelect?: (notebookId: string) => void
  onCreateNote: () => void
  onCreateNotebook?: () => void
  onUpdateNotebook?: (notebookId: string, updates: Partial<Notebook>) => void
  onDeleteNote: (noteId: string, deletePublished?: boolean) => void
  onLinkDomain: () => void
  onHomeNavigation: () => void
  onPremiumUpgrade?: () => void
  onAINavigation?: () => void
}

export function AppSidebar({
  notes,
  notebooks,
  activeNoteId,
  selectedNotebookId,
  userProfile,
  onNoteSelect,
  onNotebookSelect,
  onCreateNote,
  onCreateNotebook,
  onUpdateNotebook,
  onDeleteNote,
  onLinkDomain,
  onHomeNavigation,
  onAINavigation,
  onPremiumUpgrade,
}: AppSidebarProps) {
  const [isAllNotesExpanded, setIsAllNotesExpanded] = useState(false)
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletePublishedCopy, setDeletePublishedCopy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleLinkDomain = () => {
    onLinkDomain()
  }

  const handlePremiumUpgrade = () => {
    onPremiumUpgrade?.()
  }

  const handleCreateNotebook = () => {
    onCreateNotebook?.()
  }

  const handleStartEditing = (notebook: Notebook) => {
    setEditingNotebookId(notebook.id)
    setEditingName(notebook.name)
  }

  const handleSaveEdit = () => {
    if (editingNotebookId && editingName.trim()) {
      onUpdateNotebook?.(editingNotebookId, { name: editingName.trim() })
      setEditingNotebookId(null)
      setEditingName("")
    }
  }

  const handleCancelEdit = () => {
    setEditingNotebookId(null)
    setEditingName("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  const handleDeleteClick = (note: Note) => {
    setNoteToDelete(note)
    setIsDeleteDialogOpen(true)
    // Reset checkbox state when opening dialog
    setDeletePublishedCopy(false)
  }

  const handleConfirmDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete.id, deletePublishedCopy)
    }
    setIsDeleteDialogOpen(false)
    setNoteToDelete(null)
    setDeletePublishedCopy(false)
  }

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setNoteToDelete(null)
    setDeletePublishedCopy(false)
  }

  const handleAINavigation = () => {
    onAINavigation?.()
  }

  // Focus input when editing starts
  useEffect(() => {
    if (editingNotebookId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingNotebookId])

  const toggleAllNotes = () => {
    setIsAllNotesExpanded(!isAllNotesExpanded)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={onHomeNavigation}>
          <DotaneLogo className="w-6 h-6 text-primary" />
          <span className="font-semibold">Dotane.io</span>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search notes..." className="pl-8" />
        </div>

        <Button onClick={onCreateNote} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Home Navigation */}
        <div className="mb-6">
          <button
            onClick={onHomeNavigation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent text-foreground"
          >
            <Home className="w-4 h-4" />
            <span className="flex-1 text-left">Home</span>
          </button>
        </div>

        {/* AI Navigation */}
        <div className="mb-6">
          <button
            onClick={handleAINavigation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent text-foreground"
          >
            <Bot className="w-4 h-4" />
            <span className="flex-1 text-left">A.I Chat</span>
          </button>
        </div>

        {/* Notebooks Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Notebooks</h3>
            <button
              onClick={handleCreateNotebook}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="Create new notebook"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-1">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className={`group relative flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent ${
                  selectedNotebookId === notebook.id ? "bg-accent text-accent-foreground" : "text-foreground"
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${notebook.color}`} />
                
                {editingNotebookId === notebook.id ? (
                  // Editing mode
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      ref={inputRef}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="h-6 text-sm border-none bg-transparent p-0 focus-visible:ring-0"
                      onBlur={handleSaveEdit}
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 hover:bg-accent rounded transition-colors"
                    >
                      <Check className="w-3 h-3 text-green-500" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 hover:bg-accent rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ) : (
                  // View mode
                  <>
                    <button
                      onClick={() => onNotebookSelect?.(notebook.id)}
                      className="flex-1 text-left"
                    >
                      {notebook.name}
                    </button>
                    <span className="text-xs text-muted-foreground">{notebook.noteCount}</span>
                    <button
                      onClick={() => handleStartEditing(notebook)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* All Notes Section */}
        <div className="mb-6">
          <button
            onClick={toggleAllNotes}
            className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground mb-3 hover:text-foreground transition-colors"
          >
            <span>All Notes ({notes.length})</span>
            {isAllNotesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isAllNotesExpanded && (
            <div className="space-y-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`group relative flex flex-col p-3 rounded-md cursor-pointer transition-colors hover:bg-accent ${
                    activeNoteId === note.id ? "bg-accent text-accent-foreground" : "text-foreground"
                  }`}
                  onClick={() => onNoteSelect(note.id)}
                >
                  <span className="font-medium truncate text-sm">{note.title || "Untitled"}</span>
                  <span className="text-xs text-muted-foreground truncate mt-1">
                    {note.content.slice(0, 50) || "No content"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(note)
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notes Section - Limited to 5 */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Notes</h3>
          <div className="space-y-1">
            {notes.slice(0, 5).map((note) => (
              <div
                key={note.id}
                className={`group relative flex flex-col p-3 rounded-md cursor-pointer transition-colors hover:bg-accent ${
                  activeNoteId === note.id ? "bg-accent text-accent-foreground" : "text-foreground"
                }`}
                onClick={() => onNoteSelect(note.id)}
              >
                <span className="font-medium truncate text-sm">{note.title || "Untitled"}</span>
                <span className="text-xs text-muted-foreground truncate mt-1">
                  {note.content.slice(0, 50) || "No content"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(note)
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with Link Domain Button */}
      <div className="border-t p-4 space-y-3">
        {/* Premium Upgrade Button - Only show if user is not premium */}
        {!userProfile?.premium && (
          <Button onClick={handlePremiumUpgrade} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white" size="sm">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
        )}
        
        <div className="flex items-center gap-2">
          <Button onClick={handleLinkDomain} variant="outline" className="flex-1 bg-transparent" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Workspace
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                <Info className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">Personal Workspace</p>
                <p className="text-sm">
                  Create your own workspace on the Internet Computer blockchain where your notes, media, and other assets are securely stored and accessible via your custom domain or the default URL.
                </p>
                <p className="text-xs text-muted-foreground">
                  Your workspace is decentralized, censorship-resistant, and under your complete control.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground text-center">Deploy storage canister & connect your domain</p>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noteToDelete?.title || 'Untitled'}"? This action cannot be undone and the note will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Published Copy Checkbox */}
          {noteToDelete?.is_published && (
            <div className="flex items-center space-x-2 py-4 border-t">
              <Checkbox
                id="delete-published-sidebar"
                checked={deletePublishedCopy}
                onCheckedChange={(checked) => setDeletePublishedCopy(checked as boolean)}
              />
              <Label htmlFor="delete-published-sidebar" className="text-sm">
                Also delete the published copy from the web
              </Label>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
