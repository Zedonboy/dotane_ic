import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowLeft, Star, Zap, Shield, Download, Video, FileText, Brain, AlertCircle } from "lucide-react"
import { CryptoPaymentModal } from "./crypto-payment-modal"
import { useAtomValue } from "jotai"
import { authIdentityAtom, walletDirectConnectedAtom } from "@/store"
import { toast } from "react-hot-toast"
import { WalletDirect } from "@fusion-wallet/wallet-direct"
import { create_delegate_payment, WalletRequest } from "@fusion-wallet/wallet-app"
import { USDC_LEDGER_CANISTER_ID } from "@/lib/config"
import {canisterId as dotaneCanisterId, createActor as createDotaneActor} from "@declarations/dotane_ic_backend"
// import {} "@fusion-wallet/wallet-app"

// USDC Logo Component
const USDCLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className} 
    xmlns="http://www.w3.org/2000/svg" 
    data-name="86977684-12db-4850-8f30-233a7c267d11" 
    viewBox="0 0 2000 2000"
  >
    <path d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z" fill="#2775ca"/>
    <path d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z" fill="#fff"/>
    <path d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z" fill="#fff"/>
  </svg>
)

interface PremiumPageProps {
  onBack: () => void
}

export function PremiumPage({ onBack }: PremiumPageProps) {
  const [showCryptoModal, setShowCryptoModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedAmount, setSelectedAmount] = useState(5.98)
  const identity = useAtomValue(authIdentityAtom)
  const walletDirectConnected = useAtomValue(walletDirectConnectedAtom)

  const handleCryptoPayment = (planType: 'monthly' | 'yearly') => {
    setSelectedPlan(planType)
    setSelectedAmount(planType === 'monthly' ? 5.98 : 59.98)
    setShowCryptoModal(true)
  }

  const handleFusionWalletPayment = async (planType: 'monthly' | 'yearly') => {
    if (!walletDirectConnected) {
      toast.error('You are not connected to a Wallet through WalletDirect')
      return
    }


    const walletDirect = (window as any).walletDirect as WalletDirect;
    let domain = window.location.hostname
    let req_data = create_delegate_payment(USDC_LEDGER_CANISTER_ID,  planType === 'monthly' ? 3.99 : 55.00,  dotaneCanisterId, domain)

    let data = await walletDirect.send_message(WalletRequest.DelegatePayment, req_data)

    if(data) {
      let principal = new TextDecoder().decode(data);
      let dotaneActor = createDotaneActor(dotaneCanisterId, {
        agentOptions: {
          identity: identity as any,
          ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})

        }
      })

      let payment_result = await dotaneActor.notify_payment_approval(principal, planType === 'monthly' ? { 'Monthly': null } : { 'Yearly': null })

      if(payment_result.success) {
        toast.success('Payment processed successfully!')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        console.error(payment_result.message)
        toast.error('Payment failed!')
      }
    }
    
    // TODO: Implement Fusion Wallet payment logic
    const amount = planType === 'monthly' ? 3.99 : 55.00
    toast.success(`Processing Fusion Wallet payment for $${amount}`)
    console.log(`Fusion Wallet payment: ${planType} plan - $${amount}`)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Upgrade to Premium</h1>
            <p className="text-muted-foreground mt-1">
              Unlock advanced publishing features and AI assistance
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Video className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Video & Media</h3>
              <p className="text-sm text-muted-foreground">
                Embed videos, images, and interactive media in your published notes
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Download className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">File Downloads</h3>
              <p className="text-sm text-muted-foreground">
                Attach downloadable files and resources to your published content
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Brain className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">AI Assistance</h3>
              <p className="text-sm text-muted-foreground">
                Get AI-powered writing suggestions and content optimization
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Advanced Security</h3>
              <p className="text-sm text-muted-foreground">
                Enhanced privacy controls and secure content publishing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Monthly Plan */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Monthly</CardTitle>
                  <CardDescription>Perfect for getting started</CardDescription>
                </div>
                <Badge variant="secondary">Popular</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">5.98</span>
                  <div className="flex items-center gap-1">
                    <USDCLogo className="w-6 h-6" />
                    <span className="text-lg text-muted-foreground">/month</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground line-through">9.99 USDC</span>
                  <Badge variant="outline" className="text-xs">Save 40% with Crypto</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Billed monthly • Cancel anytime
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Unlimited video & media embedding</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">File attachment support (up to 100MB)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">AI writing assistance</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Advanced privacy controls</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Priority customer support</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleFusionWalletPayment('monthly')}
                  // disabled={!walletDirectConnected}
                >
                  <USDCLogo className="w-4 h-4 mr-2" />
                  Pay $3.99 through Fusion Wallet
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleCryptoPayment('monthly')}
                >
                  Pay with Crypto
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="relative border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Yearly</CardTitle>
                  <CardDescription>Best value for long-term users</CardDescription>
                </div>
                <Badge className="bg-primary">Save 17%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">59.98</span>
                  <div className="flex items-center gap-1">
                    <USDCLogo className="w-6 h-6" />
                    <span className="text-lg text-muted-foreground">/year</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground line-through">99.99 USDC</span>
                  <Badge variant="outline" className="text-xs">Save 40% with Crypto</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Billed annually • Save $19.89
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Everything in Monthly</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Larger file attachments (up to 500MB)</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Advanced AI features</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Custom domain support</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">24/7 priority support</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleFusionWalletPayment('yearly')}
                  // disabled={!walletDirectConnected}
                >
                  <USDCLogo className="w-4 h-4 mr-2" />
                  Pay $55 through Fusion Wallet
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleCryptoPayment('yearly')}
                >
                  Pay with Crypto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust Elements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">30-Day Money Back</h3>
              <p className="text-sm text-muted-foreground">
                Not satisfied? Get a full refund within 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Zap className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Instant Access</h3>
              <p className="text-sm text-muted-foreground">
                Get premium features immediately after payment
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Star className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Trusted by Thousands</h3>
              <p className="text-sm text-muted-foreground">
                Join thousands of satisfied creators and developers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>What's included with Premium?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Enhanced Publishing
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Embed videos and interactive media</li>
                  <li>• Attach downloadable files and resources</li>
                  <li>• Advanced formatting and styling options</li>
                  <li>• Custom domain publishing</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI-Powered Features
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Smart writing suggestions</li>
                  <li>• Content optimization recommendations</li>
                  <li>• Automatic formatting and structure</li>
                  <li>• SEO and readability analysis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Crypto Payment Modal */}
      <CryptoPaymentModal
        open={showCryptoModal}
        onOpenChange={setShowCryptoModal}
        planType={selectedPlan}
        amount={selectedAmount}
      />
    </div>
  )
} 