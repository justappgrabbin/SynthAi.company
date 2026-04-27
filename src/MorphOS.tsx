'use client';

import React, { useMemo, useState } from 'react';
import { MorphBackendProvider, useMorphBackend, type IntegrationMode } from './MorphOS_Backend_Secure';

const nativeCapabilities = [
  { id: 'native-clock', name: 'Chronos', type: 'widget', status: 'native' },
  { id: 'native-weather', name: 'Atmosphere', type: 'widget', status: 'native' },
  { id: 'native-music', name: 'Resonance', type: 'media', status: 'native' },
  { id: 'native-tasks', name: 'Momentum', type: 'widget', status: 'native' },
  { id: 'native-chat', name: 'Symbiont', type: 'agent', status: 'native' },
];

function MorphOSInner() {
  const backend = useMorphBackend();
  const [activeTab, setActiveTab] = useState<'home' | 'caps' | 'mesh' | 'admin'>('home');
  const [mode, setMode] = useState<IntegrationMode>('hybrid');
  const [prompt, setPrompt] = useState('Build Journey 1: Morph OS receives functional control center behavior safely.');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const capabilities = useMemo(() => {
    const seen = new Set<string>();
    return [...backend.capabilities, ...nativeCapabilities].filter((cap: any) => {
      if (seen.has(cap.id)) return false;
      seen.add(cap.id);
      return true;
    });
  }, [backend.capabilities]);

  const addLog = (message: string) => setLog((prev) => [message, ...prev].slice(0, 8));

  async function requestPlan() {
    setBusy(true);
    try {
      const result = await backend.buildPlan(prompt, [], 'journey-1');
      addLog(`Build plan requested: ${JSON.stringify(result).slice(0, 160)}`);
    } catch (err: any) {
      addLog(`Build plan failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function requestIntegration() {
    setBusy(true);
    try {
      const result = await backend.integrate({ mode, notes: prompt });
      addLog(`Integration requested: ${JSON.stringify(result).slice(0, 160)}`);
    } catch (err: any) {
      addLog(`Integration failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      await backend.refreshCapabilities();
      addLog('Capabilities refreshed from Synthia-server.');
    } catch (err: any) {
      addLog(`Refresh failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.mesh} />
      <header style={styles.statusBar}>
        <div>
          <strong>Morph OS</strong>
          <span style={styles.badge}>{capabilities.filter((c: any) => c.status !== 'native').length} absorbed</span>
        </div>
        <div style={styles.connection}>
          <span style={{ ...styles.dot, background: backend.connected ? '#4ade80' : '#f97316' }} />
          {backend.connecting ? 'connecting' : backend.connected ? 'Synthia online' : 'offline'}
        </div>
      </header>

      <section style={styles.content}>
        {activeTab === 'home' && (
          <>
            <div style={styles.hero}>
              <h1 style={styles.h1}>Self-integrating operating system</h1>
              <p style={styles.muted}>Apps, agents, games, books, and tools enter as capabilities. Protected actions route through Synthia-server.</p>
            </div>
            <div style={styles.grid}>
              {capabilities.map((cap: any) => (
                <article key={cap.id} style={cap.status === 'native' ? styles.card : styles.cardAbsorbed}>
                  <div style={styles.cardTitle}>{cap.name}</div>
                  <div style={styles.muted}>{cap.type || 'capability'}</div>
                  {cap.status !== 'native' && <div style={styles.pill}>ABSORBED</div>}
                </article>
              ))}
              <button style={styles.addCard} onClick={() => setActiveTab('admin')}>+ Add capability</button>
            </div>
          </>
        )}

        {activeTab === 'caps' && (
          <div>
            <h1 style={styles.h1}>Capabilities</h1>
            {capabilities.map((cap: any) => (
              <div key={cap.id} style={styles.row}>
                <strong>{cap.name}</strong>
                <span>{cap.status || 'ready'} · {cap.type}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'mesh' && (
          <div>
            <h1 style={styles.h1}>Substrate Mesh</h1>
            <div style={styles.meshBox}>
              {capabilities.map((cap: any, index: number) => (
                <div key={cap.id} style={{ ...styles.node, left: `${12 + (index % 4) * 23}%`, top: `${18 + Math.floor(index / 4) * 24}%`, background: cap.status === 'native' ? '#60a5fa' : '#a855f7' }} title={cap.name} />
              ))}
            </div>
            <p style={styles.muted}>{capabilities.length} active nodes. Native and absorbed capabilities share one surface.</p>
          </div>
        )}

        {activeTab === 'admin' && (
          <div>
            <h1 style={styles.h1}>Secure Control Room</h1>
            <p style={styles.muted}>Frontend can ask. Synthia-server can act. No service secrets live here.</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={styles.textarea} />
            <label style={styles.label}>Integration mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as IntegrationMode)} style={styles.input}>
              <option value="embed">embed</option>
              <option value="absorb">absorb</option>
              <option value="federate">federate</option>
              <option value="hybrid">hybrid</option>
            </select>
            <div style={styles.actions}>
              <button style={styles.button} disabled={busy} onClick={refresh}>Refresh</button>
              <button style={styles.button} disabled={busy} onClick={requestPlan}>Build plan</button>
              <button style={styles.primaryButton} disabled={busy} onClick={requestIntegration}>Request integration</button>
            </div>
            {backend.error && <p style={styles.error}>Backend: {backend.error}</p>}
            <div style={styles.log}>
              {log.length === 0 ? <span style={styles.muted}>No actions yet.</span> : log.map((entry, i) => <div key={i}>{entry}</div>)}
            </div>
          </div>
        )}
      </section>

      <nav style={styles.nav}>
        {(['home', 'caps', 'mesh', 'admin'] as const).map((tab) => (
          <button key={tab} style={activeTab === tab ? styles.navActive : styles.navItem} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </nav>
    </main>
  );
}

export default function MorphOS() {
  return (
    <MorphBackendProvider>
      <MorphOSInner />
    </MorphBackendProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', position: 'relative', overflow: 'hidden' },
  mesh: { position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(168,85,247,.16), transparent 45%), radial-gradient(circle at 15% 80%, rgba(14,165,233,.10), transparent 35%)', pointerEvents: 'none' },
  statusBar: { position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(0,0,0,.28)', borderBottom: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(12px)' },
  badge: { marginLeft: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.65)', fontSize: 11 },
  connection: { display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.65)', fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  content: { position: 'relative', zIndex: 1, padding: 16, height: 'calc(100vh - 104px)', overflowY: 'auto' },
  hero: { marginBottom: 16 },
  h1: { fontSize: 24, lineHeight: 1.1, margin: '0 0 8px' },
  muted: { color: 'rgba(255,255,255,.55)', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 },
  card: { minHeight: 104, borderRadius: 16, padding: 14, background: 'linear-gradient(135deg, rgba(30,41,59,.9), rgba(15,23,42,.9))', border: '1px solid rgba(255,255,255,.1)' },
  cardAbsorbed: { minHeight: 104, borderRadius: 16, padding: 14, background: 'linear-gradient(135deg, rgba(88,28,135,.35), rgba(15,23,42,.9))', border: '1px solid rgba(168,85,247,.35)', boxShadow: '0 0 20px rgba(168,85,247,.12)' },
  cardTitle: { fontWeight: 700, marginBottom: 6 },
  pill: { display: 'inline-block', marginTop: 10, color: '#d8b4fe', fontSize: 10, letterSpacing: 1 },
  addCard: { minHeight: 104, borderRadius: 16, color: 'rgba(255,255,255,.65)', background: 'transparent', border: '2px dashed rgba(255,255,255,.16)', cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, marginBottom: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14 },
  meshBox: { position: 'relative', height: 280, background: 'rgba(2,6,23,.75)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  node: { position: 'absolute', width: 14, height: 14, borderRadius: '50%', boxShadow: '0 0 14px currentColor' },
  textarea: { width: '100%', minHeight: 120, color: 'white', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 12, margin: '12px 0', fontFamily: 'inherit' },
  input: { width: '100%', color: 'white', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 12, marginBottom: 12 },
  label: { display: 'block', color: 'rgba(255,255,255,.6)', fontSize: 12, marginBottom: 6 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  button: { border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.08)', color: 'white', padding: '10px 12px', borderRadius: 12, cursor: 'pointer' },
  primaryButton: { border: 'none', background: '#a855f7', color: 'white', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', fontWeight: 700 },
  error: { color: '#fb7185', marginTop: 12 },
  log: { marginTop: 14, padding: 12, borderRadius: 12, background: 'rgba(0,0,0,.25)', color: 'rgba(255,255,255,.7)', fontSize: 12, lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' },
  nav: { position: 'relative', zIndex: 2, height: 56, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(0,0,0,.35)', borderTop: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(14px)' },
  navItem: { color: 'rgba(255,255,255,.45)', background: 'none', border: 'none', padding: '8px 12px', textTransform: 'capitalize', cursor: 'pointer' },
  navActive: { color: '#c084fc', background: 'rgba(168,85,247,.12)', border: 'none', borderRadius: 12, padding: '8px 12px', textTransform: 'capitalize', cursor: 'pointer' },
};
