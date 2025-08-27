
import type React from "react"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Bell,
  Palette,
  Database,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  Globe,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  ArrowRight,
  Camera,
  Upload,
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useIndexedDB } from "@/hooks/use-indexeddb"
import { DatabaseTest } from "./database-test"

interface SettingsPageProps {
  onBack: () => void
}

type RegistrationStatus =
  | "idle"
  | "pending"
  | "PendingOrder"
  | "PendingChallengeResponse"
  | "PendingAcmeApproval"
  | "Available"
  | "Failed"

interface DomainRegistration {
  domain: string
  canisterId: string
  requestId?: string
  status: RegistrationStatus
  error?: string
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { theme, setTheme } = useTheme()
  const isMobile = useIsMobile()
  const { getDatabaseInfo, syncToIndexedDB } = useIndexedDB()
  const [activeTab, setActiveTab] = useState("profile")
  const [penName, setPenName] = useState("John Doe")
  const [email, setEmail] = useState("john@example.com")
  const [bio, setBio] = useState("")
  const [profilePhoto, setProfilePhoto] = useState("/placeholder-user.jpg")
  const [publicProfile, setPublicProfile] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [dbInfo, setDbInfo] = useState<{ notes: number; notebooks: number; lastSync: number } | null>(null)
  const [isLoadingDbInfo, setIsLoadingDbInfo] = useState(false)

  // Domain linking state
  const [customDomain, setCustomDomain] = useState("")
  const [canisterId, setCanisterId] = useState("rdmx6-jaaaa-aaaam-qcaiq-cai")
  const [domainRegistrations, setDomainRegistrations] = useState<DomainRegistration[]>([])
  const [isRegistering, setIsRegistering] = useState(false)
  const [dnsConfigured, setDnsConfigured] = useState(false)
  const [showRegistration, setShowRegistration] = useState(false)

  const handleSaveProfile = () => {
    // TODO: Implement profile save
    console.log("Saving profile:", { penName, email, bio, profilePhoto, publicProfile })
  }

  const handleSaveNotifications = () => {
    // TODO: Implement notifications save
    console.log("Saving notifications:", { pushNotifications, autoSave })
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (200KB = 200 * 1024 bytes)
      if (file.size > 200 * 1024) {
        alert("File size must be less than 200KB")
        return
      }

      // In a real app, you would upload this to your storage service
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfilePhoto(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  const handleContinue = () => {
    setShowRegistration(true)
  }

  const registerDomain = async () => {
    if (!customDomain || !canisterId) return

    setIsRegistering(true)

    try {
      const response = await fetch("https://icp0.io/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customDomain,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const newRegistration: DomainRegistration = {
          domain: customDomain,
          canisterId,
          requestId: data.id,
          status: "PendingOrder",
        }

        setDomainRegistrations((prev) => [...prev, newRegistration])

        // Start polling for status
        pollRegistrationStatus(data.id, customDomain)
      } else {
        throw new Error(data.message || "Registration failed")
      }
    } catch (error) {
      console.error("Registration error:", error)
      const failedRegistration: DomainRegistration = {
        domain: customDomain,
        canisterId,
        status: "Failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
      setDomainRegistrations((prev) => [...prev, failedRegistration])
    } finally {
      setIsRegistering(false)
    }
  }

  const pollRegistrationStatus = async (requestId: string, domain: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`https://icp0.io/registrations/${requestId}`)
        const data = await response.json()

        setDomainRegistrations((prev) =>
          prev.map((reg) => (reg.requestId === requestId ? { ...reg, status: data.status } : reg)),
        )

        if (data.status !== "Available" && data.status !== "Failed") {
          setTimeout(poll, 10000) // Poll every 10 seconds
        }
      } catch (error) {
        console.error("Status polling error:", error)
      }
    }

    poll()
  }

  const updateDomain = async (requestId: string) => {
    try {
      const response = await fetch(`https://icp0.io/registrations/${requestId}`, {
        method: "PUT",
      })

      if (response.ok) {
        console.log("Domain updated successfully")
      }
    } catch (error) {
      console.error("Update error:", error)
    }
  }

  const removeDomain = async (requestId: string) => {
    try {
      const response = await fetch(`https://icp0.io/registrations/${requestId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDomainRegistrations((prev) => prev.filter((reg) => reg.requestId !== requestId))
      }
    } catch (error) {
      console.error("Remove error:", error)
    }
  }

  const getStatusColor = (status: RegistrationStatus) => {
    switch (status) {
      case "Available":
        return "text-green-600 dark:text-green-400"
      case "Failed":
        return "text-red-600 dark:text-red-400"
      case "pending":
      case "PendingOrder":
      case "PendingChallengeResponse":
      case "PendingAcmeApproval":
        return "text-yellow-600 dark:text-yellow-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusIcon = (status: RegistrationStatus) => {
    switch (status) {
      case "Available":
        return <CheckCircle className="w-4 h-4" />
      case "Failed":
        return <AlertCircle className="w-4 h-4" />
      case "pending":
      case "PendingOrder":
      case "PendingChallengeResponse":
      case "PendingAcmeApproval":
        return <Loader2 className="w-4 h-4 animate-spin" />
      default:
        return null
    }
  }

  const isValidDomain = (domain: string) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
    return domainRegex.test(domain)
  }

  const showDomainInstructions = customDomain && isValidDomain(customDomain)

  const loadDatabaseInfo = async () => {
    setIsLoadingDbInfo(true)
    try {
      const info = await getDatabaseInfo()
      setDbInfo(info)
    } catch (error) {
      console.error('Error loading database info:', error)
    } finally {
      setIsLoadingDbInfo(false)
    }
  }

  const handleSyncToIndexedDB = async () => {
    try {
      await syncToIndexedDB()
      await loadDatabaseInfo() // Refresh info after sync
    } catch (error) {
      console.error('Error syncing to IndexedDB:', error)
    }
  }

  // Load database info when database tab is selected
  useEffect(() => {
    if (activeTab === "database" && !dbInfo) {
      loadDatabaseInfo()
    }
  }, [activeTab, dbInfo, loadDatabaseInfo])

  return (
    <div className="flex-1 p-4 sm:p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
          <Button onClick={onBack} variant="ghost" size="sm" className="self-start">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        </div>

        {/* Mobile Selector */}
        {isMobile && (
          <div className="mb-6">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </div>
                </SelectItem>
                <SelectItem value="notifications">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </div>
                </SelectItem>
                <SelectItem value="appearance">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Appearance
                  </div>
                </SelectItem>
                <SelectItem value="storage">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Storage
                  </div>
                </SelectItem>
                <SelectItem value="domains">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Domains
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Desktop Tabs */}
        {!isMobile && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 gap-2">
              <TabsTrigger value="profile" className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2 text-sm">
                <Palette className="w-4 h-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-2 text-sm">
                <Database className="w-4 h-4" />
                Storage
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-2 text-sm">
                <Database className="w-4 h-4" />
                Database
              </TabsTrigger>
              <TabsTrigger value="domains" className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" />
                Domains
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Content Sections */}
        {activeTab === "profile" && (
          <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
                <CardDescription className="text-sm">Update your pen name, profile photo, and other personal information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Profile Photo Section */}
                <div className="space-y-4">
                  <Label>Profile Photo</Label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                    <div className="relative self-start">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-muted border-2 border-border">
                        <img
                          src={profilePhoto || "/placeholder.svg"}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder-user.jpg"
                          }}
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                        <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor="photo-upload" className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Photo
                          </label>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setProfilePhoto("/placeholder-user.jpg")}>
                          Remove
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max size 200KB. Recommended 400x400px.
                      </p>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Pen Name */}
                <div className="space-y-2">
                  <Label htmlFor="penName">Pen Name</Label>
                  <Input
                    id="penName"
                    value={penName}
                    onChange={(e) => setPenName(e.target.value)}
                    placeholder="Your pen name or display name"
                    className="text-sm sm:text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name that will be displayed on your published notes and public profile.
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={bio}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length <= 100) {
                        setBio(value)
                      }
                    }}
                    placeholder="Tell us about yourself..."
                    maxLength={100}
                    className="text-sm sm:text-base"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      A short description that appears on your public profile.
                    </p>
                    <span className="text-xs text-muted-foreground">{bio.length}/100</span>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="text-sm sm:text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for account recovery and important notifications. Not displayed publicly.
                  </p>
                </div>

                {/* Public Profile Toggle */}
                <div className="flex items-start space-x-3 p-3 sm:p-4 border rounded-lg">
                  <input
                    type="checkbox"
                    id="publicProfile"
                    checked={publicProfile}
                    onChange={(e) => setPublicProfile(e.target.checked)}
                    className="rounded mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="publicProfile" className="cursor-pointer font-medium text-sm sm:text-base">
                      Make profile public
                    </Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Allow others to discover your profile and published notes. Your pen name and profile photo will be
                      visible to other users.
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} className="w-full sm:w-auto">Save Changes</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Notification Preferences</CardTitle>
                <CardDescription className="text-sm">Manage how you receive notifications and updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pushNotifications"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="pushNotifications" className="text-sm sm:text-base">Enable push notifications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoSave"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="autoSave" className="text-sm sm:text-base">Auto-save notes</Label>
                </div>
                <Button onClick={handleSaveNotifications} className="w-full sm:w-auto">Save Changes</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "appearance" && (
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose how Dotane.io looks and feels in your browser.</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent transition-colors">
                    <RadioGroupItem value="light" id="light" />
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <Sun className="w-6 h-6" />
                      <Label htmlFor="light" className="cursor-pointer">
                        Light
                      </Label>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent transition-colors">
                    <RadioGroupItem value="dark" id="dark" />
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <Moon className="w-6 h-6" />
                      <Label htmlFor="dark" className="cursor-pointer">
                        Dark
                      </Label>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent transition-colors">
                    <RadioGroupItem value="system" id="system" />
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <Monitor className="w-6 h-6" />
                      <Label htmlFor="system" className="cursor-pointer">
                        System
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-4">
                  System theme will automatically switch between light and dark based on your device settings.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "storage" && (
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>Monitor your canister storage and cycles balance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Used</span>
                    <span className="text-sm font-medium">2.3 GB / 10 GB</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "23%" }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Canister Information</CardTitle>
                <CardDescription>Details about your storage canister.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Canister ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{canisterId}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(canisterId)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cycles Balance</span>
                  <span className="text-sm">1.2T cycles</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "database" && (
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>IndexedDB Storage</CardTitle>
                <CardDescription>Manage your local database storage and sync status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database Status</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadDatabaseInfo}
                    disabled={isLoadingDbInfo}
                  >
                    {isLoadingDbInfo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Refresh Info
                      </>
                    )}
                  </Button>
                </div>

                {dbInfo && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Notes</span>
                      <span className="text-sm font-medium">{dbInfo.notes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Notebooks</span>
                      <span className="text-sm font-medium">{dbInfo.notebooks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Sync</span>
                      <span className="text-sm font-medium">
                        {dbInfo.lastSync > 0 
                          ? new Date(dbInfo.lastSync).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleSyncToIndexedDB}
                    className="w-full"
                    variant="outline"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Sync Current Data to IndexedDB
                  </Button>
                </div>
              </CardContent>
            </Card>

            <DatabaseTest />
          </div>
        )}

        {activeTab === "domains" && (
          <div className="space-y-6 mt-6">
            {/* Domain Input */}
            <Card>
              <CardHeader>
                <CardTitle>Link Custom Domain</CardTitle>
                <CardDescription>
                  Enter your domain name to get step-by-step instructions for linking it to your canister.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domainInput">Domain Name</Label>
                  <Input
                    id="domainInput"
                    placeholder="example.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                  {customDomain && !isValidDomain(customDomain) && (
                    <p className="text-xs text-red-600 dark:text-red-400">Please enter a valid domain name</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* DNS Configuration Step - Only show when valid domain is entered */}
            {showDomainInstructions && !showRegistration && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Configure DNS Records for {customDomain}</CardTitle>
                  <CardDescription>Add these DNS records to your domain provider's control panel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add the following DNS records for <strong>{customDomain}</strong>:
                    </p>

                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="grid grid-cols-3 gap-4 font-bold text-sm border-b pb-2">
                        <span>Type</span>
                        <span>Host</span>
                        <span>Value</span>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="font-mono">CNAME</span>
                          <span className="font-mono">{customDomain}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{customDomain}.icp1.io</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${customDomain}.icp1.io`)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="font-mono">TXT</span>
                          <span className="font-mono">_canister-id.{customDomain}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{canisterId}</span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(canisterId)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <span className="font-mono">CNAME</span>
                          <span className="font-mono">_acme-challenge.{customDomain}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">_acme-challenge.{customDomain}.icp2.io</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`_acme-challenge.${customDomain}.icp2.io`)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="dnsConfigured"
                        checked={dnsConfigured}
                        onChange={(e) => setDnsConfigured(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="dnsConfigured" className="text-sm">
                        I have configured the DNS records for {customDomain}
                      </Label>
                    </div>

                    <Button onClick={handleContinue} disabled={!dnsConfigured} className="w-full">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Domain Registration - Show after DNS configuration */}
            {showDomainInstructions && showRegistration && (
              <Card>
                <CardHeader>
                  <CardTitle>Register {customDomain}</CardTitle>
                  <CardDescription>Complete the domain registration with ICP HTTP gateways.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your DNS records have been configured. Now register your domain with the ICP HTTP gateways to
                    complete the setup.
                  </p>

                  <Button onClick={registerDomain} disabled={isRegistering || !customDomain} className="w-full">
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering {customDomain}...
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        Register {customDomain}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Registered Domains */}
            {domainRegistrations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Registered Domains</CardTitle>
                  <CardDescription>Manage your custom domains and their registration status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {domainRegistrations.map((registration, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{registration.domain}</span>
                            <Badge variant="outline" className={getStatusColor(registration.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(registration.status)}
                                {registration.status}
                              </div>
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Canister: {registration.canisterId}</p>
                          {registration.error && (
                            <p className="text-xs text-red-600 dark:text-red-400">Error: {registration.error}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {registration.status === "Available" && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`https://${registration.domain}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}

                          {registration.requestId && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => updateDomain(registration.requestId!)}>
                                Update
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDomain(registration.requestId!)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Troubleshooting */}
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting</CardTitle>
                <CardDescription>Common issues and solutions for domain registration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Common Issues:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>
                      • Check DNS configuration using <code className="bg-muted px-1 rounded">dig</code> or{" "}
                      <code className="bg-muted px-1 rounded">nslookup</code>
                    </li>
                    <li>• Ensure no extra TXT records exist for _canister-id subdomain</li>
                    <li>• Remove any existing TXT records for _acme-challenge subdomain</li>
                    <li>• DNS changes can take up to 24 hours to propagate globally</li>
                    <li>• Configure HttpAgent host for custom domains in your frontend code</li>
                  </ul>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-bold mb-2">Frontend Configuration:</p>
                  <pre className="text-xs">
                    {`// Configure HttpAgent for custom domain
const host = isProduction ? "https://icp-api.io" : undefined;
const agent = await HttpAgent.create({ host });`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
