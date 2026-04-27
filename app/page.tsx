"use client"

const SYNTHIA_SERVER_URL = 'https://synthia-server.onrender.com'

function hideCredentialFields(frameDocument: Document) {
  const supabaseUrl = frameDocument.getElementById('supabaseUrl') as HTMLInputElement | null
  const supabaseKey = frameDocument.getElementById('supabaseKey') as HTMLInputElement | null

  ;[supabaseUrl, supabaseKey].forEach((input) => {
    const group = input?.closest('.form-group') as HTMLElement | null
    if (group) group.style.display = 'none'
  })

  const serverUrl = frameDocument.getElementById('serverUrl') as HTMLInputElement | null
  if (serverUrl) {
    serverUrl.value = SYNTHIA_SERVER_URL
    serverUrl.readOnly = true
  }

  const configCard = serverUrl?.closest('.card') as HTMLElement | null
  if (configCard && !frameDocument.getElementById('synthia-managed-note')) {
    const note = frameDocument.createElement('div')
    note.id = 'synthia-managed-note'
    note.style.cssText = 'background:rgba(0,212,170,.08);border:1px solid rgba(0,212,170,.25);border-radius:8px;padding:10px;margin:10px 0 12px;font-size:.72rem;color:#c0c0c0;line-height:1.35;'
    note.textContent = 'Connected through Synthia server. Supabase credentials are managed server-side and are not required here.'
    const firstButton = configCard.querySelector('button')
    configCard.insertBefore(note, firstButton ?? null)
  }
}

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

          hideCredentialFields(frameDocument)

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
