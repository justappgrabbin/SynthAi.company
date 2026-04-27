'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  Terminal, CheckCircle, Clock, AlertCircle, 
  Zap, Sparkles, Code2, Brain, ArrowRight,
  RefreshCw
} from 'lucide-react'
import { useMorphStore } from '@/hooks/useMorphStore'
import { MorphOperation } from '@/types'
import { cn } from '@/lib/utils'

export function OperationLog() {
  const operations = useMorphStore((state) => state.operations)

  const getIcon = (type: MorphOperation['type']) => {
    switch (type) {
      case 'analyze': return <Brain className="w-4 h-4" />
      case 'understand': return <ArrowRight className="w-4 h-4" />
      case 'regenerate': return <Code2 className="w-4 h-4" />
      case 'integrate': return <Zap className="w-4 h-4" />
      case 'improvise': return <Sparkles className="w-4 h-4" />
      default: return <Terminal className="w-4 h-4" />
    }
  }

  const getStatusIcon = (status: MorphOperation['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-morph-400" />
      case 'running': return <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getTypeColor = (type: MorphOperation['type']) => {
    switch (type) {
      case 'analyze': return 'text-purple-400'
      case 'understand': return 'text-blue-400'
      case 'regenerate': return 'text-morph-400'
      case 'integrate': return 'text-yellow-400'
      case 'improvise': return 'text-pink-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="bg-void-800 border border-void-600 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-void-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-morph-400" />
          <h3 className="font-medium text-white">Operation Log</h3>
        </div>
        <span className="text-xs text-gray-400">{operations.length} operations</span>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {operations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center text-gray-500"
            >
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No operations yet</p>
              <p className="text-xs mt-1">Upload artifacts to begin the pipeline</p>
            </motion.div>
          ) : (
            operations.map((op, index) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-3 border-b border-void-600 last:border-0 hover:bg-void-700/50 transition-colors',
                  op.status === 'running' && 'bg-yellow-500/5'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getStatusIcon(op.status)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs uppercase tracking-wider font-medium', getTypeColor(op.type))}>
                        {op.type}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(op.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-200 mt-1">{op.description}</p>

                    {op.result && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-2 bg-void-900 rounded text-xs text-gray-400 font-mono"
                      >
                        {op.result}
                      </motion.div>
                    )}
                  </div>

                  <div className={getTypeColor(op.type)}>
                    {getIcon(op.type)}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
