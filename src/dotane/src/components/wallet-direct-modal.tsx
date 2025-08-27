
import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Smartphone, Shield, Globe, Copy, Check } from "lucide-react"
import { WalletDirectLogo } from "./wallet-direct-logo"
import { QRCodeSVG } from "qrcode.react"
import {createWalletDirect, closeWalletDirect} from "@fusion-wallet/wallet-direct"
import {createFusionWalletUrl} from "@fusion-wallet/wallet-app"
import { useAtom } from "jotai"
import { walletDirectConnectedAtom } from "@/store"

// Function to fetch peer ID and create multiaddress
export const fetchPeerIdAndCreateMultiaddress = async (): Promise<string> => {
  try {
    const response = await fetch('http://relay.walletdirect.io/api/peerid')
    if (!response.ok) {
      throw new Error(`Failed to fetch peer ID: ${response.status}`)
    }
    const peerId = await response.json()
    
    // Create multiaddress in the format: /dns/relay.walletdirect.io/tcp/3000/ws/p2p/<peer_id>
    const multiaddress = `/dns/relay.walletdirect.io/tcp/3000/ws/p2p/${peerId}`
    return multiaddress
  } catch (error) {
    console.error('Error fetching peer ID:', error)
    throw error
  }
}

interface WalletDirectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletDirectModal({ open, onOpenChange }: WalletDirectModalProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [walletDirectConnected, setWalletDirectConnected] = useAtom(walletDirectConnectedAtom)
  const [qrCodeUrl, setQRCodeUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const walletDirectRef = useRef<any>(null)
  const disconnect_timer = useRef<any>(null)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      let walletDirect = await createWalletDirect();

      await walletDirect.onStartSession(() => {
        console.log('Session started');
        clearTimeout(disconnect_timer.current)
        setWalletDirectConnected(true)
        setQRCodeUrl(null)
        onOpenChange(false)
      })

      await walletDirect.onConnectionClose(() => {
        console.log('Connection closed')
        setWalletDirectConnected(false)
        setQRCodeUrl(null)
        onOpenChange(false)
      })

      walletDirectRef.current = walletDirect;
      
      (window as any).walletDirect = walletDirect;
      
      // Fetch peer ID and create multiaddress
      const multiaddress = await fetchPeerIdAndCreateMultiaddress()
      console.log('Generated multiaddress:', multiaddress)
      
      let connected = await walletDirect.connect(multiaddress)

      console.log('Connected:', connected)

      if (connected) {
        let connect_str = walletDirect.get_p2p_addr()!
        console.log('Connect string:', connect_str)

        let domain = window.location.hostname;
        let url = createFusionWalletUrl(connect_str, domain)
        console.log('Fusion wallet URL:', url)
        setQRCodeUrl(url)

        disconnect_timer.current = setTimeout(() => {
          closeWalletConnection()
        }, 1000 * 60 * 5)


      }
    } catch (error) {
      console.error('Connection failed:', error)
      // Handle error appropriately
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    closeWalletConnection()
    setIsConnecting(false)
    setCopied(false)
    onOpenChange(false)
  }

  const closeWalletConnection = async () => {
    if (walletDirectRef.current) {
      try {
        await closeWalletDirect(walletDirectRef.current)
        console.log('Wallet connection closed')
      } catch (error) {
        console.error('Error closing wallet connection:', error)
      }
      walletDirectRef.current = null
    }
    setIsConnected(false)
    setQRCodeUrl(null)
  }

  const handleCopyQRCode = async () => {
    try {
      if (qrCodeUrl) {
        await navigator.clipboard.writeText(qrCodeUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy QR code URL:', err)
    }
  }

  const handleQRModalClose = () => {
    closeWalletConnection().finally(() => {
      setQRCodeUrl(null)
      setCopied(false)
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl min-h-[500px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center p-2">
                <WalletDirectLogo className="w-6 h-6 text-white" width={24} height={24} />
              </div>
              <DialogTitle className="text-2xl">WalletDirect Protocol</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex flex-col h-full overflow-y-auto">
            <div className="flex-1 space-y-4">
              {/* Hero Image */}
              <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center p-3">
                    {/* <Globe className="w-8 h-8 text-white" /> */}
                    <WalletDirectLogo className="w-8 h-8 text-white" width={24} height={24} />
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center p-3">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  WalletDirect evolved from WalletConnect to address centralization issues. It provides a truly
                  decentralized way for DApps to connect to mobile wallets.
                </p>

                {/* Wallet Requirement Notice */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-white font-bold">!</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-amber-800">
                        Use a WalletDirect Compliant Wallet
                      </p>
                      <p className="text-xs text-amber-700">
                        You need a wallet that supports the WalletDirect protocol. We recommend using{" "}
                        <a 
                          href="https://fusionwallet.me" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          Fusion Wallet
                        </a>
                        , which is fully compatible with WalletDirect.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <WalletDirectLogo className="w-4 h-4 text-blue-600" width={16} height={16} />
                      <span className="text-sm font-medium text-blue-800">No Bridge Servers</span>
                    </div>
                    <p className="text-xs text-blue-700">Direct peer-to-peer connections</p>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Enhanced Security</span>
                    </div>
                    <p className="text-xs text-green-700">Customizable protocols</p>
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Full Control</span>
                    </div>
                    <p className="text-xs text-purple-700">DApp customization freedom</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Section */}
            <div className="border-t pt-4 flex-shrink-0">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full bg-gradient-to-r text-white from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <WalletDirectLogo className="w-5 h-5 mr-2 text-white" />
                      Connect With Fusion Wallet
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto p-2">
                    <WalletDirectLogo className="w-6 h-6 text-green-600" width={20} height={20} />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Connected Successfully!</p>
                    <p className="text-sm text-muted-foreground">Using WalletDirect protocol</p>
                  </div>
                  <Button onClick={handleClose} variant="outline" className="w-full bg-transparent">
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {qrCodeUrl && (
        <Dialog open={!!qrCodeUrl} onOpenChange={handleQRModalClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Scan QR Code</DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col items-center space-y-6 py-4">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <QRCodeSVG 
                  value={qrCodeUrl}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
            
            {/* Instructions */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your Fusion Wallet app to connect
              </p>
              <p className="text-xs text-muted-foreground">
                Don't have Fusion Wallet?{" "}
                <a 
                  href="https://fusionwallet.me" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Download it here
                </a>
              </p>
            </div>
            
            {/* Copy Button */}
            <div className="w-full space-y-2">
              <Button
                onClick={handleCopyQRCode}
                variant="outline"
                className="w-full"
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy QR Code URL
                  </>
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Can't scan? Copy the URL and paste it in your wallet app
              </p>
            </div>
            
            {/* Close Button */}
            <Button
              onClick={handleQRModalClose}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </>
  )
}
