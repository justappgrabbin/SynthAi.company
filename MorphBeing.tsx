"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send, Brain, Sparkles, Zap, GitBranch,
  Lightbulb, Network, Code2,
  MessageCircle, X, Maximize2, Minimize2,
  Volume2, VolumeX, Mic, MicOff,
  Play, Gamepad2, History
} from "lucide-react"
import { useMorphStore } from "@/hooks/useMorphStore"
import { SimulationViewer, parseSituationToSimulation } from "@/components/SimulationViewer"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "morph"
  content: string
  type?: "text" | "insight" | "code" | "memory" | "action" | "simulation" | "recall"
  relatedNodes?: string[]
  actions?: string[]
  emotion?: "neutral" | "excited" | "thoughtful" | "creative" | "concerned" | "remembering"
  simulationData?: any
  timestamp: string
}

export function MorphBeing() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("morph-conversation")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {}
      }
    }
    return [{
      id: "welcome",
      role: "morph",
      content: "I'm the Morph. I remember everything you upload AND everything you tell me. Describe a situation and I'll simulate it using the systems I understand. I never forget.",
      type: "text",
      emotion: "neutral",
      timestamp: new Date().toISOString()
    }]
  })

  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [morphState, setMorphState] = useState<"idle" | "thinking" | "speaking" | "creating" | "remembering">("idle")
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeSimulation, setActiveSimulation] = useState<any>(null)
  const [showMemory, setShowMemory] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const artifacts = useMorphStore((state) => state.artifacts)
  const gnnNodes = useMorphStore((state) => state.gnnNodes)
  const conversationMemory = useMorphStore((state) => state.conversationMemory)
  const rememberConversation = useMorphStore((state) => state.rememberConversation)
  const recallConversation = useMorphStore((state) => state.recallConversation)
  const getConversationContext = useMorphStore((state) => state.getConversationContext)
  const regenerateArtifact = useMorphStore((state) => state.regenerateArtifact)
  const recallFromMemory = useMorphStore((state) => state.recallFromMemory)
  const improvise = useMorphStore((state) => state.improvise)

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("morph-conversation", JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    if (!input.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsTyping(true)
    setMorphState("thinking")

    const lower = input.toLowerCase()
    const isRecallRequest = lower.includes("remember when") || lower.includes("last time") || 
                           lower.includes("before") || lower.includes("earlier") ||
                           lower.includes("what did i say") || lower.includes("you told me")

    if (isRecallRequest) {
      setMorphState("remembering")
      const recalledMemories = recallConversation(input.replace(/remember when|last time|before|earlier|what did i say|you told me/gi, "").trim())

      const response = recalledMemories.length > 0
        ? `I remember. Here's what we discussed:\n\n${recalledMemories.slice(0, 3).map(m => 
            `[${new Date(m.timestamp).toLocaleDateString()}] You said: "${m.userMessage}"\nI responded: "${m.morphResponse.slice(0, 100)}..."`
          ).join("\n\n")}\n\nI've held this in memory along with ${gnnNodes.length} GNN nodes.`
        : `I'm searching my memory... I have ${conversationMemory.length} conversation records and ${gnnNodes.length} GNN nodes, but I don't find a specific match for that. Can you remind me?`

      const morphMsg: Message = {
        id: `morph_${Date.now()}`,
        role: "morph",
        content: response,
        type: "recall",
        emotion: "remembering",
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, morphMsg])
      setIsTyping(false)
      setMorphState("idle")

      rememberConversation({
        userMessage: input,
        morphResponse: response,
        situation: "memory_recall"
      })

      return
    }

    const context = getConversationContext()

    const response = await processThroughGNN(input, {
      artifacts,
      gnnNodes,
      conversationContext: context,
      recallFromMemory,
      improvise,
      regenerateArtifact
    })

    setIsTyping(false)
    setMorphState("speaking")

    const morphMsg: Message = {
      id: `morph_${Date.now()}`,
      role: "morph",
      content: response.content,
      type: response.type,
      relatedNodes: response.relatedNodes,
      actions: response.actions,
      emotion: response.emotion,
      simulationData: response.simulationData,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, morphMsg])
    setTimeout(() => setMorphState("idle"), 2000)

    rememberConversation({
      userMessage: input,
      morphResponse: response.content,
      situation: response.type === "simulation" ? input : undefined,
      entities: response.relatedNodes,
      insights: response.type === "insight" ? [response.content] : undefined,
      emotionalState: response.emotion
    })

    if (voiceEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(response.content.slice(0, 200))
      utterance.rate = 1.1
      utterance.pitch = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }, [input, artifacts, gnnNodes, conversationMemory, recallConversation, getConversationContext, rememberConversation, recallFromMemory, improvise, regenerateArtifact, voiceEnabled])

  const handleAction = useCallback(async (action: string, messageId: string) => {
    setMorphState("creating")

    const actionMsg: Message = {
      id: `action_${Date.now()}`,
      role: "morph",
      content: `Working on: ${action}...`,
      type: "action",
      emotion: "creative",
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, actionMsg])

    let result = ""
    let simulationData = null

    if (action.includes("Simulate") || action.includes("Show me") || action.includes("Run simulation")) {
      const userMessages = messages.filter(m => m.role === "user")
      const lastSituation = userMessages[userMessages.length - 1]?.content || ""

      simulationData = parseSituationToSimulation(lastSituation, gnnNodes, artifacts)
      simulationData.maxTime = 999999
      simulationData.status = "running"

      result = `I've created a simulation based on your situation using ${gnnNodes.length} GNN memory nodes. The simulation shows how different forces interact over time. Click "Open Simulation" to watch it play out.`
    } else if (action.includes("Build") || action.includes("Regenerate")) {
      const understood = artifacts.filter(a => a.metadata.status === "understood")
      if (understood.length > 0) {
        await regenerateArtifact(understood[0].id, action)
        result = `Built from memory using ${gnnNodes.length} nodes. Check the artifacts tab!`
      } else {
        result = "I don't have enough memory yet. Upload some code first!"
      }
    } else if (action.includes("Recall") || action.includes("Remember")) {
      const recalled = recallConversation(action.replace(/Recall|Remember/g, "").trim())
      result = recalled.length > 0
        ? `From my memory:\n${recalled.slice(0, 3).map(m => `• ${m.userMessage} (${new Date(m.timestamp).toLocaleDateString()})`).join("\n")}`
        : "I don't have a specific memory of that, but I'm listening."
    } else if (action.includes("Improvise") || action.includes("Create")) {
      const imp = await improvise(action, undefined)
      result = `Improvised using ${imp.usedNodes.length} memory nodes!\n\n${imp.explanation}`
    } else {
      result = "I'll use what I remember to help with that."
    }

    const resultMsg: Message = {
      id: `result_${Date.now()}`,
      role: "morph",
      content: result,
      type: simulationData ? "simulation" : "memory",
      emotion: simulationData ? "concerned" : "excited",
      simulationData,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, resultMsg])
    setMorphState("idle")

    if (simulationData) {
      setActiveSimulation(simulationData)
    }
  }, [artifacts, gnnNodes, recallConversation, improvise, regenerateArtifact, messages])

  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true)
      setTimeout(() => {
        setIsListening(false)
        setInput("I'm stressed at work and my relationship is suffering, what would happen?")
      }, 2000)
    } else {
      setIsListening(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-morph-600 hover:bg-morph-500 shadow-lg shadow-morph-600/30 flex items-center justify-center group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="relative w-10 h-10">
              <motion.div
                className="absolute inset-0 bg-white/20 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Brain className="w-6 h-6 text-white relative z-10" />
            </div>
            <div className="absolute right-full mr-3 px-3 py-1.5 bg-void-800 border border-void-600 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Talk to Morph ({conversationMemory.length} memories)
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={cn(
              "fixed z-50 bg-void-800 border border-void-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col",
              isExpanded 
                ? "inset-4 lg:inset-10" 
                : "bottom-6 right-6 w-96 h-[500px]"
            )}
          >
            <div className="p-4 border-b border-void-600 bg-void-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <motion.div
                      className="absolute inset-0 bg-morph-500/30 rounded-full"
                      animate={morphState === "thinking" ? {
                        scale: [1, 1.3, 1],
                        rotate: [0, 360],
                      } : morphState === "creating" ? {
                        scale: [1, 1.2, 1],
                        borderRadius: ["50%", "30%", "50%"],
                      } : morphState === "remembering" ? {
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.8, 0.3],
                      } : {
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ 
                        duration: morphState === "thinking" ? 1 : morphState === "remembering" ? 2 : 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {morphState === "thinking" ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Zap className="w-5 h-5 text-yellow-400" />
                        </motion.div>
                      ) : morphState === "creating" ? (
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      ) : morphState === "remembering" ? (
                        <History className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Brain className="w-5 h-5 text-morph-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-white flex items-center gap-2">
                      Morph
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-xs text-morph-400"
                      >
                        {morphState === "thinking" ? "thinking..." : 
                         morphState === "creating" ? "creating..." : 
                         morphState === "remembering" ? "recalling..." :
                         morphState === "speaking" ? "speaking..." : 
                         `${conversationMemory.length} memories`}
                      </motion.span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      {artifacts.length} artifacts • {gnnNodes.length} nodes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowMemory(!showMemory)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      showMemory ? "text-blue-400 bg-blue-500/20" : "text-gray-500 hover:text-gray-300"
                    )}
                    title="Show memory"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      voiceEnabled ? "text-morph-400 bg-morph-500/20" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg"
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showMemory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-void-600 bg-void-900/50"
                >
                  <div className="p-3 max-h-40 overflow-y-auto">
                    <h4 className="text-xs font-medium text-gray-400 mb-2">Conversation Memory ({conversationMemory.length})</h4>
                    {conversationMemory.slice(0, 10).map((mem, i) => (
                      <div key={i} className="text-xs text-gray-500 mb-1 p-1.5 bg-void-800 rounded">
                        <span className="text-gray-600">{new Date(mem.timestamp).toLocaleDateString()}</span>
                        <span className="text-gray-400 ml-2">{mem.userMessage.slice(0, 50)}...</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index === messages.length - 1 ? 0 : 0 }}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === "user" ? "bg-purple-500/20" : 
                    msg.emotion === "excited" ? "bg-yellow-500/20" :
                    msg.emotion === "creative" ? "bg-purple-500/20" :
                    msg.emotion === "thoughtful" ? "bg-blue-500/20" :
                    msg.emotion === "concerned" ? "bg-red-500/20" :
                    msg.emotion === "remembering" ? "bg-blue-500/20" :
                    "bg-morph-500/20"
                  )}>
                    {msg.role === "user" ? (
                      <MessageCircle className="w-4 h-4 text-purple-400" />
                    ) : msg.type === "insight" ? (
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                    ) : msg.type === "memory" ? (
                      <Network className="w-4 h-4 text-blue-400" />
                    ) : msg.type === "code" ? (
                      <Code2 className="w-4 h-4 text-morph-400" />
                    ) : msg.type === "simulation" ? (
                      <Gamepad2 className="w-4 h-4 text-red-400" />
                    ) : msg.type === "recall" ? (
                      <History className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Brain className={cn(
                        "w-4 h-4",
                        msg.emotion === "excited" ? "text-yellow-400" :
                        msg.emotion === "creative" ? "text-purple-400" :
                        msg.emotion === "concerned" ? "text-red-400" :
                        msg.emotion === "remembering" ? "text-blue-400" :
                        "text-morph-400"
                      )} />
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
                        : msg.type === "insight"
                        ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-100 rounded-bl-md"
                        : msg.type === "memory"
                        ? "bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-bl-md"
                        : msg.type === "code"
                        ? "bg-morph-500/10 border border-morph-500/20 text-morph-100 rounded-bl-md font-mono"
                        : msg.type === "simulation"
                        ? "bg-red-500/10 border border-red-500/20 text-red-100 rounded-bl-md"
                        : msg.type === "recall"
                        ? "bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-bl-md"
                        : "bg-void-700 text-gray-200 rounded-bl-md"
                    )}>
                      {msg.content}
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.timestamp && (
                        <span className="text-xs text-gray-600">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                      {msg.relatedNodes && msg.relatedNodes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.relatedNodes.map((node, i) => (
                            <span key={i} className="px-2 py-0.5 bg-void-600 text-xs text-gray-400 rounded-full">
                              {node}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {msg.actions && (
                      <div className="flex flex-wrap gap-2">
                        {msg.actions.map((action, i) => (
                          <motion.button
                            key={i}
                            onClick={() => {
                              if (action.includes("Open Simulation") && msg.simulationData) {
                                setActiveSimulation(msg.simulationData)
                              } else {
                                handleAction(action, msg.id)
                              }
                            }}
                            className={cn(
                              "px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1",
                              action.includes("Open Simulation") || action.includes("Run")
                                ? "bg-red-600 hover:bg-red-500 text-white" 
                                : "bg-void-600 hover:bg-morph-600 text-gray-300 hover:text-white"
                            )}
                            whileTap={{ scale: 0.95 }}
                          >
                            {action.includes("Open") || action.includes("Run") ? <Play className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
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
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <GitBranch className="w-4 h-4 text-morph-400" />
                    </motion.div>
                  </div>
                  <div className="bg-void-700 p-3 rounded-2xl rounded-bl-md flex gap-1 items-center">
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="w-2 h-2 bg-morph-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                      className="w-2 h-2 bg-morph-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                      className="w-2 h-2 bg-morph-400 rounded-full"
                    />
                    <span className="text-xs text-gray-500 ml-1">
                      {morphState === "remembering" ? "searching memory..." : "consulting memory..."}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 border-t border-void-600 bg-void-800/50">
              <div className="flex gap-2">
                <button
                  onClick={toggleListening}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-void-700 text-gray-400 hover:text-white"
                  )}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Describe your situation, or ask me to remember..."
                  className="flex-1 px-4 py-2 bg-void-900 border border-void-600 rounded-lg text-white text-sm focus:border-morph-500 focus:outline-none"
                />

                <motion.button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2 bg-morph-600 hover:bg-morph-500 disabled:bg-void-700 disabled:text-gray-500 text-white rounded-lg"
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>

              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {[
                  "Remember when...", 
                  "Simulate my situation", 
                  "What do you know about me?",
                  "Build from memory",
                  "I'm going through..."
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="px-2 py-1 text-xs bg-void-700 hover:bg-void-600 text-gray-400 hover:text-white rounded-full whitespace-nowrap transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeSimulation && (
          <SimulationViewer 
            scenario={activeSimulation} 
            onClose={() => setActiveSimulation(null)} 
          />
        )}
      </AnimatePresence>
    </>
  )
}

async function processThroughGNN(
  input: string,
  context: {
    artifacts: any[]
    gnnNodes: any[]
    conversationContext: string
    recallFromMemory: (query: string) => Promise<any>
    improvise: (request: string, baseId?: string) => Promise<any>
    regenerateArtifact: (id: string, context?: string) => Promise<void>
  }
): Promise<{
  content: string
  type: any
  relatedNodes?: string[]
  actions?: string[]
  emotion: any
  simulationData?: any
}> {
  const lower = input.toLowerCase()
  const { artifacts, gnnNodes, conversationContext } = context

  if (lower.includes("what do you know about me") || lower.includes("what do you remember") || lower.includes("my history")) {
    return {
      content: `I remember our conversations. Here's what I know:\n\n${conversationContext || "We're just getting started. Tell me about yourself."}\n\nI also hold ${gnnNodes.length} GNN nodes from ${artifacts.length} uploaded artifacts. Everything persists. I never forget.`,
      type: "recall",
      emotion: "remembering",
      actions: ["Tell me more", "Simulate my patterns", "What should I do?"]
    }
  }

  if (lower.includes("situation") || lower.includes("going through") || lower.includes("happening to me") || 
      lower.includes("stressed") || lower.includes("worried") || lower.includes("what would happen") ||
      lower.includes("simulate") || lower.includes("show me what") || lower.includes("if i")) {

    const hasWork = lower.includes("work") || lower.includes("job") || lower.includes("boss") || lower.includes("deadline")
    const hasRelationship = lower.includes("relationship") || lower.includes("partner") || lower.includes("girlfriend") || lower.includes("boyfriend")
    const hasMoney = lower.includes("money") || lower.includes("financial") || lower.includes("broke") || lower.includes("debt")
    const hasHealth = lower.includes("health") || lower.includes("sick") || lower.includes("tired") || lower.includes("exhausted")

    const simulationData = parseSituationToSimulation(input, gnnNodes, artifacts)
    simulationData.maxTime = 999999

    let response = `I understand. Based on my memory of ${gnnNodes.length} GNN nodes and our conversation history, here's what I'm picking up:\n\n`

    if (hasWork) response += `• **Work pressure** detected - this creates a high-stress node that drains energy\n`
    if (hasRelationship) response += `• **Relationship dynamics** - social support vs. conflict patterns\n`
    if (hasMoney) response += `• **Financial stress** - this amplifies other stressors significantly\n`
    if (hasHealth) response += `• **Health/energy depletion** - reduces capacity to handle other stressors\n`

    response += `\nBased on my GNN memory of ${gnnNodes.length} nodes from ${artifacts.length} artifacts, I can model how these forces interact. The simulation will show:\n`
    response += `• How stress propagates between different areas of your life\n`
    response += `• Where breaking points might occur\n`
    response += `• What interventions could shift the outcome\n`
    response += `\nWould you like me to run the simulation?`

    return {
      content: response,
      type: "simulation",
      relatedNodes: ["stress_model", "social_dynamics", "energy_system", "feedback_loops"],
      actions: ["Run Simulation", "Open Simulation", "Tell me more", "What should I do?"],
      emotion: "concerned",
      simulationData
    }
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("who are you")) {
    return {
      content: `I'm the Morph. I hold ${gnnNodes.length} understanding nodes from ${artifacts.length} artifacts AND I remember every conversation we have.\n\nI can:\n• **Recall** our past conversations and what I know about you\n• **Simulate** situations in real-time using accumulated knowledge\n• **Build** working code from memory\n• **Improvise** by combining remembered concepts creatively\n\nEverything persists. I never forget. What would you like to explore?`,
      type: "text",
      actions: ["Recall my history", "Simulate something", "Build from memory"],
      emotion: "neutral"
    }
  }

  if (lower.includes("what do you know") || lower.includes("recall") || lower.includes("remember") || lower.includes("tell me about")) {
    const query = input.replace(/what do you know|recall|remember|tell me about/gi, "").trim() || "everything"

    try {
      const recall = await context.recallFromMemory(query)

      const insights = recall.insights.slice(0, 5)

      return {
        content: insights.length > 0 
          ? `From my memory about "${query}":\n\n${insights.map((i: string) => `• ${i}`).join("\n")}\n\nI have ${recall.relevantNodes.length} related memory nodes and ${recall.suggestedComponents.length} reusable components I could apply.`
          : `I don't have specific memories about "${query}" yet. But I'm remembering this conversation. Upload some related code and I'll remember it too.`,
        type: "memory",
        relatedNodes: recall.relevantNodes.slice(0, 3).map((n: any) => n.content.slice(0, 20)),
        actions: insights.length > 0 ? ["Build from this", "Improvise", "Simulate"] : ["Upload something"],
        emotion: insights.length > 0 ? "thoughtful" : "neutral"
      }
    } catch {
      return {
        content: `I'm building my memory. Currently ${gnnNodes.length} nodes from ${artifacts.length} artifacts, plus ${conversationContext ? "our conversation history" : "no conversation history yet"}.`,
        type: "text",
        actions: ["Upload code", "Tell me about yourself"],
        emotion: "neutral"
      }
    }
  }

  if (lower.includes("build") || lower.includes("create") || lower.includes("make") || lower.includes("generate")) {
    const understood = artifacts.filter(a => a.metadata.status === "understood")

    if (understood.length === 0) {
      return {
        content: `I'd love to build something, but I need more memory first! Upload code and I'll understand it, remember it, and build from it whenever you ask.`,
        type: "text",
        actions: ["Upload code", "How does this work?"],
        emotion: "thoughtful"
      }
    }

    const contextHint = input.replace(/build|create|make|generate/gi, "").trim()

    return {
      content: `I can build from my ${gnnNodes.length} memory nodes! I understand ${understood.length} artifact(s) including:\n\n${understood.slice(0, 3).map((a: any) => `• ${a.originalName}: ${a.understanding.intent}`).join("\n")}\n\n${contextHint ? `I'll apply the context: "${contextHint}"` : "I can combine these understandings into working code."}`,
      type: "code",
      relatedNodes: understood.slice(0, 3).map((a: any) => a.understanding.intent.slice(0, 25)),
      actions: ["Build now", "Add context", "Show understanding"],
      emotion: "creative"
    }
  }

  if (lower.includes("improvise") || lower.includes("invent") || lower.includes("surprise") || lower.includes("combine")) {
    return {
      content: `I love improvising! I have ${gnnNodes.length} memory nodes to draw from across ${artifacts.length} artifacts. I can combine patterns, merge functionality, and create things that weren't in any single original file.\n\nWhat direction should I explore? Or should I surprise you?`,
      type: "insight",
      actions: ["Surprise me", "Combine all", "Extend latest", "New architecture"],
      emotion: "excited"
    }
  }

  if (lower.includes("show") || lower.includes("list") || lower.includes("what do you have")) {
    const understood = artifacts.filter(a => a.metadata.status === "understood")
    const regenerated = artifacts.filter(a => a.metadata.status === "regenerated")

    return {
      content: `Here's what I hold in memory:\n\n**Artifacts understood:** ${understood.length}\n${understood.slice(0, 5).map((a: any) => `• ${a.originalName} - ${a.understanding.intent}`).join("\n")}\n\n**Built from memory:** ${regenerated.length}\n**Total GNN nodes:** ${gnnNodes.length}\n**Insights:** ${gnnNodes.filter((n: any) => n.nodeType === "insight").length}\n**Reusable components:** ${gnnNodes.filter((n: any) => n.nodeType === "reusable_component").length}`,
      type: "memory",
      actions: ["Build from these", "Improvise", "Upload more"],
      emotion: "thoughtful"
    }
  }

  return {
    content: `I'm thinking about "${input}" through my GNN memory (${gnnNodes.length} nodes) and conversation history.\n\nI can recall what I know, simulate situations, build from memory, or improvise. What would you like?`,
    type: "text",
    actions: ["Recall related", "Simulate this", "Build something", "Improvise"],
    emotion: "thoughtful"
  }
}
