"use client"

import { useEffect, useMemo, useState } from "react"

type ArtifactStatus = "local" | "analyzing" | "remembered" | "synced" | "queued" | "failed"
type NodeType = "intent" | "functionality" | "dependency" | "pattern" | "insight" | "source"

type Artifact = {
  id: string
  name: string
  type: string
  size: number
  content: string
  address: string
  gate: number
  status: ArtifactStatus
  createdAt: string
  understanding: {
    intent: string
    functionality: string[]
    dependencies: string[]
    patterns: string[]
    insights: string[]
    complexity: number
    suggestedHome: string
  }
}

type MemoryNode = {
  id: string
  type: NodeType
  content: string
  artifactId: string
  artifactName: string
  weight: number
  gate: number
  createdAt: string
  usageCount: number
}

type Operation = {
  id: string
  label: string
  detail: string
  status: "running" | "done" | "error"
  createdAt: string
}

const SYNTHIA_SERVER_URL = process.env.NEXT_PUBLIC_SYNTHIA_SERVER_URL || "https://synthia-server.onrender.com"
const STORAGE_KEY = "morph_interface_memory_v1"

const topHomes = [
  "SynthAi.company / OS Shell",
  "Resonance Network / Symbiant Circle",
  "You-n-i-verse / Agents + Game",
  "Stellar Proximology / Science Lab",
  "Paper Foundry / Creation Substrate",
  "Library / Source Vault",
]

function hash(input: string) {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function gateFor(name: string, content: string) {
  return (hash(`${name}:${content.slice(0, 400)}`) % 64) + 1
}

function fileType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "unknown"
  if (["tsx", "jsx", "ts", "js", "html", "css", "py", "json", "md"].includes(ext)) return ext
  if (["pdf", "doc", "docx", "txt", "epub"].includes(ext)) return "doc"
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "archive"
  if (["onnx", "pt", "safetensors", "gguf"].includes(ext)) return "model"
  return ext
}

function splitWords(text: string) {
  return Array.from(new Set(text.toLowerCase().match(/[a-z0-9_-]{3,}/g) || [])).slice(0, 80)
}

function detectHome(name: string, content: string) {
  const t = `${name} ${content}`.toLowerCase()
  if (/quest|game|agent|avatar|npc|player|universe|you-n-i|you.?n.?i/.test(t)) return "You-n-i-verse / Agents + Game"
  if (/resonance|social|circle|symbiant|network|feed|community/.test(t)) return "Resonance Network / Symbiant Circle"
  if (/stellar|physics|quantum|lab|research|field|simulation/.test(t)) return "Stellar Proximology / Science Lab"
  if (/paper|foundry|document|artifact|write|editor|creation|publish/.test(t)) return "Paper Foundry / Creation Substrate"
  if (/book|pdf|gnome|iching|i.?ching|human.?design|body|gate|hexagram|knowledge/.test(t)) return "Library / Source Vault"
  return "SynthAi.company / OS Shell"
}

function analyzeArtifact(name: string, content: string) {
  const text = content || name
  const words = splitWords(text)
  const imports = Array.from(text.matchAll(/(?:import .* from ['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g)).map((m) => m[1] || m[2]).slice(0, 12)
  const functions = Array.from(text.matchAll(/(?:function\s+|const\s+|class\s+)([A-Za-z0-9_]+)/g)).map((m) => m[1]).slice(0, 12)
  const apiCalls = Array.from(text.matchAll(/fetch\(['"]([^'"]+)['"]|axios\.[a-z]+\(['"]([^'"]+)['"]/g)).map((m) => m[1] || m[2]).slice(0, 8)

  const functionality = [
    ...functions.map((f) => `Defines ${f}`),
    ...apiCalls.map((a) => `Calls ${a}`),
  ].slice(0, 10)

  const patterns = [
    text.includes("useState") ? "React stateful UI" : "",
    text.includes("useEffect") ? "React lifecycle/effects" : "",
    text.includes("createClient") || text.includes("supabase") ? "Supabase persistence" : "",
    text.includes("FormData") || text.includes("input type=\"file\"") ? "File ingestion" : "",
    text.includes("WebSocket") || text.includes("EventSource") ? "Realtime updates" : "",
    text.includes("class ") ? "Class-based module" : "",
    text.includes("export ") ? "Reusable export surface" : "",
  ].filter(Boolean)

  const insights = [
    `Best home: ${detectHome(name, text)}`,
    imports.length ? `Depends on ${imports.slice(0, 4).join(", ")}` : "Can be remembered without external dependency metadata",
    functionality.length ? "Contains callable/buildable behavior" : "Likely source/reference material",
    words.includes("secret") || words.includes("token") || words.includes("password") ? "Security review required before frontend use" : "No obvious credential language detected",
  ]

  const intent = (() => {
    if (/upload|drop|ingest|file/i.test(text)) return "Ingests source material into the Morph system"
    if (/agent|companion|chat|assistant/i.test(text)) return "Creates or coordinates an agent-facing experience"
    if (/graph|gnn|node|edge|memory/i.test(text)) return "Builds memory/relationship structure for later reasoning"
    if (/deploy|build|orchestrator|plan/i.test(text)) return "Plans or executes build/deployment workflow"
    if (/book|knowledge|pdf|library/i.test(text)) return "Adds knowledge/library material for future understanding"
    return "Source artifact for Morph to understand and reuse"
  })()

  return {
    intent,
    functionality: functionality.length ? functionality : ["Reference/source material"],
    dependencies: imports,
    patterns: patterns.length ? patterns : ["Unclassified source pattern"],
    insights,
    complexity: Math.min(100, Math.round(text.length / 180) + imports.length * 4 + functions.length * 3),
    suggestedHome: detectHome(name, text),
  }
}

function makeNodes(artifact: Artifact): MemoryNode[] {
  const base = `${artifact.id}-${Date.now()}`
  const items: Array<[NodeType, string, number]> = [
    ["intent", artifact.understanding.intent, 0.95],
    ["source", artifact.understanding.suggestedHome, 0.9],
    ...artifact.understanding.functionality.map((x) => ["functionality", x, 0.82] as [NodeType, string, number]),
    ...artifact.understanding.dependencies.map((x) => ["dependency", x, 0.72] as [NodeType, string, number]),
    ...artifact.understanding.patterns.map((x) => ["pattern", x, 0.78] as [NodeType, string, number]),
    ...artifact.understanding.insights.map((x) => ["insight", x, 0.86] as [NodeType, string, number]),
  ]

  return items.map(([type, content, weight], index) => ({
    id: `${base}-${index}`,
    type,
    content,
    artifactId: artifact.id,
    artifactName: artifact.name,
    weight,
    gate: artifact.gate,
    createdAt: new Date().toISOString(),
    usageCount: 0,
  }))
}

export default function Page() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [nodes, setNodes] = useState<MemoryNode[]>([])
  const [ops, setOps] = useState<Operation[]>([])
  const [pasteName, setPasteName] = useState("pasted-source.tsx")
  const [paste, setPaste] = useState("")
  const [buildPrompt, setBuildPrompt] = useState("Build the next visible Morph module from what you remember")
  const [buildResult, setBuildResult] = useState("")
  const [serverUrl, setServerUrl] = useState(SYNTHIA_SERVER_URL)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      if (saved.artifacts) setArtifacts(saved.artifacts)
      if (saved.nodes) setNodes(saved.nodes)
      if (saved.serverUrl) setServerUrl(saved.serverUrl)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ artifacts, nodes, serverUrl }))
  }, [artifacts, nodes, serverUrl])

  function addOp(label: string, detail: string, status: Operation["status"] = "done") {
    setOps((old) => [{ id: crypto.randomUUID(), label, detail, status, createdAt: new Date().toLocaleTimeString() }, ...old].slice(0, 30))
  }

  async function ingest(name: string, content: string, size = content.length) {
    const type = fileType(name)
    const gate = gateFor(name, content)
    const understanding = analyzeArtifact(name, content)
    const artifact: Artifact = {
      id: crypto.randomUUID(),
      name,
      type,
      size,
      content,
      address: `morph://gate/${gate}/${hash(name + content).toString(36)}`,
      gate,
      status: "remembered",
      createdAt: new Date().toISOString(),
      understanding,
    }
    const memoryNodes = makeNodes(artifact)
    setArtifacts((old) => [artifact, ...old])
    setNodes((old) => [...memoryNodes, ...old])
    addOp("Remembered artifact", `${name} mapped to Gate ${gate} → ${understanding.suggestedHome}`)

    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, "")}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact: { ...artifact, content: content.slice(0, 200000) }, nodes: memoryNodes, preserveUnused: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setArtifacts((old) => old.map((a) => (a.id === artifact.id ? { ...a, status: "synced" } : a)))
      addOp("Synced to Synthia", `${name} sent to backend/library`, "done")
    } catch (error) {
      setArtifacts((old) => old.map((a) => (a.id === artifact.id ? { ...a, status: "queued" } : a)))
      addOp("Queued locally", `${name} remembered locally; backend unavailable`, "error")
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      const text = await file.text().catch(() => `[binary artifact: ${file.name}, ${file.size} bytes]`)
      await ingest(file.name, text, file.size)
    }
  }

  function rememberPaste() {
    if (!paste.trim()) return
    ingest(pasteName || "pasted-source.txt", paste)
    setPaste("")
  }

  const grouped = useMemo(() => {
    return topHomes.map((home) => ({
      home,
      artifacts: artifacts.filter((a) => a.understanding.suggestedHome === home),
    }))
  }, [artifacts])

  function buildFromMemory() {
    const promptWords = splitWords(buildPrompt)
    const ranked = nodes
      .map((node) => {
        const text = `${node.content} ${node.artifactName}`.toLowerCase()
        const hits = promptWords.filter((word) => text.includes(word)).length
        return { node, score: hits + node.weight + node.usageCount * 0.1 }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)

    const result = [
      `Build prompt: ${buildPrompt}`,
      "",
      "Morph remembers these strongest nodes:",
      ...ranked.map(({ node }) => `- [Gate ${node.gate}] ${node.type}: ${node.content} (${node.artifactName})`),
      "",
      "Suggested next action:",
      ranked.length
        ? `Create a module in ${ranked[0].node.content.includes("/") ? ranked[0].node.content : "SynthAi.company / OS Shell"} using the strongest remembered functionality, then keep unselected artifacts in Library / Source Vault.`
        : "Upload source material first so Morph has memory to build from.",
    ].join("\n")

    setNodes((old) => old.map((n) => (ranked.some((r) => r.node.id === n.id) ? { ...n, usageCount: n.usageCount + 1 } : n)))
    setBuildResult(result)
    addOp("Built from memory", `${ranked.length} memory nodes used`)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 rounded-3xl border border-emerald-400/20 bg-white/[0.04] p-5 shadow-2xl shadow-emerald-950/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.35em] text-emerald-300/70">Morph Interface</p>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Upload. Understand. Remember. Build.</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                This is the self-working core: every piece gets analyzed, addressed, remembered as GNN-style nodes, and routed toward the right dimension. Backend sync is attempted through Synthia, but local memory works even offline.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-100">
              <div className="font-semibold">Synthia server</div>
              <input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="mt-2 w-full min-w-[260px] rounded-xl border border-cyan-300/20 bg-black/30 px-3 py-2 text-xs outline-none"
              />
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <h2 className="mb-3 text-xl font-bold">Intake</h2>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-emerald-400/25 bg-emerald-400/[0.04] p-8 text-center hover:border-emerald-300/60">
              <span className="text-4xl">📦</span>
              <span className="mt-3 font-semibold">Drop or choose files</span>
              <span className="mt-1 text-xs text-slate-400">Code, configs, docs, models, books, kits. Binary files are stored as references.</span>
              <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>

            <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
              <input value={pasteName} onChange={(e) => setPasteName(e.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none" />
              <button onClick={rememberPaste} className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-300">Remember pasted source</button>
            </div>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste code, notes, JSON, plans, or book excerpts here..." className="mt-3 h-40 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none" />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <h2 className="mb-3 text-xl font-bold">Build from memory</h2>
            <textarea value={buildPrompt} onChange={(e) => setBuildPrompt(e.target.value)} className="h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none" />
            <button onClick={buildFromMemory} className="mt-3 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-bold text-black hover:bg-cyan-200">Ask Morph to build/improvise</button>
            <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-cyan-300/10 bg-black/40 p-3 text-xs text-cyan-50 whitespace-pre-wrap">{buildResult || "No build yet. Feed it pieces, then ask."}</pre>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <h2 className="mb-3 text-xl font-bold">Remembered artifacts</h2>
            <div className="space-y-3">
              {artifacts.length === 0 && <p className="text-sm text-slate-400">No artifacts yet. The beast is hungry.</p>}
              {artifacts.slice(0, 12).map((artifact) => (
                <article key={artifact.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{artifact.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">Gate {artifact.gate} · {artifact.type} · {artifact.status} · {artifact.address}</p>
                    </div>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-200">{artifact.understanding.suggestedHome}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{artifact.understanding.intent}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {artifact.understanding.patterns.slice(0, 4).map((p) => <span key={p} className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-slate-300">{p}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <h2 className="mb-3 text-xl font-bold">Routing map</h2>
            <div className="space-y-2">
              {grouped.map((group) => (
                <div key={group.home} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{group.home}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{group.artifacts.length}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">{group.artifacts.map((a) => a.name).join(", ") || "Waiting for matching pieces"}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <h2 className="mb-3 text-xl font-bold">Memory nodes</h2>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {nodes.slice(0, 40).map((node) => (
                <div key={node.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between text-slate-400"><span>{node.type} · Gate {node.gate}</span><span>used {node.usageCount}</span></div>
                  <div>{node.content}</div>
                  <div className="mt-1 text-slate-500">{node.artifactName}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <h2 className="mb-3 text-xl font-bold">Operation log</h2>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {ops.length === 0 && <p className="text-sm text-slate-400">No operations yet.</p>}
              {ops.map((op) => (
                <div key={op.id} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs">
                  <div className="flex items-center justify-between"><b>{op.label}</b><span className={op.status === "error" ? "text-rose-300" : "text-emerald-300"}>{op.status}</span></div>
                  <p className="mt-1 text-slate-300">{op.detail}</p>
                  <p className="mt-1 text-slate-500">{op.createdAt}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
