
import { Search, Globe, MoreVertical, Copy, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DotaneLogo } from "./dotane-logo"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import type { Note } from "@/types/note"
import type { Notebook } from "@/types/notebook"
import { createActor as createDotaneActor, canisterId as dotaneCanisterId } from "@declarations/dotane_ic_backend"
import { toast } from "react-hot-toast"
import { AuthClient } from "@dfinity/auth-client"

interface HomePageProps {
  notes: Note[]
  notebooks: Notebook[]
  onNoteSelect: (noteId: string) => void
  onNotebookSelect: (notebookId: string) => void
  onNoteDelete?: (noteId: string, deletePublished?: boolean) => void
}

export function HomePage({ notes, notebooks, onNoteSelect, onNotebookSelect, onNoteDelete }: HomePageProps) {
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletePublishedCopy, setDeletePublishedCopy] = useState(false)

  const handleCopyLink = async (note: Note) => {
    if (note.is_published && note.publish_url) {
      try {
        await navigator.clipboard.writeText(note.publish_url)
        // You can add a toast notification here if you have a toast system
        console.log('Published URL copied to clipboard')
      } catch (error) {
        console.error('Failed to copy URL:', error)
      }
    } else {
      // Copy a local link or show a message that the note isn't published
      console.log('Note is not published yet')
    }
  }

  const handleDeleteClick = (note: Note) => {
    setNoteToDelete(note)
    setIsDeleteDialogOpen(true)
    // Reset checkbox state when opening dialog
    setDeletePublishedCopy(false)
  }

  const handleConfirmDelete = async () => {
    if(noteToDelete?.is_published && deletePublishedCopy) {
      let identity = (await AuthClient.create()).getIdentity()
      let actor = createDotaneActor(dotaneCanisterId, {
        agentOptions: {
          identity: identity,
          ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
        }
      })

      let unpublishResult = await toast.promise(actor.unpublish_note(noteToDelete.backendId!), {
        loading: "Unpublishing note...",
        success: "Note unpublished",
        error: "Failed to unpublish note"
      })

      if("Err" in unpublishResult) {
        console.error(unpublishResult)
        toast.error(unpublishResult.Err.toString())
      }
      
    }
    if (noteToDelete && onNoteDelete) {
      onNoteDelete(noteToDelete.id, deletePublishedCopy)
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

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <DotaneLogo className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold">Dotane.io</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8">
            Your decentralized note-taking platform powered by blockchain technology
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search notes and notebooks..." className="pl-10 h-12 text-lg" />
        </div>

        {/* My Notes Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">My Notes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notes.slice(0, 8).map((note) => (
              <div
                key={note.id}
                className="group cursor-pointer bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-primary/20 dark:hover:shadow-lg relative"
              >
                {/* Published Indicator */}
                {note.is_published && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                    <Globe className="w-3 h-3" />
                    <span>Published</span>
                  </div>
                )}

                {/* Menu Button */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-muted/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyLink(note)
                        }}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(note)
                        }}
                        className="flex items-center gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Card Content - Clickable Area */}
                <div onClick={() => onNoteSelect(note.id)} className="cursor-pointer">
                  <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg mb-4 flex items-center justify-center">
                    <div className="text-4xl opacity-20">📝</div>
                  </div>
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {note.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {note.content.slice(0, 100) || "No content"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">{note.updatedAt.toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Notebooks Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Notebooks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                onClick={() => onNotebookSelect(notebook.id)}
                className="group cursor-pointer bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-primary/20 dark:hover:shadow-lg"
              >
                <div className="w-full h-32 bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-4xl opacity-20">📚</div>
                </div>
                <h3 className="font-semibold text-sm mb-2 group-hover:text-primary transition-colors">
                  {notebook.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {notebook.noteCount} {notebook.noteCount === 1 ? "note" : "notes"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-3 h-3 rounded-full ${notebook.color}`} />
                  <span className="text-xs text-muted-foreground">
                    Updated {notebook.updatedAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

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
                  id="delete-published-home"
                  checked={deletePublishedCopy}
                  onCheckedChange={(checked) => setDeletePublishedCopy(checked as boolean)}
                />
                <Label htmlFor="delete-published-home" className="text-sm">
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
    </div>
  )
}
