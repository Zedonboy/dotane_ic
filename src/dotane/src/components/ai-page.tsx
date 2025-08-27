"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Brain, Map, Globe, User, Bot, ChevronDown, FileText, X, Trash2, Settings, Share, Download, Plus, MessageSquare, History, Edit3, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
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

interface AIPageProps {
  notes: Note[]
  publicNotes?: Note[]
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

export function AIPage({ notes, publicNotes = [] }: AIPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [selectedMode, setSelectedMode] = useState<AIMode>("deepthink")
  const [attachedNotes, setAttachedNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [publicNoteUrl, setPublicNoteUrl] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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

  const handleClearHistory = () => {
    setMessages([])
  }

  const handleNewChat = () => {
    setMessages([])
    setAttachedNotes([])
    setInputValue("")
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // Filter notes based on search query
  const filteredNotes = notes.filter(
    (note) =>
      (note.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content || "").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const currentMode = AI_MODES[selectedMode]

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-2.5 pb-4 sm:pb-2.5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex w-full items-center justify-between mb-2.5 sm:mb-0">
          <div className="flex items-center gap-2">
            {/* Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-600"
            >
              <Settings className="h-6 w-6" />
            </Button>

            {/* Share Button */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-600"
            >
              <Share className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* New Chat Button - Desktop */}
            <Button
              onClick={handleNewChat}
              className="sm:flex w-full me-4 hidden items-center justify-center rounded-lg bg-primary-700 px-6 py-2 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 sm:w-auto"
            >
              <Plus className="me-2 h-4 w-4" />
              New chat
            </Button>

            {/* AI Mode Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center rounded-full p-1.5 me-2 text-sm font-medium text-gray-900 hover:text-primary-600 focus:ring-4 focus:ring-gray-100 dark:text-white dark:hover:text-primary-500 dark:focus:ring-gray-700"
                >
                  <currentMode.icon className="w-4 h-4 mr-2" />
                  {currentMode.name}
                  <ChevronDown className="mx-1.5 h-2.5 w-2.5" />
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

            {/* Session Query Limit */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                {messages.length} messages
              </Badge>
              {aiSession?.query_limit && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                  {messages.filter(m => m.role === "user").length}/{aiSession.query_limit} queries
                </Badge>
              )}
              {aiSession?.query_limit === null && (
                <Badge variant="outline" className="text-xs bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:text-yellow-300 dark:border-yellow-800">
                  ⭐ Premium Unlimited
                </Badge>
              )}
              {aiSession?.query_limit === undefined && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                  Unlimited
                </Badge>
              )}
            </div>

            {/* History Button */}
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="ghost"
              size="icon"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-600"
            >
              <History className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* New Chat Button - Mobile */}
        <div>
          <Button
            onClick={handleNewChat}
            className="flex sm:hidden w-full items-center justify-center rounded-lg bg-primary-700 px-6 py-2 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 sm:w-auto"
          >
            <Plus className="me-2 h-4 w-4" />
            New chat
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="overflow-y-scroll h-[calc(100vh-18.7rem)] sm:h-[calc(100vh-15.4rem)]">
        <div className="max-w-4xl mx-auto py-4 lg:py-6 space-y-6 px-4 lg:px-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-16">
              <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Welcome to AI Assistant</h2>
              <p className="text-lg mb-4">Ask me anything. I can help you think deeply, plan strategically, or search through knowledge.</p>
              <p className="text-sm">Current mode: {currentMode.name}</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className="p-6 bg-white dark:bg-gray-800 shadow-xs rounded-lg flex items-start gap-6 group relative pe-14"
            >
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {message.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Message Content */}
              <div className="format dark:format-invert format-blue flex-1">
                <div className={"prose prose-sm prose-ul:py-0 prose-ul:my-0 my-0 prose-p:mb-0 prose-p:mt-0 prose-strong:font-bold prose-headings:m-0 text-gray-200 prose-strong:text-gray-200 prose-headings:text-gray-200 "} dangerouslySetInnerHTML={{ __html: message.content }} />

                {message.attachedNotes && message.attachedNotes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Attached notes:</div>
                    <div className="flex flex-wrap gap-2">
                      {message.attachedNotes.map((note) => (
                        <Badge key={note.id} variant="secondary" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          {note.title || "Untitled"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Actions */}
                <div className="space-x-2 flex items-center mt-4">
                  <Button
                    onClick={() => handleCopyMessage(message.content)}
                    variant="ghost"
                    size="sm"
                    className="inline-flex cursor-pointer justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {message.role === "assistant" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="inline-flex cursor-pointer justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="inline-flex cursor-pointer justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 absolute top-4 right-4 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-6 bg-white dark:bg-gray-800 shadow-xs rounded-lg flex items-start gap-6">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-2">
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
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full">
        <div className="w-full border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-700">
          <div className="flex items-center gap-4 bg-white px-4 py-3 dark:bg-gray-800">
            {/* Attach Notes */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-600"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-80 overflow-hidden">
                <div className="p-3">
                  <div className="mb-3">
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <ScrollArea className="max-h-32">
                    {filteredNotes.map((note) => (
                      <DropdownMenuItem
                        key={note.id}
                        onClick={() => handleAttachNote(note)}
                        className="text-xs mb-1"
                        disabled={attachedNotes.some((n) => n.id === note.id)}
                      >
                        <FileText className="w-3 h-3 mr-2" />
                        <div className="flex-1 truncate">{note.title || "Untitled"}</div>
                      </DropdownMenuItem>
                    ))}
                  </ScrollArea>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Input Field */}
            <Input
              ref={inputRef}
              type="text"
              placeholder="Write a prompt..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="block w-full border-0 bg-white px-0 text-sm text-gray-800 focus:ring-0 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
            />

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              variant="ghost"
              size="icon"
              disabled={(!inputValue.trim() && attachedNotes.length === 0) || isLoading}
              className="inline-flex cursor-pointer justify-center rounded-full p-2 text-primary-600 hover:bg-primary-100 dark:text-primary-500 dark:hover:bg-gray-600"
            >
              <Send className="h-4 w-4 rotate-90 rtl:-rotate-90" />
            </Button>
          </div>

          {/* Attached Notes Display */}
          {attachedNotes.length > 0 && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-2">
                {attachedNotes.map((note) => (
                  <Badge
                    key={note.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
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
        </div>
      </div>

      {/* Chat History Sidebar */}
      {showHistory && (
        <div className="fixed top-0 right-0 z-40 h-screen p-4 overflow-y-auto transition-transform bg-white w-80 dark:bg-gray-800 mr-12">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <h5 className="inline-flex items-center mb-4 text-base font-semibold text-gray-500 dark:text-gray-400">
              <History className="w-4 h-4 mr-2" />
              Chat History
            </h5>
            <Button
              onClick={() => setShowHistory(false)}
              variant="ghost"
              size="icon"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 absolute top-2.5 end-2.5 inline-flex items-center justify-center dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="my-5 space-y-5 h-[calc(100vh-16rem)] overflow-y-scroll">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start a conversation to see history here</p>
              </div>
            ) : (
              <div>
                <h6 className="inline-flex items-center mb-4 text-base font-medium text-gray-500 dark:text-gray-400">
                  Today
                </h6>
                <ul className="space-y-2">
                  {messages.map((message) => (
                    <li key={message.id}>
                      <div className="flex items-center p-1.5 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700">
                        <MessageSquare className="w-5 h-5 me-2 text-gray-500 dark:text-gray-400" />
                        <span className="dark:text-white text-base font-medium text-gray-900 truncate">
                          {message.content.substring(0, 50)}...
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <Button
              onClick={handleClearHistory}
              variant="outline"
              className="w-full"
              disabled={messages.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
