import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * MorphOS_Backend_Secure
 *
 * Security rule:
 *   Frontend can ask. Synthia-server can act.
 *
 * This bridge intentionally keeps all private credentials out of the browser.
 * The frontend only knows public URLs and optional user/admin session headers.
 * Neo4j, GitHub, Render, Netlify, Supabase service_role, and Trident internal
 * secrets must live on Synthia-server.
 */

export type CapabilityType =
  | 'widget'
  | 'service'
  | 'app'
  | 'game'
  | 'media'
  | 'data'
  | 'ui'
  | 'agent'
  | 'unknown';

export type IntegrationMode = 'embed' | 'absorb' | 'federate' | 'hybrid';

export type MorphCapability = {
  id: string;
  name: string;
  type: CapabilityType;
  source?: string;
  mode?: IntegrationMode;
  status?: 'native' | 'queued' | 'analyzing' | 'integrated' | 'failed';
  confidence?: number;
  metadata?: Record<string, unknown>;
};

export type MorphJob = {
  id: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  message?: string;
  capabilityIds?: string[];
};

export type MorphBackendState = {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  capabilities: MorphCapability[];
  jobs: MorphJob[];
  lastEvent: unknown;
};

export type IngestInput = {
  files: Array<{
    name: string;
    type?: string;
    size?: number;
    content?: string;
    path?: string;
  }>;
  metadata?: Record<string, unknown>;
};

export type IntegrateInput = {
  jobId?: string;
  capabilityIds?: string[];
  mode: IntegrationMode;
  notes?: string;
};

export type MorphBackendContextValue = MorphBackendState & {
  apiBase: string;
  setApiBase: (url: string) => void;
  refreshCapabilities: () => Promise<MorphCapability[]>;
  ingest: (input: IngestInput) => Promise<MorphJob>;
  integrate: (input: IntegrateInput) => Promise<unknown>;
  buildPlan: (prompt: string, files?: unknown[], mode?: string) => Promise<unknown>;
  searchKnowledge: (query: string) => Promise<unknown>;
  deployRequest: (project: string, planId?: string) => Promise<unknown>;
  invokeAgent: (agentId: number | string, payload: unknown) => Promise<unknown>;
};

const FALLBACK_API_URL = 'https://synthia-server.onrender.com';
const DEFAULT_API_URL = process.env.NEXT_PUBLIC_SYNTHIA_API_URL || process.env.NEXT_PUBLIC_SYNTHIA_SERVER_URL || FALLBACK_API_URL;
const PUBLIC_WS_URL = process.env.NEXT_PUBLIC_SYNTHIA_WS_URL || '';

const MorphBackendContext = createContext<MorphBackendContextValue | null>(null);

function normalizeBase(url: string): string {
  return (url || DEFAULT_API_URL).replace(/\/$/, '');
}

function getStoredApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  return window.localStorage.getItem('morphos_api_url') || window.localStorage.getItem('synthia_server') || DEFAULT_API_URL;
}

function getAdminSessionHeader(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('morphos_admin_key') || '';
}

async function safeJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `API ${res.status}`);
  }
  return data;
}

export function MorphBackendProvider({ children }: { children: React.ReactNode }) {
  const [apiBase, setApiBaseState] = useState<string>(getStoredApiBase());
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<MorphCapability[]>([]);
  const [jobs, setJobs] = useState<MorphJob[]>([]);
  const [lastEvent, setLastEvent] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const request = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      };
      const adminHeader = getAdminSessionHeader();
      if (adminHeader) headers['X-Admin-Key'] = adminHeader;

      const res = await fetch(`${normalizeBase(apiBase)}${endpoint}`, {
        ...options,
        headers,
      });
      return safeJsonResponse(res);
    },
    [apiBase]
  );

  const setApiBase = useCallback((url: string) => {
    const normalized = normalizeBase(url);
    setApiBaseState(normalized);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('morphos_api_url', normalized);
      window.localStorage.setItem('synthia_server', normalized);
    }
  }, []);

  const refreshCapabilities = useCallback(async () => {
    const data = await request('/api/capabilities');
    const next = Array.isArray(data) ? data : data?.capabilities || [];
    setCapabilities(next);
    return next;
  }, [request]);

  const ingest = useCallback(
    async (input: IngestInput) => {
      const job = await request('/api/ingest', {
        method: 'POST',
        body: JSON.stringify({ ...input, timestamp: Date.now() }),
      });
      const normalizedJob: MorphJob = job?.job || job;
      if (normalizedJob?.id) setJobs((prev) => [normalizedJob, ...prev.filter((j) => j.id !== normalizedJob.id)]);
      return normalizedJob;
    },
    [request]
  );

  const integrate = useCallback(
    async (input: IntegrateInput) =>
      request('/api/integrate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    [request]
  );

  const buildPlan = useCallback(
    async (prompt: string, files: unknown[] = [], mode = 'journey-1') =>
      request('/api/orchestrator/build-plan', {
        method: 'POST',
        body: JSON.stringify({ prompt, files, mode }),
      }),
    [request]
  );

  const searchKnowledge = useCallback(
    async (query: string) =>
      request('/api/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }),
    [request]
  );

  const deployRequest = useCallback(
    async (project: string, planId?: string) =>
      request('/api/deploy/request', {
        method: 'POST',
        body: JSON.stringify({ project, planId }),
      }),
    [request]
  );

  const invokeAgent = useCallback(
    async (agentId: number | string, payload: unknown) =>
      request(`/api/agents/${agentId}/invoke`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    [request]
  );

  useEffect(() => {
    let cancelled = false;
    setConnecting(true);
    setError(null);

    request('/health')
      .then(() => {
        if (cancelled) return;
        setConnected(true);
        setConnecting(false);
        refreshCapabilities().catch(() => undefined);
      })
      .catch((err) => {
        if (cancelled) return;
        setConnected(false);
        setConnecting(false);
        setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [request, refreshCapabilities]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wsUrl = PUBLIC_WS_URL || normalizeBase(apiBase).replace(/^http/, 'ws') + '/api/ws';

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onerror = () => setError('WebSocket connection failed');
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastEvent(payload);
          if (payload.type === 'capabilities' && Array.isArray(payload.capabilities)) {
            setCapabilities(payload.capabilities);
          }
          if (payload.type === 'capability_added' && payload.capability) {
            setCapabilities((prev) => [payload.capability, ...prev.filter((c) => c.id !== payload.capability.id)]);
          }
          if (payload.type === 'job_update' && payload.job?.id) {
            setJobs((prev) => [payload.job, ...prev.filter((j) => j.id !== payload.job.id)]);
          }
        } catch {
          setLastEvent(event.data);
        }
      };

      return () => ws.close();
    } catch (err: any) {
      setError(err.message);
    }
  }, [apiBase]);

  const value = useMemo<MorphBackendContextValue>(
    () => ({
      apiBase: normalizeBase(apiBase),
      setApiBase,
      connected,
      connecting,
      error,
      capabilities,
      jobs,
      lastEvent,
      refreshCapabilities,
      ingest,
      integrate,
      buildPlan,
      searchKnowledge,
      deployRequest,
      invokeAgent,
    }),
    [apiBase, setApiBase, connected, connecting, error, capabilities, jobs, lastEvent, refreshCapabilities, ingest, integrate, buildPlan, searchKnowledge, deployRequest, invokeAgent]
  );

  return <MorphBackendContext.Provider value={value}>{children}</MorphBackendContext.Provider>;
}

export function useMorphBackend(): MorphBackendContextValue {
  const ctx = useContext(MorphBackendContext);
  if (!ctx) throw new Error('useMorphBackend must be used inside MorphBackendProvider');
  return ctx;
}

export default MorphBackendProvider;
