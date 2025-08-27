
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExternalLink, Server, Globe, CheckCircle } from "lucide-react"

interface DomainLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DomainLinkModal({ open, onOpenChange }: DomainLinkModalProps) {
  const [domain, setDomain] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStep, setDeploymentStep] = useState<"idle" | "deploying" | "linking" | "complete">("idle")

  const handleDeploy = async () => {
    if (!domain) return

    setIsDeploying(true)
    setDeploymentStep("deploying")

    // Simulate deployment process
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setDeploymentStep("linking")

    await new Promise((resolve) => setTimeout(resolve, 1500))
    setDeploymentStep("complete")
    setIsDeploying(false)
  }

  const resetModal = () => {
    setDeploymentStep("idle")
    setDomain("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Link Your Domain
          </DialogTitle>
          <DialogDescription>
            Deploy your storage canister and connect your custom domain to access your notes anywhere.
          </DialogDescription>
        </DialogHeader>

        {deploymentStep === "idle" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input id="domain" placeholder="mynotes.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
              <p className="text-xs text-muted-foreground">Enter your domain name (without https://)</p>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">What happens next:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Deploy storage canister to decentralized network</li>
                <li>• Configure DNS settings for your domain</li>
                <li>• Enable secure access to your notes</li>
              </ul>
            </div>
          </div>
        )}

        {deploymentStep === "deploying" && (
          <div className="text-center py-6">
            <Server className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
            <h3 className="text-lg font-medium mb-2">Deploying Storage Canister</h3>
            <p className="text-sm text-muted-foreground">Setting up your decentralized storage...</p>
          </div>
        )}

        {deploymentStep === "linking" && (
          <div className="text-center py-6">
            <ExternalLink className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
            <h3 className="text-lg font-medium mb-2">Linking Domain</h3>
            <p className="text-sm text-muted-foreground">Connecting {domain} to your storage canister...</p>
          </div>
        )}

        {deploymentStep === "complete" && (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2">Successfully Linked!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your domain {domain} is now connected to your storage canister.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                You can now access your notes at: <br />
                <strong>https://{domain}</strong>
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {deploymentStep === "idle" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleDeploy} disabled={!domain || isDeploying}>
                Deploy & Link
              </Button>
            </>
          )}

          {deploymentStep === "complete" && (
            <Button onClick={resetModal} className="w-full">
              Done
            </Button>
          )}

          {(deploymentStep === "deploying" || deploymentStep === "linking") && (
            <Button disabled className="w-full">
              {deploymentStep === "deploying" ? "Deploying..." : "Linking..."}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
