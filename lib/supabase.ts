import { createClient } from '@supabase/supabase-js'
import { Artifact, SupabaseConfig } from '@/types'

let supabaseInstance: ReturnType<typeof createClient> | null = null

export function initSupabase(config: SupabaseConfig) {
  if (!config.url || !config.anonKey) throw new Error('Supabase URL and anon key required')
  supabaseInstance = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return supabaseInstance
}

export function getSupabase() {
  if (!supabaseInstance) throw new Error('Supabase not initialized. Call initSupabase first.')
  return supabaseInstance
}

export async function syncArtifactToSupabase(
  artifact: Artifact,
  tableName: string = 'artifacts'
): Promise<{ success: boolean; originalRecordId?: string; gnnRecordId?: string; error?: string }> {
  try {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    const { data: originalData, error: originalError } = await supabase
      .from(tableName)
      .upsert({
        id: `${artifact.id}_original`,
        artifact_id: artifact.id,
        version_type: 'original',
        name: artifact.originalName,
        content: artifact.originalContent,
        language: artifact.language,
        type: artifact.type,
        intent: artifact.understanding?.intent,
        status: artifact.metadata.status,
        created_at: artifact.metadata.uploadedAt,
        updated_at: now,
      })
      .select('id')
      .single()

    if (originalError) throw new Error(`Original sync failed: ${originalError.message}`)

    let gnnRecordId: string | undefined
    if (artifact.regeneration) {
      const { data: gnnData, error: gnnError } = await supabase
        .from(tableName)
        .upsert({
          id: `${artifact.id}_gnn`,
          artifact_id: artifact.id,
          version_type: 'gnn_generated',
          name: `morph_${artifact.originalName}`,
          content: artifact.regeneration.generatedCode,
          language: artifact.language,
          type: artifact.type,
          intent: artifact.understanding?.intent,
          architecture: artifact.regeneration.architecture,
          confidence: artifact.regeneration.confidence,
          improvements: artifact.regeneration.improvements,
          gnn_nodes: artifact.regeneration.gnnNodes,
          status: 'gnn_regenerated',
          created_at: artifact.metadata.uploadedAt,
          updated_at: now,
        })
        .select('id')
        .single()

      if (gnnError) throw new Error(`GNN sync failed: ${gnnError.message}`)
      gnnRecordId = gnnData.id
    }

    return { success: true, originalRecordId: originalData.id, gnnRecordId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchArtifactVersionsFromSupabase(artifactId: string, tableName: string = 'artifacts') {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.from(tableName).select('*').eq('artifact_id', artifactId).order('version_type')
    if (error) throw error
    return {
      original: data.find((r: any) => r.version_type === 'original'),
      gnn: data.find((r: any) => r.version_type === 'gnn_generated'),
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function fetchAllArtifactsFromSupabase(tableName: string = 'artifacts') {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.from(tableName).select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

export async function testSupabaseConnection(config: SupabaseConfig): Promise<boolean> {
  try {
    const client = createClient(config.url, config.anonKey)
    const { error } = await client.from('artifacts').select('count', { count: 'exact', head: true })
    if (error && error.code === '42P01') return true
    if (error) throw error
    return true
  } catch {
    return false
  }
}
