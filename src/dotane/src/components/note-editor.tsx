// @ts-nocheck
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { 
  Cloud, 
  Lock, 
  Crown, 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  Image, 
  Video, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Code, 
  Hash, 
  Table, 
  Minus,
  ListOrderedIcon,
  ListTodo,
  LucideList,
  File as LucideFile,
  ScanFace,
  Smile
} from "lucide-react"
import type { Note } from "@/types/note"
import type { Notebook } from "@/types/notebook"
import { currentWorkspaceAtom, userProfileAtom, loadBlocksAtom, updateNoteBlocksAtom, authIdentityAtom, markNoteAsPublishedAtom, syncNoteWithBackendAtom, updateNotebookCountsAtom } from "../store"
import "@blocknote/core/fonts/inter.css";
import { 
  DragHandleButton, 
  SideMenu, 
  SideMenuController, 
  SuggestionMenuController,
  SuggestionMenuProps,
  DefaultReactSuggestionItem,
  useBlockNoteEditor,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs, PartialBlock } from "@blocknote/core";
import { createActor as createDotaneActor, canisterId as dotaneCanisterId } from "@declarations/dotane_ic_backend"
import {createActor as createStorageActor} from "@declarations/dotane_user_storage"

import { Plus, FileAudio } from "lucide-react"
// import { ActorSubclass } from "@dfinity/agent"
// import { _SERVICE as DotaneService } from "@declarations/dotane_ic_backend/dotane_ic_backend.did"
import { MermaidBlock, insertMermaid } from "@packages/blocknote-mermaid/lib";
import { CodeBlock, insertCode } from "@packages/blocknote-code/lib";
import { insertDraw, Draw } from "@packages/blocknote-draw/src";
import toast from "react-hot-toast"
import {AssetManager} from "@dfinity/assets"
import { ASSETS_CANISTER_ID } from "@/lib/config"
import { createAgent } from "@dfinity/utils"

// Custom suggestion item type
type DefaultSuggestionItem = {
  title: string;
  onItemClick: () => void;
  subtext?: string;
  badge?: string;
  aliases?: string[];
  group?: string;
};

interface NoteEditorProps {
  note: Note | null
  notebooks: Notebook[]
  onUpdateNote: (id: string, updates: Partial<Note>) => void
}

const premiumFeatures = ['image', 'video', "audio", "file"]

// Custom Slash Menu component with categorized items
function CustomSlashMenu(
  props: SuggestionMenuProps<DefaultReactSuggestionItem>,
) {

  let prop_items = [...props.items, insertMermaid(), insertCode()]
  // Group items by their group attribute
  const groupedItems = prop_items.reduce((acc, item, index) => {
    const group = item.group || "Other";
    if (!acc[group]) {
      acc[group] = [];
    }
    // @ts-ignore
    acc[group].push({ ...item, originalIndex: index });
    return acc;
  }, {} as Record<string, Array<DefaultSuggestionItem & { originalIndex: number }>>);

  // Check if an item is premium
  const isPremiumItem = (item: DefaultSuggestionItem) => {
    return premiumFeatures.includes(item.title.toLowerCase()) || 
           premiumFeatures.includes(item.badge?.toLowerCase() || '');
  };

  // Function to get the appropriate icon component
  const getIconComponent = (badge: string) => {
    
    const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
      'Type': Type,
      'Heading 1': Heading1,
      'Heading 2': Heading2,
      'Heading 3': Heading3,
      'Quote': Quote,
      'Image': Image,
      'Video': Video,
      "Audio": FileAudio,
      'Toggle List': List,
      "Numbered List": ListOrderedIcon,
      "Check List": ListTodo,
      'ListOrdered': ListOrdered,
      "Bullet List": LucideList,
      'CheckSquare': CheckSquare,
      'Code Block': Code,
      "Code": Code,
      "Emoji": Smile,
      "File": LucideFile,
      'Hash': Hash,
      'Table': Table,
      'Minus': Minus,
      'Plus': Plus
    };
    
    return iconMap[badge] || Type; // Default to Type icon
  };

  return (
    <div className="slash-menu bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-2xl p-3 max-h-96 overflow-y-auto min-w-[320px] max-w-[420px]">
      {Object.entries(groupedItems).map(([groupName, items]) => (
        <div key={groupName} className="mb-3 last:mb-0">
          {/* Group Header */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-2 border-b border-border/30">
            {groupName}
          </div>
          
          {/* Group Items */}
          <div className="space-y-1">
            {items.map((item) => {
              const isSelected = props.selectedIndex === item.originalIndex;
              const IconComponent = getIconComponent(item.title || 'Type');
              const isPremium = isPremiumItem(item);
              
              return (
                <div
                  key={item.originalIndex}
                  className={`slash-menu-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                      : "hover:bg-muted/50 hover:border-border/50 border border-transparent"
                  }`}
                  onClick={() => {
                    props.onItemClick?.(item);
                  }}
                >
                  {/* Item Icon */}
                  <div className={`w-8 h-8 flex items-center justify-center rounded-md relative ${
                    isSelected 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted/50 text-muted-foreground"
                  }`}>
                    <IconComponent size={16} />
                    {/* Premium Crown */}
                    {isPremium && (
                      <Crown 
                        size={10} 
                        className={`absolute -top-1 -right-1 ${
                          isSelected ? "text-primary" : "text-yellow-500"
                        }`}
                      />
                    )}
                  </div>
                  
                  {/* Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm truncate flex items-center gap-1 ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}>
                      {item.title}
                      {isPremium && (
                        <Crown 
                          size={12} 
                          className={isSelected ? "text-primary" : "text-yellow-500"}
                        />
                      )}
                    </div>
                    {item.subtext && (
                      <div className={`text-xs truncate mt-0.5 ${
                        isSelected ? "text-primary/70" : "text-muted-foreground"
                      }`}>
                        {item.subtext}
                      </div>
                    )}
                  </div>
                  
                  {/* Aliases (if any) */}
                  {item.aliases && item.aliases.length > 0 && (
                    <div className={`text-xs px-2 py-1 rounded-md hidden sm:block ${
                      isSelected 
                        ? "bg-primary/10 text-primary/70" 
                        : "bg-muted/30 text-muted-foreground/60"
                    }`}>
                      {item.aliases[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BigPlusButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/20 transition w-14 h-14 shadow-lg"
      style={{ fontSize: 32, lineHeight: 0 }}
      aria-label="Add"
    >
      <Plus className="text-primary-foreground dark:text-white" size={32} />
    </button>
  )
}


// Uploads a file to tmpfiles.org and returns the URL to the uploaded file.

export function NoteEditor({ note, notebooks, onUpdateNote }: NoteEditorProps) {
  const [title, setTitle] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [initialBlocks, setInitialBlocks] = useState<PartialBlock[] | undefined | "loading">("loading")
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [isSavingBlocks, setIsSavingBlocks] = useState(false)
  const currentNoteIdRef = useRef<string | null>(null)
  const identity = useAtomValue(authIdentityAtom)
    
  // Jotai atoms
  const currentWorkspace = useAtomValue(currentWorkspaceAtom)
  const [isWorkspacePremium, setIsWorkspacePremium] = useState(false)
  const userProfile = useAtomValue(userProfileAtom)
 
  const loadBlocks = useSetAtom(loadBlocksAtom)
  const updateNoteBlocks = useSetAtom(updateNoteBlocksAtom)
  const markAsPublished = useSetAtom(markNoteAsPublishedAtom)
  const syncNote = useSetAtom(syncNoteWithBackendAtom)
  const updateNotebookCounts = useSetAtom(updateNotebookCountsAtom)

  async function uploadFile(file: File) {
    console.log("Uploading file: ", file)
    let rnd = window.crypto.randomUUID()
    let newName = `${rnd}-${file.name.replace(/ /g, "_")}`
    // Change the file name
    const renamedFile = new File([file], newName, {
      type: file.type,
      lastModified: file.lastModified
    })

    console.log("Renamed file: ", renamedFile)
    
    let agent = await createAgent({
      identity,
      ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
    })
    if (process.env.DFX_NETWORK === "local") {
      console.log("Fetching root key")
      await agent.fetchRootKey()
    }
    console.log("Agent: ", agent)
    let assetManager = new AssetManager({
      canisterId: ASSETS_CANISTER_ID,
      agent,
    })
    console.log("AssetManager: ", assetManager)
    try {
      // Use renamedFile instead of file
      let upload_result = await assetManager.store(renamedFile)
      
      let url = null
      if (process.env.DFX_NETWORK === "local") {
        url = `http://${ASSETS_CANISTER_ID}.localhost:4943${upload_result}`
      } else {
        url = `https://${ASSETS_CANISTER_ID}.icp0.io${upload_result}`
      }
      console.log("Uploaded file URL: ", url)
      return url
    } catch (error) {
      console.error("Error uploading file: ", error)
      throw error
    }
    
    
  }
  

  const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // alert: Alert,
    // draw: Draw,
    mermaid: MermaidBlock,
    procode: CodeBlock,
  },
});

  const editor = useMemo(() => {
    if (initialBlocks === "loading") {
      return undefined;
    }
    
    // Only recreate editor if note has actually changed
    if (currentNoteIdRef.current !== note?.id) {
      currentNoteIdRef.current = note?.id || null;
      console.log('Creating new editor for note:', note?.id);
    }
    
    return BlockNoteEditor.create({ 
      initialContent: initialBlocks || undefined,

      schema,
      ...( isWorkspacePremium? {uploadFile: uploadFile} : {uploadFile: undefined}),
    });
  }, [initialBlocks, note?.id, isWorkspacePremium]);
  
  // Publish function - you can implement this later
  const handlePublish = useCallback(async (accessType: "Public" | "RestrictedAccess") => {
    console.log('Publish event received with access type:', accessType)
    console.log('Current note:', note)
    console.log('Current editor:', editor)
    
    // Check if editor is available
    if (!editor) {
      console.error('Editor is not available for publishing')
      toast.error('Editor is not ready. Please try again.')
      return
    }
    
    try {
      // 1. Get the current note content from editor
      const html_content = await editor.blocksToFullHTML(editor.document)
      
      // 2. Prepare the publish data
      const publishPayload = {
        noteId: note?.id,
        title: note?.title,
        content: html_content,
        workspace: currentWorkspace,
        accessType,
        // Add any other data you need
      }

      // let result;
      let publishedUrl: string

      if (currentWorkspace?.canister_id === dotaneCanisterId) {
        let dotaneActor = createDotaneActor(dotaneCanisterId, {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        console.log("Publishing note to dotane: ", note!.title, html_content!)

        let result = await toast.promise(dotaneActor.publish_note(note!.title, html_content!, {Public: null}), {
          loading: "Publishing note...",
          success: "Note published successfully!",
          // error: "Failed to publish note. Please try again."
        })

        if ("Ok" in result) {
          let publishedNote = result.Ok
          let slug = publishedNote.id;
          publishedUrl = `https://notes.dotane.io/${slug}`
          
          // Mark note as published in the store
          await markAsPublished(note!.id, publishedUrl, currentWorkspace?.canister_id)
          
          // If this is the first time syncing, also sync the note
          if (!note?.synced) {
            await syncNote(note!.id, publishedNote.id)
          }

        const resultEvent = new CustomEvent('note-publish-result', {
          detail: {
            success: true,
            url: publishedUrl
          }
        })
        window.dispatchEvent(resultEvent)
        } else {
          toast.error(result.Err)
          throw new Error("Failed to publish with "+result.Err)
        }
      } else {
        let storageActor = createStorageActor(currentWorkspace?.canister_id || "", {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        console.log('Publishing note to storage: ', note!.title, html_content!)

        let result = await toast.promise(storageActor.publish_note(note!.title, html_content!, {Public: null}), {
          loading: "Publishing note...",
          success: "Note published successfully!",
          // error: "Failed to publish note. Please try again."
        })

        if ("Ok" in result) {
          let publishedNote = result.Ok
          let slug = publishedNote.id;
          publishedUrl = `https://${currentWorkspace?.domain || currentWorkspace?.canister_id}.icp0.io/${slug}`
          
          // Mark note as published in the store
          await markAsPublished(note!.id, publishedUrl, currentWorkspace?.canister_id)
          
          // If this is the first time syncing, also sync the note
          if (!note?.synced) {
            await syncNote(note!.id, publishedNote.id)
          }

          const resultEvent = new CustomEvent('note-publish-result', {
            detail: {
              success: true,
              url: publishedUrl
            }
          })
          window.dispatchEvent(resultEvent)

        } else {
          toast.error(result.Err)
          throw new Error("Failed to publish with "+result.Err)
        }
        
      }
      
      // 4. Return success result
     
      
      console.log('Note published successfully:', publishPayload)
      
    } catch (error) {
      console.error('Failed to publish note:', error)
      
      // Return error result
      const resultEvent = new CustomEvent('note-publish-result', {
        detail: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      })
      window.dispatchEvent(resultEvent)
    }
  }, [editor, note, currentWorkspace, identity, markAsPublished, syncNote])
  
  // Handler for updating published notes
  const handleUpdatePublishedNote = useCallback(async () => {
    console.log('Update published note event received')
    console.log('Current note:', note)
    console.log('Current editor:', editor)
    
    // Check if editor is available
    if (!editor) {
      console.error('Editor is not available for updating')
      toast.error('Editor is not ready. Please try again.')
      return
    }
    
    try {
      // 1. Get the current note content from editor
      const html_content = await editor.blocksToFullHTML(editor.document)
      
      // 2. Update the published note
      let result;

      if (currentWorkspace?.canister_id === dotaneCanisterId) {
        let dotaneActor = createDotaneActor(dotaneCanisterId, {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        console.log("Updating published note in dotane: ", note!.title, html_content!)

        result = await toast.promise(dotaneActor.update_note(note!.backendId!, html_content!), {
          loading: "Updating published note...",
          success: "Note updated successfully!",
          error: "Failed to update note. Please try again."
        })

      } else {
        let storageActor = createStorageActor(currentWorkspace?.canister_id || "", {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        console.log('Updating published note in storage: ', note!.title, html_content!)

        result = await toast.promise(storageActor.update_note(note!.backendId!, html_content!), {
          loading: "Updating published note...",
          success: "Note updated successfully!",
          error: "Failed to update note. Please try again."
        })
      }
      
      // 3. Return success result
      const resultEvent = new CustomEvent('note-update-result', {
        detail: {
          success: true
        }
      })
      window.dispatchEvent(resultEvent)
      
      console.log('Note updated successfully')
      
    } catch (error) {
      console.error('Failed to update note:', error)
      
      // Return error result
      const resultEvent = new CustomEvent('note-update-result', {
        detail: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      })
      window.dispatchEvent(resultEvent)
    }
  }, [editor, note, currentWorkspace, identity])
  
  // Listen for publish events
  useEffect(() => {
    const handlePublishEvent = (event: CustomEvent) => {
      if (event.type === 'note-publish') {
        const { accessType } = event.detail
        handlePublish(accessType)
      }
    }
    
    const handleUpdateEvent = (event: CustomEvent) => {
      if (event.type === 'note-update') {
        handleUpdatePublishedNote()
      }
    }
    
    window.addEventListener('note-publish', handlePublishEvent as EventListener)
    window.addEventListener('note-update', handleUpdateEvent as EventListener)
    
    return () => {
      window.removeEventListener('note-publish', handlePublishEvent as EventListener)
      window.removeEventListener('note-update', handleUpdateEvent as EventListener)
    }
  }, [handlePublish, handleUpdatePublishedNote])
  
  // Load blocks when note changes
  useEffect(() => {
    console.log('Note changed:', note?.id, 'blocksId:', note?.blocksId)
    if (note?.blocksId) {
      setInitialBlocks("loading")
      loadBlocks(note.blocksId).then((loadedBlocks) => {
        console.log('Blocks loaded for note:', note.id, 'blocks:', loadedBlocks)
        if (loadedBlocks) {
          setInitialBlocks(loadedBlocks)
        } else {
          setInitialBlocks(undefined)
        }
      }).catch((error) => {
        console.error('Error loading blocks for note:', note.id, error)
        setInitialBlocks(undefined)
      })
    } else {
      console.log('No blocksId for note:', note?.id, 'setting empty blocks')
      setInitialBlocks(undefined)
    }
  }, [note?.blocksId, loadBlocks])

  useEffect(() => {
    let task = async () => {
      if (currentWorkspace?.canister_id === dotaneCanisterId) {
        let dotaneActor = createDotaneActor(dotaneCanisterId, {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })
        let isWorkspacePremium = await dotaneActor.is_workspace_premium_user()
        setIsWorkspacePremium(isWorkspacePremium)
      } else {
        let storageActor = createStorageActor(currentWorkspace?.canister_id || "", {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        let isWorkspacePremium = await storageActor.is_workspace_premium_user()
        setIsWorkspacePremium(isWorkspacePremium)
      }
    }
    task()
  }, [identity, currentWorkspace])

  // Creates a new editor instance using useMemo + BlockNoteEditor.create
  // This allows us to delay the creation of the editor until the initial content is loaded
 

  // Set up change handler
  

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      // setContent(note.content)
    } else {
      setTitle("")
     
    }
  }, [note])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (note) {
      onUpdateNote(note.id, { title: value })
    }
  }

  // const handleContentChange = (value: string) => {
  //   setContent(value)
  //   if (note) {
  //     onUpdateNote(note.id, { content: value })
  //   }
  // }

  const handleNotebookChange = async (notebookId: string) => {
    if (note) {
      const oldNotebookId = note.notebookId
      const newNotebookId = notebookId === "none" ? undefined : notebookId
      
      // Update the note's notebook assignment
      onUpdateNote(note.id, { notebookId: newNotebookId })
      
      // Immediately update notebook counts
      await updateNotebookCounts(note.id, newNotebookId, oldNotebookId)
    }
  }

  // Function specifically for updating published notes
  const updateNoteToCloud = async () => {
    if (!note || !currentWorkspace) return

    // Update Note functionality should be available for everyone
    // Premium check removed as requested

    setIsSaving(true)
    try {
      let html_content = await editor?.blocksToFullHTML(editor?.document)
      // let block_str = JSON.stringify(editor?.document)

      if (currentWorkspace.canister_id === dotaneCanisterId) {
        let dotaneActor = createDotaneActor(dotaneCanisterId, {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        // Update published note
        console.log('Updating published note with backendId:', note.backendId)
        let result = await toast.promise(dotaneActor.update_note(note.backendId!, html_content!), {
          loading: "Updating note...",
          success: "Note updated successfully!",
          error: "Failed to update note. Please try again."
        })
        console.log('Note updated:', result)
      } else {
        let storageActor = createStorageActor(currentWorkspace.canister_id, {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        // Update published note
        console.log('Updating published note with backendId:', note.backendId)
        let result = await toast.promise(storageActor.update_note(note.backendId!, block_str), {
          loading: "Updating note...",
          success: "Note updated successfully!",
          error: "Failed to update note. Please try again."
        })
        console.log('Note updated:', result)
      }
      
    } catch (error) {
      console.error("Failed to update note:", error)
      alert("Failed to update note. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // Function for saving new notes to cloud
  const saveNoteToCloud = async () => {
    if (!note || !currentWorkspace) return

    setIsSaving(true)
    try {
      let block_str = JSON.stringify(editor?.document)

      if (currentWorkspace.canister_id === dotaneCanisterId) {
        let dotaneActor = createDotaneActor(dotaneCanisterId, {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        // Save new note
        console.log('Saving new note with id:', note.id)
        let result = await toast.promise(dotaneActor.save_note(note.id, block_str), {
          loading: "Saving note to cloud...",
          success: "Note saved to cloud successfully!",
          error: "Failed to save note to cloud. Please try again."
        })
        console.log('Note saved to cloud:', result)
      } else {
        let storageActor = createStorageActor(currentWorkspace.canister_id, {
          agentOptions: {
            identity: identity || undefined,
            ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
          }
        })

        // Save new note
        console.log('Saving new note with id:', note.id)
        let result = await toast.promise(storageActor.save_note(note.id, block_str), {
          loading: "Saving note to cloud...",
          success: "Note saved to cloud successfully!",
          error: "Failed to save note to cloud. Please try again."
        })
        console.log('Note saved to cloud:', result)
      }
      
    } catch (error) {
      console.error("Failed to save note:", error)
      alert("Failed to save note. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveToCloud = async () => {
    if (!note || !currentWorkspace) return

    // Check if note is published and use appropriate method
    if (note.is_published && note.backendId) {
      // Note is published, use update function
      await updateNoteToCloud()
    } else {
      // Note is not published, use save function
      await saveNoteToCloud()
    }
  }

  // Check if user can save to current workspace
  // Save Note functionality is only available for premium users
  const canSaveToCloud = userProfile?.premium || false

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No note selected</h3>
          <p>Select a note from the sidebar or create a new one</p>
        </div>
      </div>
    )
  }

  if (editor === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Loading editor...</h3>
          <p>Please wait while the editor loads</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b px-3 sm:px-4 md:px-8 py-2 sm:py-3 md:py-4">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title..."
          className="w-full text-xl sm:text-2xl md:text-4xl lg:text-6xl font-extrabold border-none p-0 focus-visible:ring-0 bg-transparent outline-none mb-2 tracking-tight"
          style={{ lineHeight: 1.1 }}
          autoFocus
        />
        
        {/* Notebook Selector and Save to Cloud */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Category:</span>
              <Select value={note.notebookId || "none"} onValueChange={handleNotebookChange}>
                <SelectTrigger className="w-full sm:w-48 h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {notebooks.map((notebook) => (
                    <SelectItem key={notebook.id} value={notebook.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${notebook.color}`} />
                        <span>{notebook.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Last updated {note.updatedAt.toLocaleDateString()}</p>
              {isSavingBlocks && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Save to Cloud Button */}
          <div className="flex items-center gap-2">
            {currentWorkspace && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Cloud className="w-3 h-3" />
                <span>{currentWorkspace.domain || currentWorkspace.canister_id}</span>
              </div>
            )}
            <Button
              onClick={handleSaveToCloud}
              disabled={!canSaveToCloud || isSaving}
              size="sm"
              variant={canSaveToCloud ? "default" : "outline"}
              className={canSaveToCloud ? "" : "text-muted-foreground opacity-60"}
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <span className="flex items-center">
                    <Cloud className="w-3 h-3 mr-2" />
                    <span>{note?.is_published ? "Save Note" : "Save to Cloud"}</span>
                    {!userProfile?.premium && (
                      <span className="ml-2 flex items-center text-xs text-muted-foreground">
                        <Lock className="w-3 h-3 mr-1" />
                        <span>Premium Required</span>
                      </span>
                    )}
                  </span>
                </>
              )}
            </Button>
            

          </div>
        </div>
      </div>
      <div className="flex-1 px-4 md:px-8 lg:px-16 py-2 sm:py-4 md:py-8 max-w-none">
        <BlockNoteView 
          autoFocus={true} 
          key={note.id} 
          editor={editor}
          upl
          onChange={() => {
            let newBlocks = editor.document
            console.log('Editor content changed for note:', note?.id, 'blocks:', newBlocks)
            
            if (note) {
              // Clear existing timer
              if (debounceTimer) {
                clearTimeout(debounceTimer)
              }
              
              // Set new debounced timer
              const timer = setTimeout(async () => {
                setIsSavingBlocks(true)
                try {
                  await updateNoteBlocks(note.id, newBlocks)
                } finally {
                  setIsSavingBlocks(false)
                }
              }, 1000) // Debounce for 1 second
              
              setDebounceTimer(timer)
            }
          }}
          sideMenu={false}
          slashMenu={false}
          className="min-h-0 flex-1"
        >
          <SideMenuController sideMenu={(props) => (
            <SideMenu {...props}>
              {/* Button which removes the hovered block. */}
              <BigPlusButton onClick={() => {
                editor.openSuggestionMenu("/")
              }} />
              <DragHandleButton {...props} />
            </SideMenu>
          )}/>
          
          <SuggestionMenuController
            triggerCharacter="/"
            suggestionMenuComponent={CustomSlashMenu}
            // getItems={async (query) =>
            //   filterSuggestionItems(
            //     [...getDefaultReactSlashMenuItems(editor), insertDraw()],
            //     query
            //   )
            // }
          />
        </BlockNoteView>
      </div>
      

    </div>
  )
}
