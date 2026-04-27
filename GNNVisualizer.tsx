'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Network, Cpu, GitBranch, Layers, Box } from 'lucide-react'
import { useMorphStore } from '@/hooks/useMorphStore'
import { cn } from '@/lib/utils'

export function GNNVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gnnNodes = useMorphStore((state) => state.gnnNodes)
  const artifacts = useMorphStore((state) => state.artifacts)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    let animationId: number
    let time = 0

    const animate = () => {
      time += 0.01
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      const centerX = canvas.offsetWidth / 2
      const centerY = canvas.offsetHeight / 2
      const radius = Math.min(centerX, centerY) - 50

      // Group nodes by type
      const nodesByType: Record<string, typeof gnnNodes> = {
        functionality: gnnNodes.filter(n => n.nodeType === 'functionality'),
        pattern: gnnNodes.filter(n => n.nodeType === 'pattern'),
        dependency: gnnNodes.filter(n => n.nodeType === 'dependency'),
        improvement: gnnNodes.filter(n => n.nodeType === 'improvement'),
        constraint: gnnNodes.filter(n => n.nodeType === 'constraint'),
      }

      const colors: Record<string, string> = {
        functionality: '#22c55e',
        pattern: '#a855f7',
        dependency: '#3b82f6',
        improvement: '#f59e0b',
        constraint: '#ef4444',
      }

      // Draw connections between related nodes
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.15)'
      ctx.lineWidth = 1

      for (let i = 0; i < gnnNodes.length; i++) {
        for (let j = i + 1; j < gnnNodes.length; j++) {
          const n1 = gnnNodes[i]
          const n2 = gnnNodes[j]

          // Connect if same source or similar content
          if (n1.sourceArtifact === n2.sourceArtifact || 
              n1.connections.includes(n2.id)) {
            const angle1 = (i / Math.max(gnnNodes.length, 1)) * Math.PI * 2 + time * 0.3
            const angle2 = (j / Math.max(gnnNodes.length, 1)) * Math.PI * 2 + time * 0.3

            const x1 = centerX + Math.cos(angle1) * radius * 0.7
            const y1 = centerY + Math.sin(angle1) * radius * 0.7
            const x2 = centerX + Math.cos(angle2) * radius * 0.7
            const y2 = centerY + Math.sin(angle2) * radius * 0.7

            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
        }
      }

      // Draw nodes grouped by type in rings
      let nodeIndex = 0
      const totalNodes = Math.max(gnnNodes.length, 1)

      for (const [type, nodes] of Object.entries(nodesByType)) {
        for (let i = 0; i < nodes.length; i++) {
          const angle = (nodeIndex / totalNodes) * Math.PI * 2 + time * 0.3
          const ringRadius = radius * (0.4 + (Object.keys(nodesByType).indexOf(type) * 0.15))

          const x = centerX + Math.cos(angle) * ringRadius
          const y = centerY + Math.sin(angle) * ringRadius
          const color = colors[type] || '#22c55e'

          // Glow
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15)
          gradient.addColorStop(0, color + 'cc')
          gradient.addColorStop(0.5, color + '66')
          gradient.addColorStop(1, color + '00')

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(x, y, 15, 0, Math.PI * 2)
          ctx.fill()

          // Core
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()

          // Label on hover (simplified - just show for first few)
          if (nodeIndex < 5) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.font = '10px monospace'
            ctx.textAlign = 'center'
            ctx.fillText(nodes[i].content.slice(0, 15), x, y - 20)
          }

          nodeIndex++
        }
      }

      // Center hub - represents the Morph Engine
      const hubGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25)
      hubGradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)')
      hubGradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.3)')
      hubGradient.addColorStop(1, 'rgba(34, 197, 94, 0)')

      ctx.fillStyle = hubGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, 25, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
      ctx.fill()

      // Pulse ring
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, 25 + Math.sin(time * 2) * 5, 0, Math.PI * 2)
      ctx.stroke()

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [gnnNodes])

  const nodeTypeStats = {
    functionality: gnnNodes.filter(n => n.nodeType === 'functionality').length,
    pattern: gnnNodes.filter(n => n.nodeType === 'pattern').length,
    dependency: gnnNodes.filter(n => n.nodeType === 'dependency').length,
    improvement: gnnNodes.filter(n => n.nodeType === 'improvement').length,
    constraint: gnnNodes.filter(n => n.nodeType === 'constraint').length,
  }

  return (
    <div className="bg-void-800 border border-void-600 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-void-600">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-morph-400" />
          <h3 className="font-medium text-white">GNN Knowledge Graph</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Nodes represent extracted understanding, not files
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Node Type Legend */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(nodeTypeStats).map(([type, count]) => (
            <div key={type} className="bg-void-900 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-morph-400">{count}</div>
              <div className="text-xs text-gray-500 capitalize">{type}</div>
            </div>
          ))}
        </div>

        {/* Visualization */}
        <div className="relative h-64 bg-void-900 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />

          {gnnNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Upload artifacts to build the graph</p>
                <p className="text-xs mt-1">GNN will extract understanding as nodes</p>
              </div>
            </div>
          )}
        </div>

        {/* Active Artifacts */}
        {artifacts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Contributing Artifacts</p>
            {artifacts.map(art => (
              <div key={art.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate">{art.originalName}</span>
                <span className="text-xs text-gray-500">
                  {gnnNodes.filter(n => n.sourceArtifact === art.id).length} nodes
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
