import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DotaneLogo } from "./dotane-logo"
import { Shield, ArrowLeft, Loader2 } from "lucide-react"
import { AuthClient } from "@dfinity/auth-client"
import { Identity } from "@dfinity/agent"

interface AuthPageProps {
  onBack: () => void
  onAuthenticated: (identity?: Identity) => void
}

export function AuthPage({ onBack, onAuthenticated }: AuthPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("Sign in with Internet Identity")

  useEffect(() => {
    const initAuthClient = async () => {
      setLoadingText("Checking for existing session...")
      const client = await AuthClient.create()
      try {
        const isAuthenticated = await client.isAuthenticated()
        if (isAuthenticated) {
          let identity = client.getIdentity()
          setLoadingText("Authenticated")
          onAuthenticated(identity)
        } else {
          setIsLoading(false)
          setLoadingText("Sign in with Internet Identity")
        }
      } catch (error) {
        console.error("Authentication failed:", error)
        setLoadingText("Sign in with Internet Identity")
      } finally {
        setIsLoading(false)
      }
    }
    setIsLoading(true)
    initAuthClient()
  }, [])

  const handleInternetIdentityLogin = async () => {
    setIsLoading(true)

    try {
      // Simulate Internet Identity authentication
      // In a real implementation, this would integrate with the Internet Identity service
      console.log("Initiating Internet Identity authentication...")

      // Simulate authentication delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // For demo purposes, we'll assume authentication is successful
      console.log("Internet Identity authentication successful")
      onAuthenticated()
    } catch (error) {
      console.error("Authentication failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <DotaneLogo className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to Dotane</h1>
          <p className="text-muted-foreground">Sign in with Internet Identity to access your decentralized workspace</p>
        </div>

        {/* Main Auth Card */}
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl">Secure Authentication</CardTitle>
              <CardDescription className="text-base">
                Internet Identity provides secure, anonymous authentication without passwords or personal data.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Internet Identity Login Button */}
            <Button
              onClick={handleInternetIdentityLogin}
              disabled={isLoading}
              size="lg"
              className="w-full h-12 text-base font-medium"
            >
              <>
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {loadingText}
                </>
            </Button>

            {/* Info Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="text-center">
                <Badge variant="outline" className="mb-3">
                  Web3 Authentication
                </Badge>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">No passwords required</strong>
                    <br />
                    Use cryptographic keys instead of traditional passwords
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">Privacy-first</strong>
                    <br />
                    Your identity is anonymous and not tracked across services
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="text-foreground">Decentralized</strong>
                    <br />
                    No central authority controls your authentication
                  </div>
                </div>
              </div>
            </div>

            {/* Learn More Link */}
            <div className="text-center pt-2">
              <a
                href="https://identity.ic0.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Learn more about Internet Identity →
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to landing page
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          <p>Powered by Internet Computer Protocol</p>
        </div>
      </div>
    </div>
  )
} 