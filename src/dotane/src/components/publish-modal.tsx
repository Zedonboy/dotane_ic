
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Share, Clock, Copy, CheckCircle, Users } from "lucide-react"

interface PublishModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteTitle?: string
}

export function PublishModal({ open, onOpenChange, noteTitle = "Untitled" }: PublishModalProps) {
  const [linkType, setLinkType] = useState<"anyone" | "24hour">("anyone")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const handlePublish = async () => {
    setIsPublishing(true)
    
    // Determine access type based on link type
    const accessType = linkType === "24hour" ? "RestrictedAccess" : "Public"
    
    // Trigger custom publish event for the note editor to handle
    const publishEvent = new CustomEvent('note-publish', {
      detail: { accessType }
    })
    
    // Listen for the result
    const handlePublishResult = (event: CustomEvent) => {
      if (event.type === 'note-publish-result') {
        const { success, url, error } = event.detail
        
        if (success) {
          setPublishedUrl(url)
          setIsPublished(true)
        } else {
          console.error('Publish failed:', error)
          // Handle error - you might want to show a toast or error message
        }
        setIsPublishing(false)
        
        // Remove the result listener
        window.removeEventListener('note-publish-result', handlePublishResult as EventListener)
      }
    }
    
    window.addEventListener('note-publish-result', handlePublishResult as EventListener)
    window.dispatchEvent(publishEvent)
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetModal = () => {
    setIsPublished(false)
    setPublishedUrl("")
    setCopied(false)
    setLinkType("anyone")
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
            <Share className="w-5 h-5" />
            Publish Note
          </DialogTitle>
          <DialogDescription>Choose how you want to share "{noteTitle}" with others.</DialogDescription>
        </DialogHeader>

        {!isPublished ? (
          <div className="space-y-6">
            <RadioGroup value={linkType} onValueChange={(value) => setLinkType(value as "anyone" | "24hour")}>
              <div className="space-y-4">
                {/* Anyone with link option */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="anyone" id="anyone" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="anyone" className="flex items-center gap-2 font-medium cursor-pointer">
                      <Users className="w-4 h-4" />
                      Anyone with the link
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Anyone who has the link can view this note. The link will remain active indefinitely.
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Permanent access
                    </Badge>
                  </div>
                </div>

                {/* 24-hour window option */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="24hour" id="24hour" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="24hour" className="flex items-center gap-2 font-medium cursor-pointer">
                      <Clock className="w-4 h-4" />
                      24-hour window link
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      The first person to access this link will register it. The link expires after 24 hours or after
                      the first access.
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Single use • 24h expiry
                    </Badge>
                  </div>
                </div>
              </div>
            </RadioGroup>

          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">Successfully Published!</h3>
              <p className="text-sm text-muted-foreground mb-4">Your note is now accessible via the link below.</p>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Input
                  value={publishedUrl}
                  readOnly
                  className="font-mono text-xs bg-transparent border-none p-0 focus-visible:ring-0"
                />
                <Button variant="ghost" size="sm" onClick={copyUrl}>
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {copied && <p className="text-xs text-green-600 mt-1">Link copied to clipboard!</p>}
            </div>

            <div className="flex justify-center">
              <Badge variant={linkType === "anyone" ? "default" : "outline"} className="flex items-center gap-1">
                {linkType === "anyone" ? (
                  <>
                    <Users className="w-3 h-3" />
                    Anyone with link
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    24-hour window
                  </>
                )}
              </Badge>
            </div>
          </div>
        )}

        <DialogFooter>
          {!isPublished ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Share className="w-4 h-4 mr-2" />
                    Publish
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
