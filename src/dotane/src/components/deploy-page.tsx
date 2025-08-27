
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Wallet, Copy, CheckCircle, Star } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DeployPageProps {
  onBack: () => void
}

export function DeployPage({ onBack }: DeployPageProps) {
  const [selectedMethod, setSelectedMethod] = useState<"fusion" | "icp" | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  const icpAddress = "d4f2c8e9a1b3f7e6d5c4b8a9e2f1d6c3b7a8e4f9d2c5b8a1e6f3d9c2b5a8e1f4d7"

  const handleConnectFusionWallet = async () => {
    setIsConnecting(true)
    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setWalletConnected(true)
    setIsConnecting(false)
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    // Simulate deployment
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsDeploying(false)
    // Handle deployment success
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(icpAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Deploy Your Storage Canister</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Choose your preferred payment method to get started</p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Fusion Wallet - Recommended */}
          <Card className="relative border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="absolute -top-3 left-4">
              <Badge className="bg-primary text-primary-foreground text-xs">
                <Star className="w-3 h-3 mr-1" />
                Recommended
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="break-words">Pay with Fusion Wallet</span>
              </CardTitle>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                <span className="text-xl sm:text-2xl font-bold text-primary">2.5 ICP</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 w-fit">
                  Save 0.5 ICP
                </Badge>
              </div>
              <CardDescription className="text-sm">The easiest way to deploy and manage your canister</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Easy Canister Management</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Manage your canisters directly from your wallet</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Automatic Cycles Top-up</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Never worry about running out of cycles</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Lower Fees</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Reduced transaction costs and better rates</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                {!walletConnected ? (
                  <Button
                    onClick={handleConnectFusionWallet}
                    disabled={isConnecting}
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    {isConnecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        <span className="hidden sm:inline">Connecting...</span>
                        <span className="sm:hidden">Connecting</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Connect Fusion Wallet</span>
                        <span className="sm:hidden">Connect Wallet</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Wallet Connected</span>
                    </div>
                    <Button
                      onClick={handleDeploy}
                      disabled={isDeploying}
                      className="w-full bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      {isDeploying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          <span className="hidden sm:inline">Deploying...</span>
                          <span className="sm:hidden">Deploying</span>
                        </>
                      ) : (
                        "Deploy Canister"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ICP Payment */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold">ICP</span>
                </div>
                <span className="break-words">Pay with ICP</span>
              </CardTitle>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold text-foreground">3 ICP</span>
              </div>
              <CardDescription className="text-sm">Send ICP directly to deploy your canister</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="font-medium mb-2 text-sm sm:text-base">Send the full amount to this address:</p>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Input
                      value={icpAddress}
                      readOnly
                      className="font-mono text-xs bg-transparent border-none p-0 focus-visible:ring-0 flex-1 min-w-0"
                    />
                    <Button variant="ghost" size="sm" onClick={copyToClipboard} className="flex-shrink-0">
                      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  {copied && <p className="text-xs text-green-600 mt-1">Address copied to clipboard!</p>}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-amber-800">
                    <strong>Note:</strong> After sending ICP, it may take 5-10 minutes for the transaction to be
                    confirmed and your canister to be deployed.
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  variant="outline"
                  className="w-full bg-transparent"
                  size="lg"
                >
                  {isDeploying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="hidden sm:inline">Deploying...</span>
                      <span className="sm:hidden">Deploying</span>
                    </>
                  ) : (
                    "Deploy"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2 text-base sm:text-lg">What happens after deployment?</h3>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <li>• Your storage canister will be deployed to the Internet Computer network</li>
            <li>• You'll receive a unique canister ID for your notes storage</li>
            <li>• Your notes will be securely stored in a decentralized manner</li>
            <li>• You can then link your custom domain to access your notes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
