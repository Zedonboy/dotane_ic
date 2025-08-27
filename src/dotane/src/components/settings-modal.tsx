
import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { User, Bell, Palette, Database, Sun, Moon, Monitor } from "lucide-react"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const [displayName, setDisplayName] = useState("John Doe")
  const [email, setEmail] = useState("john@example.com")
  const [publicProfile, setPublicProfile] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [autoSave, setAutoSave] = useState(true)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Storage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="publicProfile"
                checked={publicProfile}
                onChange={(e) => setPublicProfile(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="publicProfile">Make profile public</Label>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="pushNotifications"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="pushNotifications">Enable push notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoSave"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="autoSave">Auto-save notes</Label>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose how Dotane.io looks and feels in your browser.
                </p>
              </div>

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

              <div className="text-xs text-muted-foreground">
                System theme will automatically switch between light and dark based on your device settings.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Storage Usage</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Used</span>
                    <span className="text-sm font-medium">2.3 GB / 10 GB</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "23%" }}></div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Canister Information</h3>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Canister ID</span>
                    <span className="text-sm font-mono">rdmx6-jaaaa-aaaah-qcaiq-cai</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cycles Balance</span>
                    <span className="text-sm">1.2T cycles</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
