'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, Zap, Sparkles, Upload, Code2, 
  Gamepad2, History, Settings, Home,
  Mic, MicOff, X, ChevronUp, ChevronDown,
  Terminal, Database, Network, Lightbulb
} from 'lucide-react'
import { useMorphStore } from '@/hooks/useMorphStore'
import { cn } from '@/lib/utils'

// The Morph can invoke any system module
export type SystemModule = 
  | 'home'      // Idle, ambient presence
  | 'chat'      // Conversation mode
  | 'upload'    // File upload interface
  | 'build'     // Code generation from memory
  | 'simulate'  // Live simulation viewer
  | 'memory'    // GNN memory browser
  | 'settings'  // System configuration

interface OrchestratorProps {
  initialMode?: SystemModule
}

export function MorphOrchestrator({ initialMode = 'home' }: OrchestratorProps) {
  const [mode, setMode] = useState<SystemModule>(initialMode)
  const [isAwake, setIsAwake] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState('')

  const artifacts = useMorphStore((state) => state.artifacts)
  const gnnNodes = useMorphStore((state) => state.gnnNodes)
  const conversationMemory = useMorphStore((state) => state.conversationMemory)

  // Voice command processing
  const processVoiceCommand = useCallback((cmd: string) => {
    const lower = cmd.toLowerCase()
    setLastCommand(cmd)

    // Upload commands
    if (lower.includes('upload') || lower.includes('drop') || lower.includes('add file')) {
      setMode('upload')
      return 'Opening upload interface. Drop files or paste code.'
    }

    // Build commands
    if (lower.includes('build') || lower.includes('code') || lower.includes('generate')) {
      setMode('build')
      return 'Switching to build mode. What should I create from memory?'
    }

    // Simulate commands
    if (lower.includes('simulate') || lower.includes('show me') || lower.includes('what happens')) {
      setMode('simulate')
      return 'Opening simulation engine. Describe your situation.'
    }

    // Memory commands
    if (lower.includes('memory') || lower.includes('what do you know') || lower.includes('remember')) {
      setMode('memory')
      return 'Opening memory browser. I hold ' + gnnNodes.length + ' nodes.'
    }

    // Home/Idle
    if (lower.includes('home') || lower.includes('idle') || lower.includes('sleep')) {
      setMode('home')
      return 'Going home. I'll be here when you need me.'
    }

    // Chat
    if (lower.includes('talk') || lower.includes('chat') || lower.includes('help')) {
      setMode('chat')
      return 'I'm listening. What's on your mind?'
    }

    return 'I heard: "' + cmd + '". Say "upload", "build", "simulate", "memory", or "home" to switch modes.'
  }, [gnnNodes.length])

  // Toggle listening
  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true)
      setIsAwake(true)
      // Simulate voice recognition
      setTimeout(() => {
        setIsListening(false)
        const response = processVoiceCommand(voiceCommand || 'upload something')
        // In real implementation, this would come from Web Speech API
      }, 3000)
    } else {
      setIsListening(false)
    }
  }

  // Ambient presence when in home mode
  useEffect(() => {
    if (mode === 'home') {
      const interval = setInterval(() => {
        // Subtle ambient animation
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [mode])

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Ambient Background Glow when awake */}
      <AnimatePresence>
        {isAwake && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-morph-500/20 blur-3xl"
          />
        )}
      </AnimatePresence>

      {/* Morph Core - Always Present */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="relative">
          {/* Mode Indicator Ring */}
          <motion.div
            className="absolute -inset-4 rounded-full border-2 border-morph-500/30"
            animate={{
              scale: mode === 'home' ? [1, 1.05, 1] : [1, 1.2, 1],
              borderColor: mode === 'home' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.5)',
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Main Morph Orb */}
          <motion.button
            onClick={() => {
              setIsAwake(!isAwake)
              if (!isAwake) setMode('chat')
            }}
            className="relative w-20 h-20 rounded-full bg-void-800 border-2 border-morph-500/50 shadow-lg shadow-morph-500/20 flex items-center justify-center group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Inner animation */}
            <motion.div
              className="absolute inset-2 rounded-full bg-morph-500/20"
              animate={{
                scale: isAwake ? [1, 1.2, 1] : [1, 1.05, 1],
                opacity: isAwake ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1],
              }}
              transition={{ duration: isAwake ? 2 : 4, repeat: Infinity }}
            />

            {/* Icon based on mode */}
            <motion.div
              key={mode}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="relative z-10"
            >
              {mode === 'home' && <Home className="w-8 h-8 text-morph-400" />}
              {mode === 'chat' && <Brain className="w-8 h-8 text-morph-400" />}
              {mode === 'upload' && <Upload className="w-8 h-8 text-blue-400" />}
              {mode === 'build' && <Code2 className="w-8 h-8 text-purple-400" />}
              {mode === 'simulate' && <Gamepad2 className="w-8 h-8 text-red-400" />}
              {mode === 'memory' && <Database className="w-8 h-8 text-yellow-400" />}
              {mode === 'settings' && <Settings className="w-8 h-8 text-gray-400" />}
            </motion.div>

            {/* Status dot */}
            <div className={cn(
              'absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-void-800',
              isAwake ? 'bg-morph-400 animate-pulse' : 'bg-gray-600'
            )} />
          </motion.button>

          {/* Mode Label */}
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-void-800 border border-void-600 rounded-full text-xs text-gray-400 whitespace-nowrap"
            animate={{ opacity: isAwake ? 1 : 0 }}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode • {gnnNodes.length} nodes
          </motion.div>

          {/* Quick Mode Switcher */}
          <AnimatePresence>
            {isAwake && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-2"
              >
                {([
                  { id: 'chat', icon: Brain, label: 'Chat' },
                  { id: 'upload', icon: Upload, label: 'Upload' },
                  { id: 'build', icon: Code2, label: 'Build' },
                  { id: 'simulate', icon: Gamepad2, label: 'Sim' },
                  { id: 'memory', icon: Database, label: 'Memory' },
                ] as const).map((m) => (
                  <motion.button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      'p-2 rounded-lg transition-colors flex flex-col items-center gap-1',
                      mode === m.id 
                        ? 'bg-morph-600 text-white' 
                        : 'bg-void-800 text-gray-400 hover:text-white hover:bg-void-700'
                    )}
                    whileTap={{ scale: 0.9 }}
                    title={m.label}
                  >
                    <m.icon className="w-4 h-4" />
                    <span className="text-[10px]">{m.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Top Bar - System Status */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3 bg-void-800/80 backdrop-blur-sm border border-void-600 rounded-xl px-4 py-2">
          <Brain className="w-4 h-4 text-morph-400" />
          <span className="text-xs text-gray-400">
            {artifacts.length} artifacts • {gnnNodes.length} nodes • {conversationMemory.length} conversations
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Command Button */}
          <motion.button
            onClick={toggleListening}
            className={cn(
              'p-2 rounded-full transition-colors',
              isListening 
                ? 'bg-red-500/20 text-red-400 animate-pulse' 
                : 'bg-void-800 text-gray-400 hover:text-white'
            )}
            whileTap={{ scale: 0.9 }}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </motion.button>

          {/* Mode Display */}
          <div className="bg-void-800/80 backdrop-blur-sm border border-void-600 rounded-xl px-3 py-2 flex items-center gap-2">
            {mode === 'home' && <Home className="w-4 h-4 text-morph-400" />}
            {mode === 'chat' && <Brain className="w-4 h-4 text-morph-400" />}
            {mode === 'upload' && <Upload className="w-4 h-4 text-blue-400" />}
            {mode === 'build' && <Code2 className="w-4 h-4 text-purple-400" />}
            {mode === 'simulate' && <Gamepad2 className="w-4 h-4 text-red-400" />}
            {mode === 'memory' && <Database className="w-4 h-4 text-yellow-400" />}
            <span className="text-xs text-gray-300 capitalize">{mode}</span>
          </div>
        </div>
      </div>

      {/* Voice Command Feedback */}
      <AnimatePresence>
        {lastCommand && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-void-800 border border-morph-500/30 rounded-xl px-4 py-2 text-sm text-gray-300"
          >
            <span className="text-morph-400">Heard:</span> "{lastCommand}"
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module Interface Overlay */}
      <AnimatePresence mode="wait">
        {mode !== 'home' && mode !== 'chat' && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-20 bg-void-800/95 backdrop-blur-xl border border-void-600 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Module Header */}
            <div className="p-4 border-b border-void-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mode === 'upload' && <Upload className="w-5 h-5 text-blue-400" />}
                {mode === 'build' && <Code2 className="w-5 h-5 text-purple-400" />}
                {mode === 'simulate' && <Gamepad2 className="w-5 h-5 text-red-400" />}
                {mode === 'memory' && <Database className="w-5 h-5 text-yellow-400" />}
                <h2 className="font-medium text-white capitalize">{mode} Module</h2>
              </div>
              <button
                onClick={() => setMode('home')}
                className="p-1.5 text-gray-500 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Module Content */}
            <div className="p-6 h-full overflow-y-auto">
              {mode === 'upload' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Drop files here or paste code. I'll understand and remember them.</p>
                  <div className="border-2 border-dashed border-void-600 rounded-xl p-12 text-center hover:border-morph-500 transition-colors">
                    <Upload className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400">Drop files or click to upload</p>
                  </div>
                </div>
              )}

              {mode === 'build' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">I'll generate code from my {gnnNodes.length} memory nodes.</p>
                  <div className="bg-void-900 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">What should I build?</p>
                    <input 
                      type="text" 
                      placeholder="Describe what you need..."
                      className="w-full px-3 py-2 bg-void-800 border border-void-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {mode === 'simulate' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Describe a situation and I'll simulate it in real-time.</p>
                  <div className="bg-void-900 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">Your situation:</p>
                    <textarea 
                      placeholder="I'm stressed at work and..."
                      className="w-full h-24 px-3 py-2 bg-void-800 border border-void-600 rounded-lg text-white text-sm resize-none"
                    />
                    <button className="mt-2 px-4 py-2 bg-morph-600 text-white rounded-lg text-sm">
                      Run Simulation
                    </button>
                  </div>
                </div>
              )}

              {mode === 'memory' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">Browse my GNN memory graph.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['functionality', 'pattern', 'dependency', 'insight', 'reusable_component'].map(type => {
                      const count = gnnNodes.filter(n => n.nodeType === type).length
                      return (
                        <div key={type} className="bg-void-900 rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-morph-400">{count}</div>
                          <div className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
