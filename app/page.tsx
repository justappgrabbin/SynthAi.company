"use client"

const SYNTHIA_SERVER_URL = 'https://synthia-server.onrender.com'

export default function Page() {
  return (
    <main style={{ margin: 0, minHeight: '100vh', background: '#0a0a0f' }}>
      <iframe
        src="/morph-os.html"
        title="Morph OS"
        onLoad={(event) => {
          const frameWindow = event.currentTarget.contentWindow
          const frameDocument = event.currentTarget.contentDocument
          if (!frameWindow || !frameDocument) return

          frameWindow.localStorage.setItem('synthia_server', SYNTHIA_SERVER_URL)

          const input = frameDocument.getElementById('serverUrl') as HTMLInputElement | null
          if (input) input.value = SYNTHIA_SERVER_URL

          if ('serverUrl' in frameWindow) {
            ;(frameWindow as unknown as { serverUrl: string }).serverUrl = SYNTHIA_SERVER_URL
          }

          const checkServer = (frameWindow as unknown as { checkServer?: () => Promise<void> | void }).checkServer
          if (typeof checkServer === 'function') checkServer()
        }}
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
