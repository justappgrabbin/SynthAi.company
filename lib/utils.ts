import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'html': 'html',
    'sql': 'sql',
    'yml': 'yaml',
    'yaml': 'yaml',
    'sh': 'shell',
    'bash': 'shell',
  }
  return langMap[ext] || 'plaintext'
}

export function analyzeCompleteness(content: string): { score: number; missing: string[] } {
  const missing: string[] = []
  let score = 100

  if (content.includes('TODO') || content.includes('FIXME')) {
    missing.push('Contains TODO/FIXME markers')
    score -= 15
  }

  if (content.includes('// ...') || content.includes('/* ... */')) {
    missing.push('Contains placeholder ellipsis')
    score -= 10
  }

  const openBraces = (content.match(/{/g) || []).length
  const closeBraces = (content.match(/}/g) || []).length
  if (openBraces !== closeBraces) {
    missing.push('Unclosed braces detected')
    score -= 20
  }

  const gnnPatterns = [
    'morph', 'gnn', 'graph', 'neural', 'tensor', 'tfjs',
    'messagePassing', 'adjacency', 'node', 'edge', 'layer'
  ]
  const hasGNN = gnnPatterns.some(p => content.toLowerCase().includes(p.toLowerCase()))

  if (!hasGNN && content.length > 500) {
    missing.push('No GNN patterns detected - may need integration')
    score -= 5
  }

  return { score: Math.max(0, score), missing }
}

export function extractGNNComponents(content: string): string[] {
  const components: string[] = []
  const patterns = [
    { regex: /class\s+(\w+GNN|Morph\w+)/g, name: 'GNN Class' },
    { regex: /messagePassing|MessagePassing/g, name: 'Message Passing' },
    { regex: /adjacencyMatrix|adjacency|Adjacency/g, name: 'Adjacency Matrix' },
    { regex: /tf\.tensor|tfjs|@tensorflow/g, name: 'TensorFlow.js' },
    { regex: /graph\.addNode|graph\.addEdge/g, name: 'Graph Operations' },
    { regex: /aggregate|Aggregate/g, name: 'Aggregation' },
    { regex: /update|Update/g, name: 'Update Function' },
  ]

  patterns.forEach(({ regex, name }) => {
    if (regex.test(content)) {
      components.push(name)
    }
  })

  return components
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
