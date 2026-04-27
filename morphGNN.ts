import { Artifact, GNNNode, MorphOperation } from '@/types'

// Morph Semantic Memory Engine
// Stores reconstructable blueprints, not just summaries

export type RegenerationMode = 'exact' | 'cleaned' | 'improved'

export class MorphMemoryEngine {
  private nodes: Map<string, GNNNode> = new Map()
  private operations: MorphOperation[] = []
  private nodeCounter = 0

  // Hydrate from persisted nodes after reload
  hydrate(nodes: GNNNode[]): void {
    for (const node of nodes) {
      this.nodes.set(node.id, node)
      const num = parseInt(node.id.split('_')[1] || '0')
      this.nodeCounter = Math.max(this.nodeCounter, num)
    }
  }

  async analyzeArtifact(artifact: Artifact): Promise<Artifact> {
    this.addOperation('analyze', artifact.id, `Analyzing ${artifact.originalName}...`)

    const content = artifact.originalContent

    // Extract understanding
    const intent = this.extractIntent(content)
    const functionality = this.extractFunctionality(content)
    const dependencies = this.extractDependencies(content)
    const patterns = this.extractPatterns(content)
    const complexity = this.calculateComplexity(content)
    const keyInsights = this.extractKeyInsights(content, intent, functionality)
    const reusableComponents = this.extractReusableComponents(content, functionality)

    // NEW: Store source chunks for exact reconstruction
    this.createSourceChunks(content, artifact.id)

    // NEW: Store file blueprint
    const blueprint = this.extractBlueprint(content)
    this.createNode('file_blueprint', JSON.stringify(blueprint), artifact.id)

    // Store understanding nodes
    for (const func of functionality) {
      this.createNode('functionality', func, artifact.id)
    }
    for (const pattern of patterns) {
      this.createNode('pattern', pattern, artifact.id)
    }
    for (const dep of dependencies) {
      this.createNode('dependency', dep, artifact.id)
    }
    for (const insight of keyInsights) {
      this.createNode('insight', insight, artifact.id)
    }
    for (const comp of reusableComponents) {
      this.createNode('reusable_component', comp, artifact.id)
    }

    this.completeOperation('analyze', artifact.id, 
      `Understood: ${intent}. Created ${functionality.length + patterns.length + dependencies.length} memory nodes + source chunks.`)

    return {
      ...artifact,
      understanding: { 
        intent, functionality, dependencies, patterns, complexity, 
        keyInsights, reusableComponents 
      },
      metadata: {
        ...artifact.metadata,
        status: 'understood'
      }
    }
  }

  async rememberArtifact(artifact: Artifact): Promise<void> {
    if (!artifact.understanding) return
    this.addOperation('remember', artifact.id, 
      `Committing ${artifact.originalName} to memory...`)
    this.strengthenConnections(artifact.id)
    const artifactNodes = this.findArtifactNodes(artifact.id)
    for (const node of artifactNodes) {
      node.weight = Math.min(1.0, node.weight + 0.2)
    }
    this.completeOperation('remember', artifact.id, 
      `Committed ${artifactNodes.length} nodes.`)
  }

  async regenerateArtifact(
    artifact: Artifact, 
    context?: string,
    mode: RegenerationMode = 'exact'
  ): Promise<Artifact> {
    if (!artifact.understanding) return artifact

    this.addOperation('regenerate', artifact.id, 
      `Regenerating ${artifact.originalName} (mode: ${mode})...`)

    const { intent, functionality, dependencies, patterns, complexity } = artifact.understanding

    // Get ALL artifact nodes + relevant memory nodes
    const artifactNodes = this.findArtifactNodes(artifact.id)
    const relevantNodes = [
      ...artifactNodes,
      ...this.findRelevantNodes(intent, context)
    ]

    for (const node of relevantNodes) {
      node.usageCount++
      node.lastUsedAt = new Date().toISOString()
    }

    // NEW: Mode-aware regeneration
    let generatedCode: string

    if (mode === 'exact') {
      // Reconstruct from source chunks
      generatedCode = this.reconstructExact(artifact.id)
    } else if (mode === 'cleaned') {
      // Reconstruct then format
      const exact = this.reconstructExact(artifact.id)
      generatedCode = this.cleanCode(exact)
    } else {
      // Improved: use understanding + memory to evolve
      generatedCode = this.generateImprovedVersion(
        intent, functionality, dependencies, patterns, relevantNodes, context
      )
    }

    const improvements = mode === 'improved' 
      ? this.suggestImprovements(artifact.understanding, relevantNodes)
      : []

    const regeneration = {
      generatedCode,
      architecture: this.selectArchitecture(patterns, complexity, relevantNodes),
      confidence: mode === 'exact' ? 95 : this.calculateConfidence(relevantNodes),
      improvements,
      gnnNodes: relevantNodes.map(n => n.id),
      generatedAt: new Date().toISOString(),
      mode
    }

    this.completeOperation('regenerate', artifact.id, 
      `${mode} regeneration complete (${regeneration.confidence}% confidence)`)

    return {
      ...artifact,
      regeneration,
      metadata: {
        ...artifact.metadata,
        status: 'regenerated'
      }
    }
  }

  async recall(query: string): Promise<{ 
    relevantNodes: GNNNode[]
    insights: string[]
    suggestedComponents: string[]
  }> {
    this.addOperation('recall', 'system', `Recalling memory for: ${query}`)
    const relevantNodes = this.findRelevantNodes(query)
    const insights = relevantNodes.filter(n => n.nodeType === 'insight').map(n => n.content)
    const suggestedComponents = relevantNodes.filter(n => n.nodeType === 'reusable_component').map(n => n.content)
    this.completeOperation('recall', 'system', 
      `Found ${relevantNodes.length} relevant memory nodes`)
    return { relevantNodes, insights, suggestedComponents }
  }

  async improvise(request: string, baseArtifact?: Artifact): Promise<{ 
    code: string
    explanation: string
    usedNodes: GNNNode[]
  }> {
    this.addOperation('improvise', 'system', `Improvising: ${request}`)
    const allNodes = Array.from(this.nodes.values())
    const relevantNodes = allNodes.filter(n => 
      n.content.toLowerCase().includes(request.toLowerCase()) ||
      n.nodeType === 'improvement' ||
      n.nodeType === 'reusable_component' ||
      n.usageCount > 0
    )
    for (const node of relevantNodes) {
      node.usageCount++
      node.lastUsedAt = new Date().toISOString()
    }
    const combinedPatterns = relevantNodes.filter(n => n.nodeType === 'pattern').map(n => n.content)
    const combinedFuncs = relevantNodes.filter(n => n.nodeType === 'functionality').map(n => n.content)
    const insights = relevantNodes.filter(n => n.nodeType === 'insight').map(n => n.content)

    const code = `// Morph Improvisation: ${request}
// Built from ${relevantNodes.length} memory nodes

// Insights applied:
${insights.slice(0, 3).map(i => `// - ${i}`).join('\n')}

// Patterns combined: ${combinedPatterns.slice(0, 3).join(', ')}
// Capabilities integrated: ${combinedFuncs.slice(0, 3).join(', ')}

export async function improvise${this.pascalCase(request)}() {
  // Drawing from ${relevantNodes.length} memory nodes...
  const understanding = await recallMemory('${request}');
  const result = await buildFromUnderstanding(understanding);
  return enhanceWithPatterns(result);
}
`

    const explanation = `Created improvisation "${request}" by combining ${relevantNodes.length} memory nodes. Applied insights: ${insights.slice(0, 3).join(', ')}.`

    this.completeOperation('improvise', 'system', 
      `Improvisation complete using ${relevantNodes.length} memory nodes`)

    return { code, explanation, usedNodes: relevantNodes }
  }

  // ========== SOURCE CHUNK STORAGE ==========
  private createSourceChunks(content: string, artifactId: string): void {
    // Split into ~2000 char chunks with overlap for context
    const chunkSize = 2000
    const overlap = 200
    const chunks: string[] = []

    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      chunks.push(content.slice(i, i + chunkSize))
    }

    for (let i = 0; i < chunks.length; i++) {
      this.createNode('source_chunk', chunks[i], artifactId)
    }
  }

  // ========== FILE BLUEPRINT ==========
  private extractBlueprint(content: string): object {
    return {
      imports: [...content.matchAll(/import\s+.+\s+from\s+['"].+['"]/g)].map(m => m[0]),
      exports: [...content.matchAll(/export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+\w+/g)].map(m => m[0]),
      functions: [...content.matchAll(/(?:function|const)\s+(\w+)/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i),
      classes: [...content.matchAll(/class\s+(\w+)/g)].map(m => m[1]),
      interfaces: [...content.matchAll(/interface\s+(\w+)/g)].map(m => m[1]),
      hasJSX: content.includes('return (') || content.includes('<div') || content.includes('</'),
      hasAsync: content.includes('async') || content.includes('await'),
      hasHooks: content.includes('useState') || content.includes('useEffect'),
      lineCount: content.split('\n').length,
      chunkCount: Math.ceil(content.length / 1800)
    }
  }

  // ========== EXACT RECONSTRUCTION ==========
  private reconstructExact(artifactId: string): string {
    const chunks = Array.from(this.nodes.values())
      .filter(n => n.nodeType === 'source_chunk' && n.sourceArtifact === artifactId)
      .sort((a, b) => a.id.localeCompare(b.id)) // Preserve order

    if (chunks.length === 0) {
      return '// No source chunks found for exact reconstruction'
    }

    // Rejoin chunks (removing overlap)
    let result = chunks[0].content
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1].content
      const curr = chunks[i].content
      // Find overlap
      let overlap = 0
      for (let j = Math.min(prev.length, curr.length); j > 0; j--) {
        if (prev.slice(-j) === curr.slice(0, j)) {
          overlap = j
          break
        }
      }
      result += curr.slice(overlap)
    }

    return result
  }

  // ========== CODE CLEANING ==========
  private cleanCode(code: string): string {
    // Remove extra blank lines, normalize indentation
    return code
      .split('\n')
      .map(line => line.replace(/\t/g, '  '))
      .filter((line, i, arr) => !(line.trim() === '' && arr[i + 1]?.trim() === ''))
      .join('\n')
  }

  // ========== IMPROVED GENERATION ==========
  private generateImprovedVersion(
    intent: string,
    functionality: string[],
    dependencies: string[],
    patterns: string[],
    relevantNodes: GNNNode[],
    context?: string
  ): string {
    let code = `// Morph Memory Regenerated Module
// Original Intent: ${intent}
// Context: ${context || 'General purpose'}
// Built from ${relevantNodes.length} memory nodes

`
    for (const dep of dependencies) {
      if (!dep.includes(' ')) {
        code += `import { ${this.camelCase(dep)} } from '${dep}'
`
      }
    }
    code += '
'

    const insights = relevantNodes.filter(n => n.nodeType === 'insight')
    if (insights.length > 0) {
      code += `// Applied insights from memory:
`
      for (const insight of insights.slice(0, 3)) {
        code += `// - ${insight.content}
`
      }
      code += '
'
    }

    code += `/**
 * ${intent}
 * Auto-generated from memory understanding
 */
`
    code += `export class Morph${this.pascalCase(intent.split(' ')[0])} {
`

    for (const func of functionality) {
      const methodName = this.camelCase(func.replace(/^(Export|Method):\s*/, ''))
      code += `  /**
   * ${func}
   */
`
      code += `  async ${methodName}(input: any): Promise<any> {
`
      code += `    // Memory-generated implementation
`
      code += `    // Based on pattern: ${patterns[0] || 'standard'}
`
      code += `    const result = await this.process(input);
`
      code += `    return result;
`
      code += `  }

`
    }

    code += `  private async process(input: any): Promise<any> {
`
    code += `    // Core processing logic derived from memory analysis
`
    code += `    return input;
`
    code += `  }
`
    code += `}
`

    return code
  }

  // ========== EXISTING METHODS ==========
  private extractIntent(content: string): string {
    const commentPatterns = [
      /\/\*\*\s*\n\s*\*\s*(.+?)\n/s,
      /\/\/\s*(.+?)(?:\n|$)/,
      /#\s*(.+?)(?:\n|$)/,
    ]
    for (const pattern of commentPatterns) {
      const match = content.match(pattern)
      if (match) return match[1].trim()
    }
    const classMatch = content.match(/class\s+(\w+)/)
    const funcMatch = content.match(/function\s+(\w+)/)
    if (classMatch) return `Implements ${classMatch[1]} functionality`
    if (funcMatch) return `Provides ${funcMatch[1]} capability`
    return 'Unknown functionality - requires analysis'
  }

  private extractFunctionality(content: string): string[] {
    const functions: string[] = []
    const exportMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)
    for (const match of exportMatches) {
      functions.push(`Export: ${match[1]}`)
    }
    const methodMatches = content.matchAll(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g)
    for (const match of methodMatches) {
      if (!['if', 'while', 'for', 'switch', 'catch'].includes(match[1])) {
        functions.push(`Method: ${match[1]}`)
      }
    }
    const apiMatches = content.matchAll(/(?:fetch|axios|http)\s*\(/g)
    let apiCount = 0
    for (const _ of apiMatches) apiCount++
    if (apiCount > 0) functions.push(`API integration (${apiCount} endpoints)`)
    if (content.includes('useState') || content.includes('useReducer')) {
      functions.push('State management')
    }
    if (content.includes('onClick') || content.includes('onChange') || content.includes('addEventListener')) {
      functions.push('Event handling')
    }
    return functions.length > 0 ? functions : ['Basic functionality']
  }

  private extractDependencies(content: string): string[] {
    const deps: string[] = []
    const importMatches = content.matchAll(/from\s+['"]([^'"]+)['"]/g)
    for (const match of importMatches) {
      deps.push(match[1])
    }
    const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)
    for (const match of requireMatches) {
      deps.push(match[1])
    }
    if (content.includes('supabase')) deps.push('Supabase client')
    if (content.includes('tensorflow') || content.includes('tf.')) deps.push('TensorFlow.js')
    if (content.includes('three')) deps.push('Three.js')
    if (content.includes('react')) deps.push('React')
    return [...new Set(deps)]
  }

  private extractPatterns(content: string): string[] {
    const patterns: string[] = []
    if (content.includes('class') && content.includes('extends')) patterns.push('Inheritance')
    if (content.includes('interface')) patterns.push('Interface segregation')
    if (content.includes('useEffect') || content.includes('useMemo')) patterns.push('React hooks')
    if (content.includes('create') || content.includes('factory')) patterns.push('Factory pattern')
    if (content.includes('observer') || content.includes('subscribe')) patterns.push('Observer pattern')
    if (content.includes('Map') || content.includes('Set')) patterns.push('Collection management')
    if (content.includes('async') || content.includes('await')) patterns.push('Async/await')
    if (content.includes('try') && content.includes('catch')) patterns.push('Error handling')
    if (content.includes('reduce') || content.includes('map')) patterns.push('Functional programming')
    return patterns.length > 0 ? patterns : ['Procedural']
  }

  private extractKeyInsights(content: string, intent: string, functionality: string[]): string[] {
    const insights: string[] = []
    if (content.includes('graph') || content.includes('node') || content.includes('edge')) {
      insights.push('Graph-based architecture suitable for network problems')
    }
    if (content.includes('neural') || content.includes('tensor') || content.includes('layer')) {
      insights.push('Neural network components - can be extended with ML capabilities')
    }
    if (content.includes('stream') || content.includes('pipe')) {
      insights.push('Streaming architecture - good for real-time data processing')
    }
    if (content.includes('cache') || content.includes('memo')) {
      insights.push('Caching strategy detected - performance optimization available')
    }
    if (content.includes('queue') || content.includes('worker')) {
      insights.push('Queue-based processing - scalable for background tasks')
    }
    if (functionality.some(f => f.includes('API'))) {
      insights.push('API integration pattern - reusable for other service connections')
    }
    if (functionality.some(f => f.includes('State'))) {
      insights.push('State management pattern - applicable to other UI components')
    }
    return insights.length > 0 ? insights : ['General utility functionality']
  }

  private extractReusableComponents(content: string, functionality: string[]): string[] {
    const components: string[] = []
    const utilMatches = content.matchAll(/(?:export\s+)?(?:function|const)\s+(\w+(?:Util|Helper|Tool))/g)
    for (const match of utilMatches) {
      components.push(`Utility: ${match[1]}`)
    }
    if (content.includes('config') || content.includes('options') || content.includes('settings')) {
      components.push('Configuration pattern')
    }
    if (content.includes('validate') || content.includes('schema') || content.includes('check')) {
      components.push('Validation logic')
    }
    if (content.includes('transform') || content.includes('parse') || content.includes('format')) {
      components.push('Data transformation utilities')
    }
    return components.length > 0 ? components : ['Core functionality']
  }

  private calculateComplexity(content: string): number {
    let score = 50
    const lines = content.split('\n').length
    score += Math.min(lines / 10, 20)
    const maxDepth = this.getMaxNestingDepth(content)
    score += maxDepth * 5
    const funcCount = (content.match(/function/g) || []).length
    score += funcCount * 2
    if (content.includes('async')) score += 10
    if (content.includes('Promise')) score += 5
    return Math.min(100, Math.round(score))
  }

  private getMaxNestingDepth(content: string): number {
    let maxDepth = 0
    let currentDepth = 0
    for (const char of content) {
      if (char === '{') {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
      } else if (char === '}') {
        currentDepth--
      }
    }
    return maxDepth
  }

  private findRelevantNodes(query: string, context?: string): GNNNode[] {
    const allNodes = Array.from(this.nodes.values())
    const queryLower = query.toLowerCase()
    return allNodes.filter(n => {
      const contentLower = n.content.toLowerCase()
      const matchesQuery = contentLower.includes(queryLower)
      const matchesContext = context ? contentLower.includes(context.toLowerCase()) : false
      const isReusable = n.nodeType === 'reusable_component'
      const isInsight = n.nodeType === 'insight'
      const hasBeenUsed = n.usageCount > 0
      return matchesQuery || matchesContext || isReusable || (isInsight && hasBeenUsed)
    }).sort((a, b) => {
      const scoreA = a.weight + (a.usageCount * 0.1)
      const scoreB = b.weight + (b.usageCount * 0.1)
      return scoreB - scoreA
    })
  }

  private findArtifactNodes(artifactId: string): GNNNode[] {
    return Array.from(this.nodes.values()).filter(n => n.sourceArtifact === artifactId)
  }

  private strengthenConnections(artifactId: string): void {
    const artifactNodes = this.findArtifactNodes(artifactId)
    for (let i = 0; i < artifactNodes.length; i++) {
      for (let j = i + 1; j < artifactNodes.length; j++) {
        if (!artifactNodes[i].connections.includes(artifactNodes[j].id)) {
          artifactNodes[i].connections.push(artifactNodes[j].id)
        }
        if (!artifactNodes[j].connections.includes(artifactNodes[i].id)) {
          artifactNodes[j].connections.push(artifactNodes[i].id)
        }
      }
    }
  }

  private selectArchitecture(patterns: string[], complexity: number, nodes: GNNNode[]): string {
    if (patterns.includes('React hooks')) return 'React Component Architecture'
    if (complexity > 70) return 'Microservices'
    if (patterns.includes('Observer pattern')) return 'Event-Driven'
    if (patterns.includes('Factory pattern')) return 'Factory Pattern'
    if (nodes.some(n => n.nodeType === 'insight' && n.content.includes('Graph'))) return 'Graph-Based'
    return 'Modular'
  }

  private calculateConfidence(nodes: GNNNode[]): number {
    if (nodes.length === 0) return 50
    const avgWeight = nodes.reduce((sum, n) => sum + n.weight, 0) / nodes.length
    const usageBonus = Math.min(20, nodes.reduce((sum, n) => sum + n.usageCount, 0) * 2)
    return Math.round(Math.min(100, 50 + avgWeight * 30 + usageBonus))
  }

  private suggestImprovements(understanding: Artifact['understanding'], nodes: GNNNode[]): string[] {
    const improvements: string[] = []
    if (understanding.complexity > 80) {
      improvements.push('Consider breaking into smaller modules')
    }
    if (!understanding.patterns.includes('Error handling')) {
      improvements.push('Add comprehensive error handling')
    }
    if (!understanding.patterns.includes('Async/await') && understanding.dependencies.some(d => d.includes('api'))) {
      improvements.push('Use async/await for API calls')
    }
    const improvementNodes = nodes.filter(n => n.nodeType === 'improvement')
    for (const node of improvementNodes) {
      improvements.push(node.content)
    }
    return improvements
  }

  private createNode(type: GNNNode['nodeType'], content: string, sourceId: string): GNNNode {
    const id = `node_${++this.nodeCounter}_${Date.now()}`
    const node: GNNNode = {
      id,
      nodeType: type,
      content,
      weight: 0.8,
      connections: [],
      sourceArtifact: sourceId,
      createdAt: new Date().toISOString(),
      usageCount: 0
    }
    this.nodes.set(id, node)
    return node
  }

  private addOperation(type: MorphOperation['type'], target: string, description: string) {
    this.operations.push({
      id: `op_${Date.now()}`,
      type,
      target,
      description,
      status: 'running',
      timestamp: new Date().toISOString()
    })
  }

  private completeOperation(type: MorphOperation['type'], target: string, result: string) {
    const op = this.operations.find(o => o.type === type && o.target === target && o.status === 'running')
    if (op) {
      op.status = 'completed'
      op.result = result
    }
  }

  getNodes(): GNNNode[] {
    return Array.from(this.nodes.values())
  }

  getOperations(): MorphOperation[] {
    return [...this.operations]
  }

  private camelCase(str: string): string {
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase())
  }

  private pascalCase(str: string): string {
    const camel = this.camelCase(str)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
  }
}

let engineInstance: MorphMemoryEngine | null = null

export function getMorphEngine(): MorphMemoryEngine {
  if (!engineInstance) {
    engineInstance = new MorphMemoryEngine()
  }
  return engineInstance
}

export function resetMorphEngine(): void {
  engineInstance = null
}

export function hydrateEngine(nodes: GNNNode[]): void {
  const engine = getMorphEngine()
  engine.hydrate(nodes)
}
