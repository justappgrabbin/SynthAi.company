'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileCode, FileText, File, 
  CheckCircle, AlertCircle, Zap, 
  ChevronDown, ChevronUp, Trash2, 
  Database, Sparkles, Brain, Code2,
  ArrowRight, GitBranch, Cloud, CloudOff,
  HardDrive, Lightbulb, Puzzle
} from 'lucide-react'
import { Artifact } from '@/types'
import { cn, formatBytes } from '@/lib/utils'
import { useMorphStore } from '@/hooks/useMorphStore'

interface ArtifactCardProps {
  artifact: Artifact
}

export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showVersion, setShowVersion] = useState<'original' | 'gnn'>('gnn')
  const [regenContext, setRegenContext] = useState('')
  const [showRegenInput, setShowRegenInput] = useState(false)

  const removeArtifact = useMorphStore((state) => state.removeArtifact)
  const regenerateArtifact = useMorphStore((state) => state.regenerateArtifact)
  const syncToSupabase = useMorphStore((state) => state.syncToSupabase)
  const improvise = useMorphStore((state) => state.improvise)
  const supabaseConfig = useMorphStore((state) => state.supabaseConfig)
  const isProcessing = useMorphStore((state) => state.isProcessing)

  const getIcon = () => {
    switch (artifact.type) {
      case 'code': return <FileCode className="w-5 h-5" />
      case 'text': return <FileText className="w-5 h-5" />
      default: return <File className="w-5 h-5" />
    }
  }

  const getStatusColor = () => {
    switch (artifact.metadata.status) {
      case 'regenerated': return 'text-morph-400 bg-morph-400/20'
      case 'understood': return 'text-blue-400 bg-blue-400/20'
      case 'analyzing': return 'text-purple-400 bg-purple-400/20 animate-pulse'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  const handleRegenerate = async () => {
    await regenerateArtifact(artifact.id, regenContext || undefined)
    setShowRegenInput(false)
    setRegenContext('')
  }

  const handleImprovise = async () => {
    const result = await improvise(`Extend ${artifact.originalName}`, artifact.id)
    alert(`Improvisation created using ${result.usedNodes.length} memory nodes!

${result.explanation}

Code preview:
${result.code.slice(0, 300)}...`)
  }

  return (
    <motion.div
      layout
      className={cn(
        'bg-void-800 border rounded-xl overflow-hidden transition-all',
        isExpanded ? 'border-morph-500 ring-1 ring-morph-500/50' : 'border-void-600 hover:border-void-500'
      )}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={cn('p-2 rounded-lg', getStatusColor())}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{artifact.originalName}</h3>
          <p className="text-xs text-gray-400">
            {artifact.language} • {formatBytes(artifact.metadata.size)} • 
            <span className={cn(
              artifact.metadata.status === 'understood' ? 'text-blue-400' :
              artifact.metadata.status === 'regenerated' ? 'text-morph-400' : ''
            )}>
              {artifact.metadata.status}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Memory Status */}
          {artifact.understanding.keyInsights.length > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1" title="In GNN memory">
              <Brain className="w-3 h-3" />
              {artifact.understanding.keyInsights.length} insights
            </span>
          )}

          {artifact.supabaseSync.understandingSynced && (
            <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1" title="In Supabase">
              <Cloud className="w-3 h-3" />
              Stored
            </span>
          )}

          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-void-600"
          >
            <div className="p-4 space-y-4">

              {/* SUPABASE SYNC STATUS */}
              {supabaseConfig.connected && (
                <div className="bg-void-900 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-medium text-purple-300">Supabase Storage</h4>
                    </div>

                    {!artifact.supabaseSync.understandingSynced && (
                      <motion.button
                        onClick={() => syncToSupabase(artifact.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-void-700 text-white rounded-lg text-xs flex items-center gap-1"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Cloud className="w-3 h-3" />
                        Store Memory
                      </motion.button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={cn(
                      'p-2 rounded border flex items-center gap-2',
                      artifact.supabaseSync.originalSynced 
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' 
                        : 'border-void-600 text-gray-500'
                    )}>
                      {artifact.supabaseSync.originalSynced ? <HardDrive className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                      <div>
                        <div className="font-medium">Original</div>
                        <div className="opacity-70">
                          {artifact.supabaseSync.originalSynced ? 'Reference stored' : 'Not synced'}
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      'p-2 rounded border flex items-center gap-2',
                      artifact.supabaseSync.understandingSynced 
                        ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' 
                        : 'border-void-600 text-gray-500'
                    )}>
                      {artifact.supabaseSync.understandingSynced ? <Brain className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                      <div>
                        <div className="font-medium">GNN Memory</div>
                        <div className="opacity-70">
                          {artifact.supabaseSync.understandingSynced ? 'Understanding stored' : 'Not synced'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* UNDERSTANDING / MEMORY SECTION */}
              {artifact.understanding && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-medium text-blue-300">GNN Memory (Understanding)</h4>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">Intent</p>
                    <p className="text-sm text-gray-200">{artifact.understanding.intent}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-void-900 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Functionality</p>
                      <ul className="space-y-1">
                        {artifact.understanding.functionality.map((func, i) => (
                          <li key={i} className="text-xs text-gray-300 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-morph-400" />
                            {func}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-void-900 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Patterns</p>
                      <ul className="space-y-1">
                        {artifact.understanding.patterns.map((pattern, i) => (
                          <li key={i} className="text-xs text-gray-300 flex items-center gap-1">
                            <GitBranch className="w-3 h-3 text-purple-400" />
                            {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Key Insights */}
                  {artifact.understanding.keyInsights.length > 0 && (
                    <div className="bg-void-900 rounded-lg p-3">
                      <p className="text-xs text-yellow-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Key Insights (What GNN Learned)
                      </p>
                      <ul className="space-y-1">
                        {artifact.understanding.keyInsights.map((insight, i) => (
                          <li key={i} className="text-xs text-gray-300 flex items-start gap-1">
                            <ArrowRight className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reusable Components */}
                  {artifact.understanding.reusableComponents.length > 0 && (
                    <div className="bg-void-900 rounded-lg p-3">
                      <p className="text-xs text-morph-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Puzzle className="w-3 h-3" />
                        Reusable Components
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {artifact.understanding.reusableComponents.map((comp, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-morph-500/20 text-morph-400 rounded-full">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {artifact.understanding.dependencies.length > 0 && (
                    <div className="bg-void-900 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Dependencies</p>
                      <div className="flex flex-wrap gap-1">
                        {artifact.understanding.dependencies.map((dep, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-void-700 text-gray-400 rounded">
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Complexity Score</span>
                      <span className={cn(
                        artifact.understanding.complexity > 70 ? 'text-red-400' :
                        artifact.understanding.complexity > 40 ? 'text-yellow-400' : 'text-morph-400'
                      )}>
                        {artifact.understanding.complexity}/100
                      </span>
                    </div>
                    <div className="h-2 bg-void-900 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${artifact.understanding.complexity}%` }}
                        className={cn(
                          'h-full rounded-full',
                          artifact.understanding.complexity > 70 ? 'bg-red-500' :
                          artifact.understanding.complexity > 40 ? 'bg-yellow-500' : 'bg-morph-500'
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* REGENERATION SECTION - Only shown if regenerated */}
              {artifact.regeneration && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-morph-400" />
                      <h4 className="text-sm font-medium text-morph-300">Regenerated Version</h4>
                    </div>
                    <span className="text-xs text-gray-500">
                      Confidence: {artifact.regeneration.confidence}% • 
                      Used {artifact.regeneration.gnnNodes.length} memory nodes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-morph-500/20 text-morph-400 rounded-full">
                      {artifact.regeneration.architecture}
                    </span>
                    <span className="text-xs text-gray-500">
                      Generated {new Date(artifact.regeneration.generatedAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowVersion('original')}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1',
                        showVersion === 'original' ? 'bg-blue-600 text-white' : 'bg-void-900 text-gray-500'
                      )}
                    >
                      <HardDrive className="w-3 h-3" />
                      Original
                    </button>
                    <button
                      onClick={() => setShowVersion('gnn')}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1',
                        showVersion === 'gnn' ? 'bg-morph-600 text-white' : 'bg-void-900 text-gray-500'
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      GNN Version
                    </button>
                  </div>

                  <div className="bg-void-900 rounded-lg p-3 max-h-48 overflow-y-auto border border-void-600">
                    <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                      {showVersion === 'original' 
                        ? artifact.originalContent.slice(0, 800)
                        : artifact.regeneration.generatedCode.slice(0, 800)
                      }
                      {(showVersion === 'original' 
                        ? artifact.originalContent.length 
                        : artifact.regeneration.generatedCode.length) > 800 && '...'}
                    </pre>
                  </div>

                  {artifact.regeneration.improvements.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-morph-400">GNN Suggested Improvements:</p>
                      <ul className="text-xs text-gray-400 space-y-0.5">
                        {artifact.regeneration.improvements.map((imp, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-morph-500" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex flex-wrap gap-2 pt-2">
                {/* Regenerate button - only if understood but not yet regenerated */}
                {artifact.metadata.status === 'understood' && (
                  <>
                    <motion.button
                      onClick={() => setShowRegenInput(!showRegenInput)}
                      className="py-2 px-3 bg-morph-600 hover:bg-morph-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Code2 className="w-4 h-4" />
                      Regenerate from Memory
                    </motion.button>

                    <motion.button
                      onClick={handleImprovise}
                      className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Improvise
                    </motion.button>
                  </>
                )}

                {/* If already regenerated */}
                {artifact.metadata.status === 'regenerated' && (
                  <motion.button
                    onClick={handleImprovise}
                    className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                    whileTap={{ scale: 0.95 }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Improvise Extension
                  </motion.button>
                )}

                <motion.button
                  onClick={() => removeArtifact(artifact.id)}
                  className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg ml-auto"
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Regeneration Context Input */}
              <AnimatePresence>
                {showRegenInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <p className="text-xs text-gray-500">
                      Optional: Tell the GNN what context to use (e.g., "for mobile", "with error handling", "optimized for speed")
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={regenContext}
                        onChange={(e) => setRegenContext(e.target.value)}
                        placeholder="Context for regeneration..."
                        className="flex-1 px-3 py-2 bg-void-900 border border-void-600 rounded-lg text-white text-sm focus:border-morph-500 focus:outline-none"
                      />
                      <motion.button
                        onClick={handleRegenerate}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-morph-600 hover:bg-morph-500 disabled:bg-void-700 text-white rounded-lg text-sm"
                        whileTap={{ scale: 0.95 }}
                      >
                        {isProcessing ? '...' : 'Build'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
