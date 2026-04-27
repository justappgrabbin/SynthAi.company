"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Play, Pause, RotateCcw, FastForward, Settings,
  Users, Heart, Brain, Zap, Shield, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, Sparkles
} from "lucide-react"
import { useMorphStore } from "@/hooks/useMorphStore"
import { cn } from "@/lib/utils"

interface SimEntity {
  id: string
  name: string
  x: number
  y: number
  state: "idle" | "moving" | "interacting" | "distressed" | "thriving"
  traits: Record<string, number>
  relationships: Record<string, number>
  currentAction?: string
  actionProgress: number
}

interface SimulationScenario {
  id: string
  title: string
  description: string
  entities: SimEntity[]
  environment: {
    width: number
    height: number
    obstacles: Array<{x: number; y: number; w: number; h: number; label: string}>
    resources: Array<{x: number; y: number; type: string; value: number}>
  }
  rules: string[]
  events: Array<{
    time: number
    description: string
    effects: Record<string, number>
  }>
  status: "running" | "paused" | "complete"
  currentTime: number
  maxTime: number
  insights: string[]
}

export function SimulationViewer({ 
  scenario, 
  onClose 
}: { 
  scenario: SimulationScenario
  onClose: () => void 
}) {
  const [simState, setSimState] = useState<SimulationScenario>(scenario)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const step = useCallback((deltaTime: number) => {
    setSimState(prev => {
      if (prev.status !== "running") return prev

      const newTime = prev.currentTime + deltaTime * speed
      const newEntities = prev.entities.map(entity => {
        let newTraits = { ...entity.traits }
        let newState = entity.state
        let newX = entity.x
        let newY = entity.y
        let newAction = entity.currentAction
        let newProgress = entity.actionProgress

        if (newTraits.stress > 70) {
          newTraits.energy = Math.max(0, newTraits.energy - 0.5 * deltaTime)
          newTraits.mood = Math.max(0, newTraits.mood - 0.3 * deltaTime)
        }

        if (newTraits.energy < 30) {
          newTraits.stress = Math.min(100, newTraits.stress + 0.2 * deltaTime)
        }

        const avgRelationship = Object.values(entity.relationships).reduce((a, b) => a + b, 0) 
          / Math.max(1, Object.keys(entity.relationships).length)
        if (avgRelationship > 60) {
          newTraits.stress = Math.max(0, newTraits.stress - 0.1 * deltaTime)
          newTraits.mood = Math.min(100, newTraits.mood + 0.1 * deltaTime)
        }

        const nearbyResource = prev.environment.resources.find(r => 
          Math.abs(r.x - entity.x) < 50 && Math.abs(r.y - entity.y) < 50
        )
        if (nearbyResource) {
          newTraits.mood = Math.min(100, newTraits.mood + nearbyResource.value * deltaTime)
          newTraits.energy = Math.min(100, newTraits.energy + nearbyResource.value * 0.5 * deltaTime)
        }

        if (newTraits.stress > 80 || newTraits.energy < 20) {
          newState = "distressed"
        } else if (newTraits.mood > 70 && newTraits.energy > 60) {
          newState = "thriving"
        } else {
          newState = "idle"
        }

        if (newState !== "distressed" && nearbyResource) {
          const dx = nearbyResource.x - entity.x
          const dy = nearbyResource.y - entity.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 10) {
            newX += (dx / dist) * 20 * deltaTime
            newY += (dy / dist) * 20 * deltaTime
            newState = "moving"
            newAction = `Moving toward ${nearbyResource.type}`
            newProgress = Math.min(1, newProgress + deltaTime)
          }
        }

        Object.keys(newTraits).forEach(key => {
          newTraits[key] = Math.max(0, Math.min(100, newTraits[key]))
        })

        newX = Math.max(20, Math.min(prev.environment.width - 20, newX))
        newY = Math.max(20, Math.min(prev.environment.height - 20, newY))

        return {
          ...entity,
          x: newX,
          y: newY,
          traits: newTraits,
          state: newState,
          currentAction: newAction,
          actionProgress: newProgress
        }
      })

      const triggeredEvents = prev.events.filter(e => e.time <= newTime && e.time > prev.currentTime)

      triggeredEvents.forEach(event => {
        newEntities.forEach(entity => {
          Object.entries(event.effects).forEach(([trait, value]) => {
            if (entity.traits[trait] !== undefined) {
              entity.traits[trait] = Math.max(0, Math.min(100, entity.traits[trait] + value))
            }
          })
        })
      })

      const newInsights = [...prev.insights]
      const avgStress = newEntities.reduce((sum, e) => sum + e.traits.stress, 0) / newEntities.length
      const avgMood = newEntities.reduce((sum, e) => sum + e.traits.mood, 0) / newEntities.length

      if (avgStress > 70 && !prev.insights.some(i => i.includes("critical stress"))) {
        newInsights.push(`⚠️ Critical stress levels detected across ${newEntities.length} entities`)
      }
      if (avgMood > 70 && !prev.insights.some(i => i.includes("thriving"))) {
        newInsights.push(`✨ Entities are thriving - positive feedback loop active`)
      }

      return {
        ...prev,
        currentTime: newTime,
        entities: newEntities,
        status: newTime >= prev.maxTime ? "complete" : "running",
        insights: newInsights
      }
    })
  }, [speed])

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
      const deltaTime = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      if (isPlaying && simState.status === "running") {
        step(deltaTime)
      }

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          renderSimulation(ctx, simState, selectedEntity)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [isPlaying, simState, selectedEntity, step])

  const renderSimulation = (
    ctx: CanvasRenderingContext2D, 
    state: SimulationScenario,
    selectedId: string | null
  ) => {
    const { width, height } = state.environment
    ctx.clearRect(0, 0, width, height)

    ctx.fillStyle = "#0a0a0f"
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = "#1a1a2e"
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    state.environment.obstacles.forEach(obs => {
      ctx.fillStyle = "#252542"
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h)
      ctx.strokeStyle = "#353552"
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h)
      ctx.fillStyle = "#666"
      ctx.font = "10px monospace"
      ctx.fillText(obs.label, obs.x + 5, obs.y + 15)
    })

    state.environment.resources.forEach(res => {
      const gradient = ctx.createRadialGradient(res.x, res.y, 0, res.x, res.y, 20)
      gradient.addColorStop(0, res.type === "energy" ? "rgba(34, 197, 94, 0.6)" : "rgba(168, 85, 247, 0.6)")
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(res.x, res.y, 20, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "#fff"
      ctx.font = "10px monospace"
      ctx.textAlign = "center"
      ctx.fillText(res.type, res.x, res.y + 4)
    })

    state.entities.forEach(entity => {
      const isSelected = entity.id === selectedId

      const glowColor = entity.state === "thriving" ? "rgba(34, 197, 94, 0.4)" :
                        entity.state === "distressed" ? "rgba(239, 68, 68, 0.4)" :
                        "rgba(168, 85, 247, 0.3)"

      const gradient = ctx.createRadialGradient(entity.x, entity.y, 0, entity.x, entity.y, isSelected ? 25 : 15)
      gradient.addColorStop(0, glowColor)
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)")

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(entity.x, entity.y, isSelected ? 25 : 15, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = entity.state === "thriving" ? "#22c55e" :
                      entity.state === "distressed" ? "#ef4444" :
                      entity.state === "moving" ? "#3b82f6" :
                      "#a855f7"
      ctx.beginPath()
      ctx.arc(entity.x, entity.y, 8, 0, Math.PI * 2)
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = "#22c55e"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(entity.x, entity.y, 12, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.fillStyle = "#fff"
      ctx.font = "10px monospace"
      ctx.textAlign = "center"
      ctx.fillText(entity.name, entity.x, entity.y - 15)

      if (entity.currentAction) {
        ctx.fillStyle = "#888"
        ctx.font = "9px monospace"
        ctx.fillText(entity.currentAction.slice(0, 20), entity.x, entity.y + 20)
      }

      Object.entries(entity.relationships).forEach(([otherId, strength]) => {
        const other = state.entities.find(e => e.id === otherId)
        if (other && strength > 30) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${strength / 200})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(entity.x, entity.y)
          ctx.lineTo(other.x, other.y)
          ctx.stroke()
        }
      })
    })

    ctx.fillStyle = "#fff"
    ctx.font = "12px monospace"
    ctx.textAlign = "left"
    ctx.fillText(`Time: ${state.currentTime.toFixed(1)}s / ${state.maxTime}s`, 10, 20)

    ctx.fillStyle = state.status === "running" ? "#22c55e" : 
                    state.status === "complete" ? "#3b82f6" : "#888"
    ctx.fillText(`Status: ${state.status.toUpperCase()}`, 10, 35)
  }

  const selectedEntityData = selectedEntity ? simState.entities.find(e => e.id === selectedEntity) : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-4 lg:inset-10 z-50 bg-void-800 border border-void-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-void-600 flex items-center justify-between bg-void-800/80">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-morph-400" />
            {simState.title}
          </h2>
          <p className="text-xs text-gray-400">{simState.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isPlaying ? "bg-morph-600 text-white" : "bg-void-700 text-gray-400 hover:text-white"
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setSimState(prev => ({ ...prev, currentTime: 0, status: "paused" }))
              setIsPlaying(false)
            }}
            className="p-2 bg-void-700 text-gray-400 hover:text-white rounded-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 bg-void-700 rounded-lg p-1">
            {[0.5, 1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "px-2 py-1 text-xs rounded transition-colors",
                  speed === s ? "bg-morph-600 text-white" : "text-gray-400 hover:text-white"
                )}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            width={simState.environment.width}
            height={simState.environment.height}
            className="w-full h-full cursor-crosshair"
            onClick={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect()
              if (!rect) return
              const x = (e.clientX - rect.left) * (simState.environment.width / rect.width)
              const y = (e.clientY - rect.top) * (simState.environment.height / rect.height)

              const clicked = simState.entities.find(entity => {
                const dx = entity.x - x
                const dy = entity.y - y
                return Math.sqrt(dx * dx + dy * dy) < 20
              })

              setSelectedEntity(clicked?.id || null)
            }}
          />
        </div>

        <div className="w-64 border-l border-void-600 bg-void-800/50 overflow-y-auto">
          <div className="p-3 border-b border-void-600">
            <h3 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
              <Brain className="w-3 h-3 text-morph-400" />
              GNN Insights
            </h3>
            <div className="space-y-1">
              {simState.insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-gray-400 p-1.5 bg-void-900 rounded"
                >
                  {insight}
                </motion.div>
              ))}
              {simState.insights.length === 0 && (
                <p className="text-xs text-gray-600">Running simulation...</p>
              )}
            </div>
          </div>

          <div className="p-3 border-b border-void-600">
            <h3 className="text-xs font-medium text-gray-300 mb-2">Active Rules</h3>
            <ul className="space-y-1">
              {simState.rules.map((rule, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                  <Settings className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {selectedEntityData && (
            <div className="p-3">
              <h3 className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {selectedEntityData.name}
              </h3>

              <div className="space-y-2">
                {Object.entries(selectedEntityData.traits).map(([trait, value]) => (
                  <div key={trait}>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 capitalize">{trait}</span>
                      <span className={cn(
                        value > 70 ? "text-morph-400" :
                        value < 30 ? "text-red-400" : "text-gray-400"
                      )}>
                        {value.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-void-900 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          value > 70 ? "bg-morph-500" :
                          value < 30 ? "bg-red-500" : "bg-blue-500"
                        )}
                        animate={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {selectedEntityData.currentAction && (
                <div className="mt-2 p-2 bg-void-900 rounded text-xs text-gray-400">
                  <span className="text-morph-400">Action:</span> {selectedEntityData.currentAction}
                </div>
              )}
            </div>
          )}

          <div className="p-3">
            <h3 className="text-xs font-medium text-gray-300 mb-2">All Entities</h3>
            <div className="space-y-1">
              {simState.entities.map(entity => (
                <button
                  key={entity.id}
                  onClick={() => setSelectedEntity(entity.id)}
                  className={cn(
                    "w-full text-left p-2 rounded text-xs transition-colors flex items-center gap-2",
                    selectedEntity === entity.id ? "bg-void-700 text-white" : "bg-void-900 text-gray-400 hover:bg-void-700"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    entity.state === "thriving" ? "bg-morph-400" :
                    entity.state === "distressed" ? "bg-red-400" :
                    "bg-blue-400"
                  )} />
                  {entity.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function parseSituationToSimulation(
  situation: string,
  gnnNodes: any[],
  artifacts: any[]
): SimulationScenario {
  const hasWork = situation.toLowerCase().includes("work") || situation.toLowerCase().includes("job") || situation.toLowerCase().includes("boss") || situation.toLowerCase().includes("deadline")
  const hasRelationship = situation.toLowerCase().includes("relationship") || situation.toLowerCase().includes("partner") || situation.toLowerCase().includes("girlfriend") || situation.toLowerCase().includes("boyfriend") || situation.toLowerCase().includes("wife") || situation.toLowerCase().includes("husband")
  const hasMoney = situation.toLowerCase().includes("money") || situation.toLowerCase().includes("financial") || situation.toLowerCase().includes("broke") || situation.toLowerCase().includes("debt")
  const hasHealth = situation.toLowerCase().includes("health") || situation.toLowerCase().includes("sick") || situation.toLowerCase().includes("tired") || situation.toLowerCase().includes("exhausted")

  const entities: SimEntity[] = []

  entities.push({
    id: "you",
    name: "You",
    x: 200 + Math.random() * 100,
    y: 200 + Math.random() * 100,
    state: "idle",
    traits: {
      mood: 50,
      energy: 60,
      stress: 40,
      health: 70,
      social: 50,
      confidence: 50
    },
    relationships: {},
    actionProgress: 0
  })

  if (hasWork) {
    entities.push({
      id: "work",
      name: "Work Pressure",
      x: 400,
      y: 100,
      state: "idle",
      traits: { mood: 30, energy: 20, stress: 90, health: 50, social: 20, confidence: 40 },
      relationships: { you: 80 },
      actionProgress: 0
    })
  }

  if (hasRelationship) {
    entities.push({
      id: "partner",
      name: "Partner",
      x: 100,
      y: 350,
      state: "idle",
      traits: { mood: 60, energy: 50, stress: 30, health: 80, social: 70, confidence: 60 },
      relationships: { you: 70 },
      actionProgress: 0
    })
  }

  if (hasMoney) {
    entities.push({
      id: "finance",
      name: "Finances",
      x: 500,
      y: 300,
      state: "idle",
      traits: { mood: 20, energy: 30, stress: 85, health: 60, social: 10, confidence: 20 },
      relationships: { you: 90 },
      actionProgress: 0
    })
  }

  const rules: string[] = [
    "High stress drains energy over time",
    "Social support reduces stress",
    "Resources improve mood and energy",
    "Low energy increases stress",
    "Positive relationships create feedback loops"
  ]

  const insightNodes = gnnNodes.filter((n: any) => n.nodeType === "insight")
  insightNodes.forEach((node: any) => {
    if (node.content.includes("stress") || node.content.includes("energy") || node.content.includes("mood")) {
      rules.push(`GNN Insight: ${node.content}`)
    }
  })

  const events: SimulationScenario["events"] = []

  if (situation.toLowerCase().includes("deadline") || situation.toLowerCase().includes("urgent")) {
    events.push({
      time: 5,
      description: "Deadline approaching",
      effects: { stress: 20, energy: -10 }
    })
  }

  if (situation.toLowerCase().includes("support") || situation.toLowerCase().includes("help")) {
    events.push({
      time: 8,
      description: "Support arrives",
      effects: { stress: -15, mood: 15, social: 10 }
    })
  }

  entities.forEach(entity => {
    if (entity.id !== "you") {
      entity.relationships.you = entity.relationships.you || 50
      const you = entities.find(e => e.id === "you")
      if (you) {
        you.relationships[entity.id] = entity.relationships.you
      }
    }
  })

  return {
    id: `sim_${Date.now()}`,
    title: "Your Situation Simulation",
    description: situation.slice(0, 100) + "...",
    entities,
    environment: {
      width: 600,
      height: 400,
      obstacles: [
        { x: 250, y: 150, w: 100, h: 60, label: "Work Zone" },
        { x: 50, y: 280, w: 80, h: 50, label: "Home" }
      ],
      resources: [
        { x: 300, y: 300, type: "energy", value: 15 },
        { x: 150, y: 150, type: "social", value: 10 }
      ]
    },
    rules,
    events,
    status: "paused",
    currentTime: 0,
    maxTime: 30,
    insights: []
  }
}
