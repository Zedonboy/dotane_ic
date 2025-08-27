import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Copy, Check, Wallet, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"
import { toast } from "react-hot-toast"
import { createActor as createDotaneActor, canisterId as dotaneCanisterId } from "@declarations/dotane_ic_backend"
import { useAtomValue } from "jotai"
import { isAuthenticatedAtom, authIdentityAtom } from "../store"
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc"
import { createAgent, principalToSubAccount } from "@dfinity/utils"
import { Principal } from "@dfinity/principal"
import { USDC_LEDGER_CANISTER_ID, USDT_LEDGER_CANISTER_ID } from "@/lib/config"

// USDT Logo Component
const USDTLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 32 32"
  >
    <g fill="none" fillRule="evenodd">
      <circle cx="16" cy="16" r="16" fill="#26A17B"/>
      <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657"/>
    </g>
  </svg>
)

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

interface CryptoPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planType: 'monthly' | 'yearly'
  amount: number
}

interface TokenBalance {
  symbol: string
  balance: number
  logo: React.ComponentType<{ className?: string }>
}

export function CryptoPaymentModal({ open, onOpenChange, planType, amount }: CryptoPaymentModalProps) {
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [selectedToken, setSelectedToken] = useState<'ckUSDT' | 'ckUSDC' | null>(null)
  
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const identity = useAtomValue(authIdentityAtom)
  
  // Real balances from backend
  const [balances, setBalances] = useState<TokenBalance[]>([
    { symbol: 'ckUSDT', balance: 0, logo: USDTLogo },
    { symbol: 'ckUSDC', balance: 0, logo: USDCLogo }
  ])

  const [depositAddress, setDepositAddress] = useState("")
  const planLabel = planType === 'monthly' ? 'Monthly' : 'Yearly'
  const amountLabel = planType === 'monthly' ? '$5.98' : '$59.98'

  const dotaneActor = createDotaneActor(dotaneCanisterId, {
    agentOptions: {
      identity: identity as any,
      ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
    }
  })

  // Reset selected token when modal opens
  useEffect(() => {
    if (open) {
      setSelectedToken(null)
    }
  }, [open])

  // Fetch real data from backend
  useEffect(() => {
    if (open && isAuthenticated && identity) {
    
      fetchBalances(dotaneActor)
      fetchDepositAddress(dotaneActor)
    }
  }, [open, isAuthenticated])

  const fetchBalances = async (dotaneActor: any) => {
    if (!isAuthenticated || !identity) return
    
    setIsLoadingBalances(true)
    try {
      // Create agent for ICRC ledger
      const HOST = process.env.NODE_ENV === "development" ? "http://localhost:4943" : "https://ic0.app"
      
      const agent = await createAgent({
        identity: identity as any,
        host: HOST,
      })

     

      // Fetch USDT balance
      const usdtLedger = IcrcLedgerCanister.create({
        agent,
        canisterId: Principal.fromText(USDT_LEDGER_CANISTER_ID),
      })

      // Fetch USDC balance
      const usdcLedger = IcrcLedgerCanister.create({
        agent,
        canisterId: Principal.fromText(USDC_LEDGER_CANISTER_ID),
      })

      // Get account identifier for the current user
      const accountId = identity.getPrincipal().toText()

      let app_principal = Principal.fromText(dotaneCanisterId)

      // Fetch balances from ICRC ledgers using the correct method
      const [usdtBalanceResult, usdcBalanceResult] = await Promise.all([
        //@ts-ignore
        usdtLedger.balance({ owner: app_principal, subaccount: principalToSubAccount(identity.getPrincipal()) }).catch(() => ({ e8s: BigInt(0) })),
        //@ts-ignore
        usdcLedger.balance({ owner: app_principal, subaccount: principalToSubAccount(identity.getPrincipal()) }).catch(() => ({ e8s: BigInt(0) }))
      ])

      // Convert BigInt to number (assuming 8 decimals for both tokens)
      const usdtBalance = Number(usdtBalanceResult) / 1000000
      const usdcBalance = Number(usdcBalanceResult) / 1000000

      // Also try to get balances from backend as fallback
      // Use ICRC ledger balances, fallback to backend if ICRC fails
      const finalUsdtBalance = usdtBalance > 0 ? usdtBalance : 0
      const finalUsdcBalance = usdcBalance > 0 ? usdcBalance : 0
      
      setBalances([
        { symbol: 'ckUSDT', balance: finalUsdtBalance, logo: USDTLogo },
        { symbol: 'ckUSDC', balance: finalUsdcBalance, logo: USDCLogo }
      ])

      console.log('ICRC Ledger Balances:', {
        usdt: usdtBalance,
        usdc: usdcBalance,
        accountId
      })

    } catch (error) {
      console.error('Error fetching ICRC balances:', error)
      
      // Fallback to backend-only balance fetching
      try {
        const balanceTuple = await dotaneActor.get_balance_tuple()
        const [usdtBalance, usdcBalance] = balanceTuple
        
        setBalances([
          { symbol: 'ckUSDT', balance: parseFloat(usdtBalance), logo: USDTLogo },
          { symbol: 'ckUSDC', balance: parseFloat(usdcBalance), logo: USDCLogo }
        ])
      } catch (backendError) {
        console.error('Backend balance fetch also failed:', backendError)
        toast.error('Failed to fetch balances')
      }
    } finally {
      setIsLoadingBalances(false)
    }
  }

  const fetchDepositAddress = async (dotaneActor: any) => {
    if (!isAuthenticated) return
    
    setIsLoadingAddress(true)
    try {
      const address = await dotaneActor.get_deposit_address()
      setDepositAddress(address)
    } catch (error) {
      console.error('Error fetching deposit address:', error)
      toast.error('Failed to fetch deposit address')
    } finally {
      setIsLoadingAddress(false)
    }
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(depositAddress)
      setCopied(true)
      toast.success('Address copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy address')
    }
  }

  const handleProceed = async () => {
    if (!selectedToken) {
      toast.error('Please select a token type before proceeding')
      return
    }

    setIsProcessing(true)

    // Determine token type for backend
    const tokenType = selectedToken === 'ckUSDT' ? { 'CKUSDT': null } : { 'CKUSDC': null }

    dotaneActor.notify_deposit_premium_payment({
      token_type: tokenType,
      payment_period: planType === 'monthly' ? { 'Monthly': null } : { 'Yearly': null }
    }).then((res) => {
        if(res.success) {
            toast.success('Payment processed successfully!')
            setTimeout(() => {
              window.location.reload()
            }, 1500)
        } else {
            console.error(res.message)
            toast.error('Payment failed!')
        }
    }).finally(() => {
        
        setIsProcessing(false)
        onOpenChange(false)
    })
    
    
  }

  const hasSufficientBalance = selectedToken ? 
  //@ts-ignore
    balances.find(b => b.symbol === selectedToken)?.balance >= amount : false

  const selectedTokenBalance = selectedToken ? 
    (balances.find(b => b.symbol === selectedToken)?.balance ?? 0) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Crypto Payment - {planLabel} Plan
          </DialogTitle>
          <DialogDescription>
            Select a token and deposit {amountLabel} to complete your premium upgrade
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Balances and Token Selection */}
          <div className="space-y-6">
            {/* Current Balances with Checkboxes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Select Payment Token</CardTitle>
                <CardDescription>Choose which token you want to use for payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingBalances ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading balances...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {balances.map((token) => {
                      const isSelected = selectedToken === token.symbol
                      const hasBalance = token.balance >= amount
                      
                      return (
                        <div
                          key={token.symbol}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          } ${!hasBalance ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked && hasBalance) {
                                  setSelectedToken(token.symbol as 'ckUSDT' | 'ckUSDC')
                                } else if (!checked) {
                                  setSelectedToken(null)
                                }
                              }}
                              disabled={!hasBalance}
                            />
                            <token.logo className="w-6 h-6" />
                            <div>
                              <p className="font-medium">{token.symbol}</p>
                              <p className="text-sm text-muted-foreground">
                                Balance: {token.balance.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={hasBalance ? "default" : "secondary"}
                            className={hasBalance ? "bg-green-100 text-green-800" : ""}
                          >
                            {hasBalance ? "Available" : "Insufficient"}
                          </Badge>
                        </div>
                      )
                    })}
                    
                    {selectedToken && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Selected: {selectedToken} (Balance: {selectedTokenBalance.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (identity) {
                            const dotaneActor = createDotaneActor(dotaneCanisterId, {
                              agentOptions: {
                                identity: identity as any,
                                ...(process.env.NODE_ENV === "development" ? {host: "http://localhost:4943"} : {})
                              }
                            })
                            fetchBalances(dotaneActor)
                          }
                        }}
                        disabled={isLoadingBalances}
                        className="text-xs"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingBalances ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Deposit Instructions and Actions */}
          <div className="space-y-6">
            {/* Deposit Instructions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Deposit Instructions</CardTitle>
                <CardDescription>Send payment to the following address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingAddress ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading deposit address...</span>
                    </div>
                  </div>
                ) : depositAddress ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono break-all">{depositAddress}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyAddress}
                        className="ml-2 shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Failed to load deposit address</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleProceed}
                disabled={!selectedToken || !hasSufficientBalance || isProcessing || isLoadingBalances || isLoadingAddress || !depositAddress}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing Payment...
                  </>
                ) : isLoadingBalances || isLoadingAddress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : !selectedToken ? (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Select Token to Proceed
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Proceed with {selectedToken} Payment
                  </>
                )}
              </Button>
              
              {!selectedToken && !isLoadingBalances && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Please select a token type to proceed with payment.
                  </p>
                </div>
              )}
              
              {selectedToken && !hasSufficientBalance && !isLoadingBalances && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Insufficient {selectedToken} balance. Please add more tokens to your wallet.
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-primary p-0 h-auto"
                    onClick={() => window.open('https://internetcomputer.org/docs/current/developer-docs/integrations/icp-tokens/', '_blank')}
                  >
                    Learn how to get ckUSDT/ckUSDC
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
