import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Share, Copy, CheckCircle, RefreshCw, ExternalLink } from "lucide-react"

interface PublishUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteTitle?: string
  publishedUrl?: string
}

export function PublishUpdateModal({ 
  open, 
  onOpenChange, 
  noteTitle = "Untitled",
  publishedUrl = ""
}: PublishUpdateModalProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    
    // Trigger custom update event for the note editor to handle
    const updateEvent = new CustomEvent('note-update', {
      detail: { publishedUrl }
    })
    
    // Listen for the result
    const handleUpdateResult = (event: CustomEvent) => {
      if (event.type === 'note-update-result') {
        const { success, error } = event.detail
        
        if (success) {
          setIsUpdated(true)
        } else {
          console.error('Update failed:', error)
          // Handle error - you might want to show a toast or error message
        }
        setIsUpdating(false)
        
        // Remove the result listener
        window.removeEventListener('note-update-result', handleUpdateResult as EventListener)
      }
    }
    
    window.addEventListener('note-update-result', handleUpdateResult as EventListener)
    window.dispatchEvent(updateEvent)
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openUrl = () => {
    window.open(publishedUrl, '_blank')
  }

  const resetModal = () => {
    setIsUpdated(false)
    setCopied(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetModal()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Update Published Note
          </DialogTitle>
          <DialogDescription>
            Update the published version of "{noteTitle}" with your latest changes.
          </DialogDescription>
        </DialogHeader>

        {!isUpdated ? (
          <div className="space-y-6">
            {/* Current Published URL */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Share className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Current Published URL:</span>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Input
                  value={publishedUrl}
                  readOnly
                  className="font-mono text-xs bg-transparent border-none p-0 focus-visible:ring-0 flex-1"
                />
                <Button variant="ghost" size="sm" onClick={copyUrl}>
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={openUrl}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              
              {copied && <p className="text-xs text-green-600">Link copied to clipboard!</p>}
            </div>

            {/* Update Information */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    What happens when you update?
                  </h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Your latest changes will be published to the same URL</li>
                    <li>• Anyone with the link will see the updated version</li>
                    <li>• The URL remains the same - no new link needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">Successfully Updated!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your note has been updated and is now live at the same URL.
              </p>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Input
                  value={publishedUrl}
                  readOnly
                  className="font-mono text-xs bg-transparent border-none p-0 focus-visible:ring-0"
                />
                <Button variant="ghost" size="sm" onClick={copyUrl}>
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={openUrl}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-green-600 mt-1">Link copied to clipboard!</p>}
            </div>

            <div className="flex justify-center">
              <Badge variant="default" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Updated
              </Badge>
            </div>
          </div>
        )}

        <DialogFooter>
          {!isUpdated ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Published Note
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 