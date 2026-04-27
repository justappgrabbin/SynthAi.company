export default function Page() {
  return (
    <main style={{ margin: 0, minHeight: '100vh', background: '#0a0a0f' }}>
      <iframe
        src="/morph-os.html"
        title="Morph OS"
        style={{
          width: '100vw',
          height: '100vh',
          border: 0,
          display: 'block',
          background: '#0a0a0f',
        }}
      />
    </main>
  )
}
