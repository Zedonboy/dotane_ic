"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
import { X, Send, Paperclip, Brain, Map, Globe, User, Bot, ChevronDown, FileText, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Note } from "@/types/note"
import { sendAIMessageStream, createMockSSE, type AIChatRequest } from "@/lib/ai-sse"
import { useAtomValue } from "jotai"
import { aiSessionAtom } from "@/store"
import { marked } from "marked"

type AIMode = "deepthink" | "roadmap" | "knowledge"
type MessageRole = "user" | "assistant"

interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  attachedNotes?: Note[]
}

interface AIChatSidebarProps {
  notes: Note[]
  publicNotes?: Note[]
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const AI_MODES = {
  deepthink: {
    name: "Deep Think",
    icon: Brain,
    description: "Advanced reasoning and analysis",
    color: "bg-purple-500",
  },
  roadmap: {
    name: "RoadMap",
    icon: Map,
    description: "Strategic planning and guidance",
    color: "bg-blue-500",
  },
  knowledge: {
    name: "Public Note Knowledge",
    icon: Globe,
    description: "Access to public notes database",
    color: "bg-green-500",
  },
}

export function AIChatSidebar({ 
  notes, 
  publicNotes = [], 
  isCollapsed = false, 
  onToggleCollapse 
}: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [selectedMode, setSelectedMode] = useState<AIMode>("deepthink")
  const [attachedNotes, setAttachedNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [publicNoteUrl, setPublicNoteUrl] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const aiSession = useAtomValue(aiSessionAtom)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedNotes.length === 0) return

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
      attachedNotes: attachedNotes.length > 0 ? [...attachedNotes] : undefined,
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
    setAttachedNotes([])
    setIsLoading(true)

    // Prepare request data
    const request: AIChatRequest = {
      message: inputValue,
      mode: selectedMode,
      attached_notes: attachedNotes.map(note => 
        `${note.title || "Untitled"}: ${note.content || ""}`
      )
    }

    // Use SSE for streaming response
    let rawChunks = ""
    let aiMessageId: string | null = null

    try {
      
      await sendAIMessageStream(
        request,
        async (chunk) => {
          let parsedChunk = await marked.parse(chunk)
          // Accumulate raw chunks first
          rawChunks += parsedChunk
          console.log("parsedChunk", parsedChunk)
          console.log("rawChunks accumulated", rawChunks)
          
          // Create AI message on first chunk
          if (!aiMessageId) {
            aiMessageId = (Date.now() + 1).toString()
            const aiMessage: Message = {
              id: aiMessageId,
              role: "assistant",
              content: rawChunks,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, aiMessage])
          } else {
            // Update with complete parsed content
            // const parsedContent = await marked.parse(rawChunks)
            setMessages((prev) => 
              prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, content: rawChunks }
                  : msg
              )
            )
          }
        },
        (error) => {
          console.error("AI Chat Error:", error)
          if (aiMessageId) {
            setMessages((prev) => 
              prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, content: `Error: ${error}` }
                  : msg
              )
            )
          } else {
            // Create error message if no AI message was created yet
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `Error: ${error}`,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
          }
          setIsLoading(false)
        },
        () => {
          setIsLoading(false)
        },
        aiSession?.session_id // Pass AI session token
      )

    } catch (error) {
      console.error("Error sending AI message:", error)
      
      // Fallback to mock SSE for development
      createMockSSE(
        inputValue,
        selectedMode,
        (chunk) => {
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: (msg.content || "") + chunk }
                : msg
            )
          )
        },
        () => {
          setIsLoading(false)
        }
      )
    }
  }



  const handleAttachNote = (note: Note) => {
    if (!attachedNotes.find((n) => n.id === note.id)) {
      setAttachedNotes((prev) => [...prev, note])
    }
  }

  const handleRemoveAttachedNote = (noteId: string) => {
    setAttachedNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAddPublicNote = () => {
    if (!publicNoteUrl.trim()) return

    // Create a mock public note from URL
    const newPublicNote: Note = {
      id: `public-${Date.now()}`,
      title: `Public Note: ${publicNoteUrl}`,
      content: `Content from: ${publicNoteUrl}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      notebookId: "public",
    }

    handleAttachNote(newPublicNote)
    setPublicNoteUrl("")
  }

  // Filter notes based on search query
  const filteredNotes = notes.filter(
    (note) =>
      (note.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content || "").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const currentMode = AI_MODES[selectedMode]

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full bg-background border-l shadow-xl transition-all duration-300 ease-in-out z-50",
        isCollapsed ? "w-12" : "w-96"
      )}
    >
      {/* Collapse Toggle Button */}
      <div className="absolute -left-3 top-4 z-50">
        <Button
          onClick={onToggleCollapse}
          variant="secondary"
          size="icon"
          className="h-6 w-6 rounded-full shadow-md border"
        >
          {isCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>
      </div>

      {isCollapsed ? (
        /* Collapsed State */
        <div className="flex flex-col h-full items-center py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Map className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
        </div>
      ) : (
        /* Expanded State */
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", currentMode.color)} />
              <h2 className="font-semibold">AI Assistant</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {messages.length} messages
              </Badge>
              {aiSession?.query_limit && (
                <Badge variant="outline" className="text-xs">
                  {messages.filter(m => m.role === "user").length}/{aiSession.query_limit} queries
                </Badge>
              )}
              {aiSession?.query_limit === null && (
                <Badge variant="outline" className="text-xs bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:text-yellow-300 dark:border-yellow-800">
                  ⭐ Premium Unlimited
                </Badge>
              )}
              {aiSession?.query_limit === undefined && (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                  Unlimited
                </Badge>
              )}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="p-4 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  <div className="flex items-center gap-2">
                    <currentMode.icon className="w-4 h-4" />
                    <span>{currentMode.name}</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                {Object.entries(AI_MODES).map(([key, mode]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSelectedMode(key as AIMode)}
                    className="flex items-start gap-3 p-3"
                  >
                    <div className={cn("w-2 h-2 rounded-full mt-2", mode.color)} />
                    <div>
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-xs text-muted-foreground">{mode.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Start a conversation with AI</p>
                  <p className="text-xs mt-1">Mode: {currentMode.name}</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end " : "justify-start text-gray-200")}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <div className={cn("prose prose-sm prose-ul:py-0 prose-ul:my-0 my-0 prose-p:mb-0 prose-p:mt-0 prose-strong:font-bold prose-headings:m-0", message.role === "user" ? "text-gray-800 prose-strong:text-gray-800 prose-headings:text-gray-800" : "text-gray-200 prose-strong:text-gray-200 prose-headings:text-gray-200 ")} dangerouslySetInnerHTML={{ __html: message.content }} />

                    {message.attachedNotes && message.attachedNotes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs opacity-70">Attached notes:</div>
                        {message.attachedNotes.map((note) => (
                          <Badge key={note.id} variant="secondary" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            {note.title || "Untitled"}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="text-xs opacity-50 mt-2">{message.timestamp.toLocaleTimeString()}</div>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-current rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Attached Notes */}
          {attachedNotes.length > 0 && (
            <div className="p-4 border-t bg-muted/30">
              <div className="text-xs font-medium mb-2">Attached Notes:</div>
              <div className="flex flex-wrap gap-1">
                {attachedNotes.map((note) => (
                  <Badge
                    key={note.id}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveAttachedNote(note.id)}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    {note.title || "Untitled"}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask ${currentMode.name}...`}
                  className="min-h-[60px] max-h-32 resize-none"
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                {/* Attach Notes Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isLoading}>
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 max-h-80 overflow-hidden">
                    <div className="p-3">
                      {/* Search Bar */}
                      <div className="mb-3">
                        <Input
                          placeholder="Search notes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Your Notes Section */}
                      <div className="mb-4">
                        <div className="text-xs font-medium mb-2">Your Notes</div>
                        <ScrollArea className="max-h-32">
                          {filteredNotes.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2">
                              {searchQuery ? "No notes found" : "No notes available"}
                            </div>
                          ) : (
                            filteredNotes.map((note) => (
                              <DropdownMenuItem
                                key={note.id}
                                onClick={() => handleAttachNote(note)}
                                className="text-xs mb-1"
                                disabled={attachedNotes.some((n) => n.id === note.id)}
                              >
                                <FileText className="w-3 h-3 mr-2" />
                                <div className="flex-1 truncate">{note.title || "Untitled"}</div>
                              </DropdownMenuItem>
                            ))
                          )}
                        </ScrollArea>
                      </div>

                      <Separator className="my-3" />

                      {/* Public Notes Section - URL Input Only */}
                      <div>
                        <div className="text-xs font-medium mb-2">Public Notes</div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter public note URL..."
                            value={publicNoteUrl}
                            onChange={(e) => setPublicNoteUrl(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={handleAddPublicNote}
                            disabled={!publicNoteUrl.trim()}
                            className="h-8 px-2 text-xs"
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  disabled={(!inputValue.trim() && attachedNotes.length === 0) || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
