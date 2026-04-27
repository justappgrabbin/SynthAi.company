'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMorphStore } from '@/hooks/useMorphStore'

export function UploadZone() {
  const [isPasting, setIsPasting] = useState(false)
  const [pasteContent, setPasteContent] = useState('')
  const addArtifact = useMorphStore((state) => state.addArtifact)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const content = await file.text().catch(() => `[binary artifact: ${file.name}, ${file.size} bytes]`)
      addArtifact({
        name: file.name,
        type: file.name.endsWith('.zip') ? 'file' : 'code',
        content,
        language: file.name.split('.').pop() || 'plaintext',
      })
    }
  }, [addArtifact])

  const { getRootProps, getInputProps, isDragActive, isDragAccept } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.md', '.txt', '.sql', '.yml', '.yaml', '.css', '.html'],
      'application/zip': ['.zip'],
      'application/json': ['.json'],
    },
    multiple: true,
  })

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) return
    addArtifact({
      name: `pasted_${Date.now()}.txt`,
      type: 'text',
      content: pasteContent,
      language: 'plaintext',
    })
    setPasteContent('')
    setIsPasting(false)
  }

  return (
    <div className="space-y-4">
      <motion.div
        {...getRootProps()}
        className={cn(
          'relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300',
          isDragActive && 'border-morph-400 bg-morph-400/10',
          isDragAccept && 'scale-[1.02] border-morph-500 bg-morph-500/20',
          !isDragActive && 'border-void-600 hover:border-morph-600 hover:bg-void-800'
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ y: isDragActive ? -10 : 0, scale: isDragActive ? 1.08 : 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-morph-500/20">
            <Upload className="h-8 w-8 text-morph-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-white">
              {isDragActive ? 'Drop files here...' : 'Drop files or click to upload'}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Supports code, text, configs, markdown, and ZIP kits
            </p>
          </div>
        </motion.div>
      </motion.div>

      <motion.button
        onClick={() => setIsPasting(!isPasting)}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all',
          isPasting
            ? 'border-morph-500 bg-morph-600 text-white'
            : 'border-void-600 bg-void-800 text-gray-300 hover:border-morph-600'
        )}
        whileTap={{ scale: 0.98 }}
      >
        <FileText className="h-5 w-5" />
        {isPasting ? 'Cancel Paste' : 'Or paste code/text'}
      </motion.button>

      <AnimatePresence>
        {isPasting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste code, notes, JSON, plans, or book excerpts here..."
              className="h-48 w-full resize-none rounded-xl border border-void-600 bg-void-900 p-4 font-mono text-sm text-gray-200 focus:border-morph-500 focus:outline-none focus:ring-1 focus:ring-morph-500"
              spellCheck={false}
            />
            <motion.button
              onClick={handlePasteSubmit}
              disabled={!pasteContent.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-morph-600 py-3 font-medium text-white hover:bg-morph-500 disabled:bg-void-700 disabled:text-gray-500"
              whileTap={{ scale: 0.98 }}
            >
              <Zap className="h-4 w-4" />
              Add to Morph
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
