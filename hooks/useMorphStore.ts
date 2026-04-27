"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Artifact, GNNNode, MorphOperation, SupabaseConfig } from "@/types"
import { getMorphEngine, hydrateEngine, RegenerationMode } from "@/lib/morphGNN"
import { syncArtifactToSupabase, initSupabase } from "@/lib/supabase"
import { generateId } from "@/lib/utils"

export interface ConversationMemory {
  id: string
  timestamp: string
  userMessage: string
  morphResponse: string
  situation?: string
  entities?: string[]
  insights?: string[]
  simulationId?: string
  emotionalState?: string
}

interface MorphState {
  artifacts: Artifact[]
  gnnNodes: GNNNode[]
  operations: MorphOperation[]
  conversationMemory: ConversationMemory[]
  supabaseConfig: SupabaseConfig
  isProcessing: boolean
  activeTab: "upload" | "artifacts" | "operations" | "gnn"
  addArtifact: (data: { name: string; type: "file" | "code" | "text"; content: string; language?: string }) => void
  removeArtifact: (id: string) => void
  analyzeAndRemember: (id: string) => Promise<void>
  regenerateArtifact: (id: string, context?: string, mode?: RegenerationMode) => Promise<void>
  recallFromMemory: (query: string) => Promise<{ relevantNodes: GNNNode[]; insights: string[]; suggestedComponents: string[] }>
  syncToSupabase: (id: string) => Promise<void>
  improvise: (request: string, baseId?: string) => Promise<{ code: string; explanation: string; usedNodes: GNNNode[] }>
  rememberConversation: (memory: Omit<ConversationMemory, "id" | "timestamp">) => void
  recallConversation: (query: string) => ConversationMemory[]
  getConversationContext: () => string
  setSupabaseConfig: (config: Partial<SupabaseConfig>) => void
  setActiveTab: (tab: "upload" | "artifacts" | "operations" | "gnn") => void
  clearAll: () => void
}

export const useMorphStore = create<MorphState>()(
  persist(
    (set, get) => ({
      artifacts: [],
      gnnNodes: [],
      operations: [],
      conversationMemory: [],
      supabaseConfig: { url: "", anonKey: "", connected: false, tables: [] },
      isProcessing: false,
      activeTab: "upload",

      addArtifact: (data) => {
        const id = generateId()
        const artifact: Artifact = {
          id,
          originalName: data.name,
          originalContent: data.content,
          type: data.type,
          language: data.language,
          understanding: {
            intent: "Pending analysis",
            functionality: [],
            dependencies: [],
            patterns: [],
            complexity: 0,
            keyInsights: [],
            reusableComponents: []
          },
          supabaseSync: { understandingSynced: false, originalSynced: false },
          metadata: {
            size: data.content.length,
            uploadedAt: new Date().toISOString(),
            source: data.type === "text" ? "paste" : "upload",
            status: "analyzing",
            morphGnnRelated: false
          }
        }
        set((state) => ({ artifacts: [artifact, ...state.artifacts] }))
        void get().analyzeAndRemember(id)
      },

      removeArtifact: (id) => set((state) => ({ artifacts: state.artifacts.filter((a) => a.id !== id) })),

      analyzeAndRemember: async (id) => {
        set({ isProcessing: true })
        try {
          const artifact = get().artifacts.find((a) => a.id === id)
          if (!artifact) return
          const engine = getMorphEngine()
          engine.hydrate(get().gnnNodes)
          const analyzed = await engine.analyzeArtifact(artifact)
          await engine.rememberArtifact(analyzed)
          set((state) => ({
            artifacts: state.artifacts.map((a) => (a.id === id ? analyzed : a)),
            gnnNodes: engine.getNodes(),
            operations: engine.getOperations()
          }))
          if (get().supabaseConfig.connected) void get().syncToSupabase(id)
        } finally {
          set({ isProcessing: false })
        }
      },

      regenerateArtifact: async (id, context, mode = "exact") => {
        set({ isProcessing: true })
        try {
          const artifact = get().artifacts.find((a) => a.id === id)
          if (!artifact) return
          const engine = getMorphEngine()
          engine.hydrate(get().gnnNodes)
          const regenerated = await engine.regenerateArtifact(artifact, context, mode)
          set((state) => ({
            artifacts: state.artifacts.map((a) => (a.id === id ? regenerated : a)),
            gnnNodes: engine.getNodes(),
            operations: engine.getOperations()
          }))
          if (get().supabaseConfig.connected) void get().syncToSupabase(id)
        } finally {
          set({ isProcessing: false })
        }
      },

      recallFromMemory: async (query) => {
        const engine = getMorphEngine()
        engine.hydrate(get().gnnNodes)
        const result = await engine.recall(query)
        set({ operations: engine.getOperations(), gnnNodes: engine.getNodes() })
        return result
      },

      syncToSupabase: async (id) => {
        const artifact = get().artifacts.find((a) => a.id === id)
        if (!artifact) return
        set({ isProcessing: true })
        try {
          const result = await syncArtifactToSupabase(artifact)
          set((state) => ({
            artifacts: state.artifacts.map((a) => a.id === id ? {
              ...a,
              supabaseSync: result.success
                ? { understandingSynced: true, originalSynced: true, lastSyncAt: new Date().toISOString() }
                : { ...a.supabaseSync, syncError: result.error }
            } : a)
          }))
        } finally {
          set({ isProcessing: false })
        }
      },

      improvise: async (request, baseId) => {
        const engine = getMorphEngine()
        engine.hydrate(get().gnnNodes)
        const baseArtifact = baseId ? get().artifacts.find((a) => a.id === baseId) : undefined
        const result = await engine.improvise(request, baseArtifact)
        set({ operations: engine.getOperations(), gnnNodes: engine.getNodes() })
        return result
      },

      rememberConversation: (memory) => {
        const item: ConversationMemory = { ...memory, id: generateId(), timestamp: new Date().toISOString() }
        set((state) => ({ conversationMemory: [item, ...state.conversationMemory].slice(0, 500) }))
      },

      recallConversation: (query) => {
        const lower = query.toLowerCase()
        return get().conversationMemory.filter((m) =>
          m.userMessage.toLowerCase().includes(lower) ||
          m.morphResponse.toLowerCase().includes(lower) ||
          m.situation?.toLowerCase().includes(lower) ||
          m.entities?.some((e) => e.toLowerCase().includes(lower)) ||
          m.insights?.some((i) => i.toLowerCase().includes(lower))
        )
      },

      getConversationContext: () => get().conversationMemory.slice(0, 5).map((m) =>
        `[${new Date(m.timestamp).toLocaleDateString()}] User: "${m.userMessage}" | Situation: ${m.situation || "general"}`
      ).join("\n"),

      setSupabaseConfig: (config) => {
        const next = { ...get().supabaseConfig, ...config }
        if (next.url && next.anonKey) {
          try { initSupabase(next) } catch (err) { console.error("Supabase init failed", err) }
        }
        set({ supabaseConfig: next })
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      clearAll: () => set({ artifacts: [], gnnNodes: [], operations: [], conversationMemory: [] })
    }),
    {
      name: "morph-interface-storage",
      partialize: (state) => ({
        artifacts: state.artifacts,
        gnnNodes: state.gnnNodes,
        operations: state.operations,
        conversationMemory: state.conversationMemory,
        supabaseConfig: state.supabaseConfig
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.gnnNodes?.length) hydrateEngine(state.gnnNodes)
        if (state?.supabaseConfig?.url && state?.supabaseConfig?.anonKey) {
          try { initSupabase(state.supabaseConfig) } catch {}
        }
      }
    }
  )
)
