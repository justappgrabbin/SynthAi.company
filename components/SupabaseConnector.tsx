'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, CheckCircle, XCircle, Loader2, Save } from 'lucide-react'
import { useMorphStore } from '@/hooks/useMorphStore'
import { testSupabaseConnection } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function SupabaseConnector() {
  const supabaseConfig = useMorphStore((state) => state.supabaseConfig)
  const setSupabaseConfig = useMorphStore((state) => state.setSupabaseConfig)

  const [url, setUrl] = useState(supabaseConfig.url)
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [isExpanded, setIsExpanded] = useState(!supabaseConfig.connected)

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    const result = await testSupabaseConnection({ url, anonKey, connected: false, tables: [] })
    setTestResult(result)
    setIsTesting(false)
    if (result) setSupabaseConfig({ url, anonKey, connected: true })
  }

  const handleSave = () => {
    setSupabaseConfig({ url, anonKey, connected: testResult === true || supabaseConfig.connected })
    setIsExpanded(false)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-void-600 bg-void-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 transition-colors hover:bg-void-700"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'rounded-lg p-2',
            supabaseConfig.connected ? 'bg-morph-500/20 text-morph-400' : 'bg-gray-500/20 text-gray-400'
          )}>
            <Database className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-white">Supabase Connection</h3>
            <p className="text-xs text-gray-400">
              {supabaseConfig.connected ? 'Connected and ready' : 'Not configured'}
            </p>
          </div>
        </div>
        {supabaseConfig.connected && <CheckCircle className="h-5 w-5 text-morph-400" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-void-600"
          >
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Project URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full rounded-lg border border-void-600 bg-void-900 px-3 py-2 text-sm text-white focus:border-morph-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Anon Key</label>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="w-full rounded-lg border border-void-600 bg-void-900 px-3 py-2 text-sm text-white focus:border-morph-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500">Use the public anon key only. Service keys stay server-side, where the dangerous little dragons belong.</p>
              </div>

              {testResult !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-3 text-sm',
                    testResult ? 'bg-morph-500/20 text-morph-400' : 'bg-red-500/20 text-red-400'
                  )}
                >
                  {testResult ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResult ? 'Connection successful!' : 'Connection failed. Check URL/key/table permissions.'}
                </motion.div>
              )}

              <div className="flex gap-2">
                <motion.button
                  onClick={handleTest}
                  disabled={isTesting || !url || !anonKey}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-void-700 px-4 py-2 text-sm font-medium text-white hover:bg-void-600 disabled:bg-void-800 disabled:text-gray-500"
                  whileTap={{ scale: 0.95 }}
                >
                  {isTesting ? <><Loader2 className="h-4 w-4 animate-spin" />Testing...</> : 'Test Connection'}
                </motion.button>

                <motion.button
                  onClick={handleSave}
                  disabled={!url || !anonKey}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-morph-600 px-4 py-2 text-sm font-medium text-white hover:bg-morph-500 disabled:bg-void-800 disabled:text-gray-500"
                  whileTap={{ scale: 0.95 }}
                >
                  <Save className="h-4 w-4" />
                  Save
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
