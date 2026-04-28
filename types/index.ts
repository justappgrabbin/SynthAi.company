export interface Artifact {
  id: string
  originalName: string
  originalContent: string
  type: "file" | "code" | "text" | "url"
  language?: string

  understanding: {
    intent: string
    functionality: string[]
    dependencies: string[]
    patterns: string[]
    complexity: number
    keyInsights: string[]
    reusableComponents: string[]
  }

  regeneration?: {
    generatedCode: string
    architecture: string
    confidence: number
    improvements: string[]
    gnnNodes: string[]
    generatedAt: string
    mode: string
  }

  supabaseSync: {
    understandingSynced: boolean
    originalSynced: boolean
    lastSyncAt?: string
    syncError?: string
  }

  metadata: {
    size: number
    uploadedAt: string
    source: "upload" | "paste"
    status: "analyzing" | "understood" | "regenerated" | "failed"
    morphGnnRelated: boolean
  }
}

export interface GNNNode {
  id: string
  nodeType: "functionality" | "pattern" | "dependency" | "constraint" | "improvement" | "insight" | "reusable_component" | "source_chunk" | "file_blueprint"
  content: string
  weight: number
  connections: string[]
  sourceArtifact: string
  createdAt: string
  usageCount: number
  lastUsedAt?: string
}

export interface MorphOperation {
  id: string
  type: "analyze" | "understand" | "remember" | "regenerate" | "sync_to_supabase" | "improvise" | "recall"
  target: string
  description: string
  status: "pending" | "running" | "completed" | "failed"
  result?: string
  timestamp: string
}

export interface SupabaseConfig {
  url: string
  anonKey: string
  connected: boolean
}
