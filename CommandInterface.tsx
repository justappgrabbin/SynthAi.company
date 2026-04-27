"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Sparkles, Code2, Brain } from "lucide-react"
import { useMorphStore } from "@/hooks/useMorphStore"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "morph"
  content: string
  actions?: string[]
}

export function CommandInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "morph",
      content: `Welcome to the Morph Interface. I don't store your files - I understand them.\n\nUpload any code and I will:\n• Extract what it's trying to do (intent)\n• Identify patterns and dependencies\n• Regenerate a working version from my memory\n• Suggest improvements\n\nWhat would you like to upload?`,
      actions: ["Upload code", "Show me how it works", "Improvise something"]
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const artifacts = useMorphStore((state) => state.artifacts)
  const gnnNodes = useMorphStore((state) => state.gnnNodes)
  const regenerateArtifact = useMorphStore((state) => state.regenerateArtifact)
  const improvise = useMorphStore((state) => state.improvise)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      const response = processCommand(input, artifacts, gnnNodes)
      setMessages(prev => [...prev, response])
      setIsTyping(false)
    }, 1000)
  }

  const processCommand = (cmd: string, arts: typeof artifacts, nodes: typeof gnnNodes): Message => {
    const lower = cmd.toLowerCase()

    if (lower.includes("upload") || lower.includes("add") || lower.includes("drop")) {
      return {
        id: Date.now().toString(),
        role: "morph",
        content: `Drop files in the upload zone or paste code directly. I'll immediately analyze the intent and start extracting understanding nodes for the memory graph.`,
        actions: ["Go to upload", "Paste code now"]
      }
    }

    if (lower.includes("regenerate") || lower.includes("rebuild") || lower.includes("create from")) {
      const understood = arts.filter(a => a.metadata.status === "understood")
      if (understood.length === 0) {
        return {
          id: Date.now().toString(),
          role: "morph",
          content: `No artifacts ready for regeneration yet. Upload some code first - I need to analyze and understand it before I can rebuild it from memory.`,
          actions: ["Upload now", "Show queue"]
        }
      }

      return {
        id: Date.now().toString(),
        role: "morph",
        content: `Found ${understood.length} artifact(s) ready to regenerate:\n\n${understood.map(a => `• ${a.originalName}: ${a.understanding.intent}`).join("\n")}\n\nI will rebuild each one from memory - same functionality, potentially better implementation.`,
        actions: ["Regenerate all", "Pick specific one", "Show understanding first"]
      }
    }

    if (lower.includes("understand") || lower.includes("analyze") || lower.includes("what does")) {
      const analyzed = arts.filter(a => a.metadata.status !== "analyzing")
      if (analyzed.length === 0) {
        return {
          id: Date.now().toString(),
          role: "morph",
          content: `No analyzed artifacts yet. Upload something and I'll show you what I understand about it.`,
          actions: ["Upload something", "How does analysis work?"]
        }
      }

      const latest = analyzed[0]
      return {
        id: Date.now().toString(),
        role: "morph",
        content: `Analysis of ${latest.originalName}:\n\n**Intent:** ${latest.understanding.intent}\n\n**Functionality:**\n${latest.understanding.functionality.map(f => `• ${f}`).join("\n")}\n\n**Patterns detected:** ${latest.understanding.patterns.join(", ")}\n\n**Dependencies:** ${latest.understanding.dependencies.join(", ") || "None detected"}\n\nThis understanding is now stored as ${nodes.length} nodes in the memory graph.`,
        actions: ["Regenerate this", "Improvise extension", "Upload another"]
      }
    }

    if (lower.includes("improvise") || lower.includes("extend") || lower.includes("build on")) {
      const complete = arts.filter(a => a.metadata.status === "regenerated")
      if (complete.length === 0) {
        return {
          id: Date.now().toString(),
          role: "morph",
          content: `I need some regenerated artifacts first to improvise from. Upload code, let me analyze and regenerate it, then I can build creative extensions.`,
          actions: ["Upload & auto-process", "Show me the pipeline"]
        }
      }

      return {
        id: Date.now().toString(),
        role: "morph",
        content: `Ready to improvise! I have ${complete.length} regenerated artifact(s) in my memory.\n\nI can:\n• Combine functionality from multiple artifacts\n• Extend patterns with new capabilities\n• Create bridges between unrelated features\n• Suggest architectural improvements\n\nWhat direction should I explore?`,
        actions: ["Combine all", "Extend latest", "New architecture", "Surprise me"]
      }
    }

    if (lower.includes("how") || lower.includes("explain") || lower.includes("works")) {
      return {
        id: Date.now().toString(),
        role: "morph",
        content: `Here's how the Morph Interface works:\n\n**1. Upload** -> You drop a file or paste code\n\n**2. Analyze** -> I read the code but don't store it raw. Instead I extract:\n   • What it's trying to do (intent)\n   • What capabilities it provides\n   • What patterns it uses\n   • What it depends on\n\n**3. Understand** -> I create memory nodes from this analysis\n\n**4. Regenerate** -> I build NEW code from memory that achieves the same functionality\n\n**5. Improvise** -> I can extend, combine, or transform based on all accumulated understanding\n\nThe original file is never used directly - only the understanding lives in the memory graph.`,
        actions: ["Try it now", "Show my artifacts", "Memory status"]
      }
    }

    return {
      id: Date.now().toString(),
      role: "morph",
      content: `I understand you want to: "${cmd}"\n\nCurrent status:\n• ${arts.length} artifacts uploaded\n• ${arts.filter(a => a.metadata.status === "understood").length} understood by memory graph\n• ${arts.filter(a => a.metadata.status === "regenerated").length} regenerated\n• ${nodes.length} total memory nodes\n\nI can help you upload, analyze, regenerate, or improvise. What would you like to do?`,
      actions: ["Upload new", "Analyze existing", "Regenerate", "Improvise"]
    }
  }

  const handleAction = (action: string) => {
    if (action === "Regenerate all") {
      const understood = artifacts.filter(a => a.metadata.status === "understood")
      understood.forEach(a => regenerateArtifact(a.id))
      setInput("")
      return
    }
    if (action === "Improvise extension" || action === "Extend latest") {
      const latest = artifacts.find(a => a.metadata.status === "regenerated")
      if (latest) {
        improvise("Extension", latest.id)
      }
      return
    }
    setInput(action)
    handleSend()
  }

  return (
    <div className="bg-void-800 border border-void-600 rounded-xl overflow-hidden flex flex-col h-96">
      <div className="p-4 border-b border-void-600 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-morph-500/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-morph-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Morph Assistant</h3>
          <p className="text-xs text-gray-400">Understands, doesn't store</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              msg.role === "user" ? "bg-purple-500/20" : "bg-morph-500/20"
            )}>
              {msg.role === "user" ? (
                <User className="w-4 h-4 text-purple-400" />
              ) : (
                <Brain className="w-4 h-4 text-morph-400" />
              )}
            </div>

            <div className={cn(
              "max-w-[80%] space-y-2",
              msg.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "p-3 rounded-2xl text-sm whitespace-pre-wrap",
                msg.role === "user" 
                  ? "bg-purple-600 text-white rounded-br-md" 
                  : "bg-void-700 text-gray-200 rounded-bl-md"
              )}>
                {msg.content}
              </div>

              {msg.actions && (
                <div className="flex flex-wrap gap-2">
                  {msg.actions.map((action, i) => (
                    <motion.button
                      key={i}
                      onClick={() => handleAction(action)}
                      className="px-3 py-1.5 bg-void-600 hover:bg-morph-600 text-xs text-gray-300 hover:text-white rounded-full transition-colors flex items-center gap-1"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {action}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-morph-500/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-morph-400" />
            </div>
            <div className="bg-void-700 p-3 rounded-2xl rounded-bl-md flex gap-1">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                className="w-2 h-2 bg-gray-400 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-4 border-t border-void-600">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me to analyze, regenerate, or improvise..."
            className="flex-1 px-4 py-2 bg-void-900 border border-void-600 rounded-lg text-white text-sm focus:border-morph-500 focus:outline-none"
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-morph-600 hover:bg-morph-500 disabled:bg-void-700 disabled:text-gray-500 text-white rounded-lg"
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
