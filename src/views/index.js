export function renderHomePage(serverInfo) {
  const { host, port, version } = serverInfo

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LWS Playground - Linked Web Storage</title>
  <meta name="description" content="Linked Web Storage Server - Own your data on the web">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": {
      "@vocab": "https://www.w3.org/ns/lws#",
      "schema": "https://schema.org/",
      "lws": "https://www.w3.org/ns/lws#"
    },
    "@id": "${host}",
    "@type": ["lws:Server", "schema:WebAPI"],
    "schema:name": "LWS Server",
    "schema:version": "${version}",
    "lws:storageEndpoint": "${host}/storage/",
    "lws:authEndpoint": "${host}/auth/",
    "schema:documentation": "https://w3c.github.io/lws-protocol/lws10-core/"
  }
  </script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); min-height: 100vh; color: #e4e4e4; }
    .container { max-width: 1000px; margin: 0 auto; padding: 1.5rem; }
    header { text-align: center; padding: 2rem 0; margin-bottom: 1.5rem; }
    .logo { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg, #00d9ff, #00ff88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .tagline { color: #888; margin-top: 0.5rem; }
    .version { display: inline-block; background: rgba(0,217,255,0.2); color: #00d9ff; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem; margin-top: 0.5rem; }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; backdrop-filter: blur(10px); }
    .card h2 { color: #00d9ff; font-size: 1.1rem; margin-bottom: 1rem; }

    /* Tabs */
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .tab { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: #888; padding: 0.6rem 1rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .tab:hover { background: rgba(0,217,255,0.1); color: #fff; }
    .tab.active { background: linear-gradient(135deg, #00d9ff, #00ff88); color: #1a1a2e; font-weight: 600; border-color: transparent; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Form elements */
    .btn { background: linear-gradient(135deg, #00d9ff, #00ff88); color: #1a1a2e; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(0,217,255,0.3); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); box-shadow: none; }
    .btn-danger { background: linear-gradient(135deg, #ff4466, #ff6b6b); }
    .btn-small { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
    .input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); padding: 0.6rem 1rem; border-radius: 0.5rem; color: #fff; font-size: 0.9rem; width: 100%; }
    .input:focus { outline: none; border-color: #00d9ff; }
    textarea.input { min-height: 150px; font-family: monospace; resize: vertical; }
    .form-row { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .form-row .input { flex: 1; min-width: 150px; margin: 0; }
    label { display: block; color: #888; font-size: 0.85rem; margin-bottom: 0.3rem; }

    /* Status messages */
    .status { padding: 0.6rem; border-radius: 0.5rem; margin-top: 0.75rem; font-size: 0.85rem; }
    .status.success { background: rgba(0,255,136,0.15); color: #00ff88; border: 1px solid rgba(0,255,136,0.3); }
    .status.error { background: rgba(255,68,102,0.15); color: #ff4466; border: 1px solid rgba(255,68,102,0.3); }
    .status.info { background: rgba(0,217,255,0.15); color: #00d9ff; border: 1px solid rgba(0,217,255,0.3); }

    /* Session bar */
    .session-bar { background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.3); border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
    .session-bar .webid { color: #00ff88; font-family: monospace; font-size: 0.85rem; }
    .session-bar .logout { background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 0.3rem 0.75rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem; }
    .session-bar .logout:hover { background: rgba(255,68,102,0.3); }

    /* File browser */
    .browser { background: rgba(0,0,0,0.3); border-radius: 0.5rem; overflow: hidden; }
    .browser-header { background: rgba(0,0,0,0.3); padding: 0.6rem 1rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .browser-path { color: #00d9ff; font-family: monospace; font-size: 0.85rem; flex: 1; }
    .browser-list { max-height: 300px; overflow-y: auto; }
    .browser-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: background 0.2s; }
    .browser-item:hover { background: rgba(0,217,255,0.1); }
    .browser-item.selected { background: rgba(0,217,255,0.2); }
    .browser-icon { font-size: 1.1rem; }
    .browser-name { color: #fff; flex: 1; }
    .browser-type { color: #666; font-size: 0.8rem; }
    .browser-empty { color: #666; padding: 2rem; text-align: center; }

    /* JSON viewer */
    .json-view { background: rgba(0,0,0,0.4); border-radius: 0.5rem; padding: 1rem; font-family: monospace; font-size: 0.85rem; overflow-x: auto; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; }
    .json-key { color: #00d9ff; }
    .json-string { color: #00ff88; }
    .json-number { color: #ffaa00; }
    .json-bool { color: #ff6b6b; }
    .json-null { color: #888; }

    /* Footer */
    footer { text-align: center; padding: 1.5rem 0; color: #666; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 1rem; font-size: 0.85rem; }
    footer a { color: #00d9ff; text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    /* Copyable component */
    .copyable { margin-bottom: 0.75rem; }
    .copyable-label { display: block; color: #888; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .copyable-row { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); }
    .copyable-value { font-family: monospace; font-size: 0.85rem; word-break: break-all; flex: 1; }
    .copy-btn { background: rgba(255,255,255,0.1); border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .copy-btn:hover { background: rgba(0,217,255,0.3); }
    .reg-result { background: rgba(0,255,136,0.05); border: 1px solid rgba(0,255,136,0.2); border-radius: 0.5rem; padding: 1rem; margin-top: 1rem; }

    /* JSON-LD container */
    .json-ld-container { position: relative; }
    .json-ld-badge { position: absolute; top: 0.5rem; right: 0.5rem; background: linear-gradient(135deg, #00d9ff, #00ff88); color: #1a1a2e; font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .json-link { color: #00d9ff; text-decoration: none; }
    .json-link:hover { text-decoration: underline; }
    .json-editor { min-height: 200px; }

    /* API list */
    .api-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .api-item { display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.3); padding: 0.6rem 1rem; border-radius: 0.5rem; text-decoration: none; color: inherit; transition: background 0.2s; }
    .api-item:hover { background: rgba(0,217,255,0.1); }
    .api-item code { color: #fff; font-size: 0.85rem; flex: 1; }
    .api-item .desc { color: #888; font-size: 0.8rem; }
    .method { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 0.25rem; text-transform: uppercase; min-width: 3.5rem; text-align: center; }
    .method.get { background: rgba(0,217,255,0.2); color: #00d9ff; }
    .method.post { background: rgba(0,255,136,0.2); color: #00ff88; }
    .method.put { background: rgba(255,170,0,0.2); color: #ffaa00; }
    .method.delete { background: rgba(255,68,102,0.2); color: #ff4466; }

    /* Utilities */
    .mt-1 { margin-top: 0.5rem; }
    .mt-2 { margin-top: 1rem; }
    .flex { display: flex; }
    .gap-1 { gap: 0.5rem; }
    .gap-2 { gap: 1rem; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .text-sm { font-size: 0.85rem; }
    .text-muted { color: #888; }
    .mono { font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">LWS Playground</div>
      <div class="tagline">Linked Web Storage - Own Your Data</div>
      <div class="version">v${version}</div>
    </header>

    <div id="app"></div>

    <footer>
      <a href="https://github.com/linkedwebstorage/lws-server">GitHub</a> ·
      <a href="https://linkedwebstorage.com">About LWS</a> ·
      <a href="https://w3c.github.io/lws-protocol/lws10-core/">W3C Spec</a> ·
      <a href="/.well-known/lws">Discovery</a>
    </footer>
  </div>

  <script type="module">
    import { h, render } from 'https://esm.sh/preact@10.19.3'
    import { useState, useEffect } from 'https://esm.sh/preact@10.19.3/hooks'
    import htm from 'https://esm.sh/htm@3.1.1'
    const html = htm.bind(h)

    // Copy to clipboard helper
    const copy = (text, showStatus) => {
      navigator.clipboard.writeText(text)
      showStatus('info', 'Copied to clipboard!')
    }

    // JSON syntax highlighter with clickable links
    const highlight = (obj, onLinkClick) => {
      const json = JSON.stringify(obj, null, 2)
      return json
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "(https?:\\/\\/[^"]+)"/g, ': "<a href="$1" target="_blank" class="json-link">$1</a>"')
        .replace(/: "(\\/storage\\/[^"]+)"/g, ': "<a href="$1" class="json-link" data-path="$1">$1</a>"')
        .replace(/: "([^"]*?)"/g, (m, p1) => m.includes('json-link') ? m : ': <span class="json-string">"' + p1 + '"</span>')
        .replace(/: (\\d+)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
        .replace(/: (null)/g, ': <span class="json-null">$1</span>')
    }

    // Copyable value component
    function Copyable({ label, value, color, showStatus }) {
      return html\`
        <div class="copyable">
          <span class="copyable-label">\${label}</span>
          <div class="copyable-row">
            <span class="copyable-value" style="color:\${color || '#00ff88'}">\${value}</span>
            <button class="copy-btn" onClick=\${() => copy(value, showStatus)} title="Copy">📋</button>
          </div>
        </div>
      \`
    }

    // JSON-LD Editor component
    function JsonLdEditor({ data, onSave, readonly, showStatus }) {
      const [editing, setEditing] = useState(false)
      const [content, setContent] = useState(JSON.stringify(data, null, 2))
      const [error, setError] = useState(null)

      useEffect(() => {
        setContent(JSON.stringify(data, null, 2))
      }, [data])

      const handleSave = () => {
        try {
          const parsed = JSON.parse(content)
          setError(null)
          onSave(parsed)
          setEditing(false)
        } catch (e) {
          setError('Invalid JSON: ' + e.message)
        }
      }

      if (editing) {
        return html\`
          <div>
            <textarea class="input json-editor" value=\${content} onInput=\${e => setContent(e.target.value)}></textarea>
            \${error && html\`<div class="status error" style="margin:0.5rem 0">\${error}</div>\`}
            <div class="flex gap-1 mt-1">
              <button class="btn btn-small" onClick=\${handleSave}>💾 Save</button>
              <button class="btn btn-small btn-secondary" onClick=\${() => { setEditing(false); setContent(JSON.stringify(data, null, 2)); setError(null) }}>Cancel</button>
            </div>
          </div>
        \`
      }

      return html\`
        <div>
          <div class="json-ld-container">
            <div class="json-ld-badge">JSON-LD</div>
            <div class="json-view" dangerouslySetInnerHTML=\${{ __html: highlight(data) }}></div>
          </div>
          \${!readonly && html\`
            <button class="btn btn-small btn-secondary mt-1" onClick=\${() => setEditing(true)}>✏️ Edit</button>
          \`}
        </div>
      \`
    }

    function App() {
      const [tab, setTab] = useState('register')
      const [session, setSession] = useState(null)
      const [status, setStatus] = useState(null)
      const [loading, setLoading] = useState(false)

      // Form states
      const [regUsername, setRegUsername] = useState('')
      const [loginUsername, setLoginUsername] = useState('')
      const [loginSecret, setLoginSecret] = useState('')
      const [regResult, setRegResult] = useState(null)

      // Browser state
      const [currentPath, setCurrentPath] = useState('')
      const [files, setFiles] = useState([])
      const [selectedFile, setSelectedFile] = useState(null)
      const [fileContent, setFileContent] = useState(null)

      // Profile state
      const [profile, setProfile] = useState(null)

      // Editor state
      const [newPath, setNewPath] = useState('')
      const [newContent, setNewContent] = useState(JSON.stringify({
        "@context": "https://www.w3.org/ns/lws",
        "@type": "Resource",
        "title": "My Resource",
        "content": "Hello LWS!"
      }, null, 2))

      const showStatus = (type, msg) => {
        setStatus({ type, msg })
        if (type !== 'error') setTimeout(() => setStatus(null), 3000)
      }

      // Register
      const register = async () => {
        if (!regUsername.trim()) return
        setLoading(true)
        try {
          const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: regUsername.trim() })
          })
          const data = await res.json()
          if (res.ok) {
            setRegResult(data)
            setLoginUsername(regUsername.trim())
            setLoginSecret(data.secret)
            showStatus('success', 'Identity created! Click "Login" tab to continue.')
          } else {
            showStatus('error', data.error)
          }
        } catch (e) { showStatus('error', 'Network error') }
        setLoading(false)
      }

      // Login
      const login = async () => {
        if (!loginUsername.trim() || !loginSecret.trim()) return
        setLoading(true)
        try {
          const res = await fetch('/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: loginUsername.trim(), secret: loginSecret.trim() })
          })
          const data = await res.json()
          if (res.ok) {
            setSession({ username: loginUsername.trim(), token: data.token, webId: data.webId })
            setCurrentPath('/' + loginUsername.trim())
            showStatus('success', 'Logged in!')
            loadFiles('/' + loginUsername.trim())
            loadProfile(loginUsername.trim())
            setTab('profile')
          } else {
            showStatus('error', data.error)
          }
        } catch (e) { showStatus('error', 'Network error') }
        setLoading(false)
      }

      const logout = () => {
        setSession(null)
        setFiles([])
        setSelectedFile(null)
        setFileContent(null)
        setProfile(null)
        setTab('register')
        showStatus('info', 'Logged out')
      }

      // Load profile
      const loadProfile = async (username) => {
        try {
          const res = await fetch('/storage/' + username + '/profile')
          if (res.ok) {
            const data = await res.json()
            setProfile(data)
          }
        } catch (e) { console.error('Failed to load profile') }
      }

      // Save profile
      const saveProfile = async (newProfile) => {
        if (!session) return
        setLoading(true)
        try {
          const res = await fetch('/storage/' + session.username + '/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.token },
            body: JSON.stringify(newProfile)
          })
          if (res.ok) {
            setProfile(newProfile)
            showStatus('success', 'Profile saved!')
          } else {
            showStatus('error', 'Failed to save profile')
          }
        } catch (e) { showStatus('error', 'Network error') }
        setLoading(false)
      }

      // Browse storage
      const loadFiles = async (path) => {
        try {
          const res = await fetch('/storage' + path)
          const data = await res.json()
          if (data.contains) {
            setFiles(data.contains)
            setCurrentPath(path)
            setSelectedFile(null)
            setFileContent(null)
          }
        } catch (e) { showStatus('error', 'Failed to load files') }
      }

      const loadFile = async (name, type) => {
        if (type === 'Container') {
          loadFiles(currentPath + '/' + name)
        } else {
          try {
            const res = await fetch('/storage' + currentPath + '/' + name)
            const data = await res.json()
            setSelectedFile(name)
            setFileContent(data)
          } catch (e) { showStatus('error', 'Failed to load file') }
        }
      }

      const goUp = () => {
        const parts = currentPath.split('/').filter(Boolean)
        if (parts.length > 1) {
          parts.pop()
          loadFiles('/' + parts.join('/'))
        }
      }

      // Save file (edit in browser)
      const saveFile = async (newContent) => {
        if (!session || !selectedFile) return
        setLoading(true)
        try {
          const res = await fetch('/storage' + currentPath + '/' + selectedFile, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.token },
            body: JSON.stringify(newContent)
          })
          if (res.ok) {
            setFileContent(newContent)
            showStatus('success', 'Saved!')
          } else {
            showStatus('error', 'Failed to save')
          }
        } catch (e) { showStatus('error', 'Network error') }
        setLoading(false)
      }

      // Create resource
      const createResource = async () => {
        if (!session || !newPath.trim()) return
        setLoading(true)
        try {
          let content
          try { content = JSON.parse(newContent) } catch { content = newContent }
          const fullPath = newPath.startsWith('/') ? newPath : '/' + session.username + '/' + newPath
          const res = await fetch('/storage' + fullPath, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.token },
            body: JSON.stringify(content)
          })
          if (res.ok) {
            showStatus('success', 'Created: ' + fullPath)
            loadFiles('/' + session.username)
            setNewPath('')
            setTab('browse')
          } else {
            const data = await res.json()
            showStatus('error', data.error)
          }
        } catch (e) { showStatus('error', 'Failed to create') }
        setLoading(false)
      }

      // Delete resource
      const deleteFile = async () => {
        if (!session || !selectedFile) return
        if (!confirm('Delete ' + selectedFile + '?')) return
        setLoading(true)
        try {
          const res = await fetch('/storage' + currentPath + '/' + selectedFile, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + session.token }
          })
          if (res.ok) {
            showStatus('success', 'Deleted!')
            loadFiles(currentPath)
          } else {
            showStatus('error', 'Failed to delete')
          }
        } catch (e) { showStatus('error', 'Network error') }
        setLoading(false)
      }

      return html\`
        <div>
          \${session && html\`
            <div class="session-bar">
              <div class="flex items-center gap-1">
                <span>🔐</span>
                <a href="\${session.webId}" class="webid">\${session.webId}</a>
              </div>
              <div class="flex gap-1">
                <button class="copy-btn" onClick=\${() => copy(location.origin + session.webId, showStatus)} title="Copy WebID">📋</button>
                <button class="logout" onClick=\${logout}>Logout</button>
              </div>
            </div>
          \`}

          <div class="card">
            <div class="tabs">
              <button class="tab \${tab === 'register' ? 'active' : ''}" onClick=\${() => setTab('register')}>🆕 Register</button>
              <button class="tab \${tab === 'login' ? 'active' : ''}" onClick=\${() => setTab('login')}>🔑 Login</button>
              \${session && html\`
                <button class="tab \${tab === 'profile' ? 'active' : ''}" onClick=\${() => setTab('profile')}>👤 Profile</button>
              \`}
              <button class="tab \${tab === 'browse' ? 'active' : ''}" onClick=\${() => setTab('browse')}>📁 Browse</button>
              <button class="tab \${tab === 'create' ? 'active' : ''}" onClick=\${() => setTab('create')}>✏️ Create</button>
              <button class="tab \${tab === 'api' ? 'active' : ''}" onClick=\${() => setTab('api')}>📡 API</button>
            </div>

            <!-- Register Tab -->
            <div class="tab-content \${tab === 'register' ? 'active' : ''}">
              <p class="text-muted text-sm" style="margin-bottom:1rem">Create a new identity and get your WebID</p>
              <div class="form-row">
                <input class="input" placeholder="Choose a username..." value=\${regUsername}
                  onInput=\${e => setRegUsername(e.target.value)} onKeyDown=\${e => e.key === 'Enter' && register()} />
                <button class="btn" onClick=\${register} disabled=\${loading || !regUsername.trim()}>
                  \${loading ? 'Creating...' : 'Create Identity'}
                </button>
              </div>
              \${regResult && html\`
                <div class="reg-result">
                  <\${Copyable} label="WebID" value=\${location.origin + regResult.webId} showStatus=\${showStatus} />
                  <\${Copyable} label="Secret (save this!)" value=\${regResult.secret} color="#ffaa00" showStatus=\${showStatus} />
                  <\${Copyable} label="Storage" value=\${location.origin + regResult.profile.storage} showStatus=\${showStatus} />
                  <div class="mt-2">
                    <button class="btn" onClick=\${() => setTab('login')}>→ Login Now</button>
                  </div>
                </div>
              \`}
            </div>

            <!-- Login Tab -->
            <div class="tab-content \${tab === 'login' ? 'active' : ''}">
              <p class="text-muted text-sm" style="margin-bottom:1rem">Login with your username and secret to get a token</p>
              <div class="form-row">
                <input class="input" placeholder="Username" value=\${loginUsername} onInput=\${e => setLoginUsername(e.target.value)} />
              </div>
              <div class="form-row">
                <input class="input" type="password" placeholder="Secret" value=\${loginSecret}
                  onInput=\${e => setLoginSecret(e.target.value)} onKeyDown=\${e => e.key === 'Enter' && login()} />
                <button class="btn" onClick=\${login} disabled=\${loading || !loginUsername.trim() || !loginSecret.trim()}>
                  \${loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
              <div class="text-muted text-sm mt-2">
                <strong>How auth works:</strong> Your secret is stored securely. Login exchanges it for a bearer token used in API requests.
              </div>
            </div>

            <!-- Profile Tab -->
            <div class="tab-content \${tab === 'profile' ? 'active' : ''}">
              \${!session ? html\`<p class="text-muted">Login to view your profile</p>\` : html\`
                <div>
                  <h3 style="color:#00d9ff;margin-bottom:1rem">Your WebID Profile</h3>
                  \${profile ? html\`
                    <\${JsonLdEditor} data=\${profile} onSave=\${saveProfile} showStatus=\${showStatus} />
                  \` : html\`<p class="text-muted">Loading profile...</p>\`}

                  \${session.token && html\`
                    <div class="mt-2">
                      <\${Copyable} label="Bearer Token (for API)" value=\${session.token} color="#00d9ff" showStatus=\${showStatus} />
                    </div>
                  \`}
                </div>
              \`}
            </div>

            <!-- Browse Tab -->
            <div class="tab-content \${tab === 'browse' ? 'active' : ''}">
              \${!session ? html\`<p class="text-muted">Login to browse your storage</p>\` : html\`
                <div class="browser">
                  <div class="browser-header">
                    <button class="btn btn-small btn-secondary" onClick=\${goUp} disabled=\${currentPath.split('/').filter(Boolean).length <= 1}>⬆️</button>
                    <a href="/storage\${currentPath}" class="browser-path" target="_blank">/storage\${currentPath}</a>
                    <button class="btn btn-small btn-secondary" onClick=\${() => loadFiles(currentPath)}>🔄</button>
                  </div>
                  <div class="browser-list">
                    \${files.length === 0 ? html\`<div class="browser-empty">Empty folder - create something!</div>\` : files.map(f => html\`
                      <div class="browser-item \${selectedFile === f.name ? 'selected' : ''}" onClick=\${() => loadFile(f.name, f.type)}>
                        <span class="browser-icon">\${f.type === 'Container' ? '📁' : '📄'}</span>
                        <span class="browser-name">\${f.name}</span>
                        <span class="browser-type">\${f.type}</span>
                      </div>
                    \`)}
                  </div>
                </div>
                \${fileContent && html\`
                  <div class="mt-2">
                    <div class="flex items-center justify-between gap-1" style="margin-bottom:0.5rem">
                      <a href="/storage\${currentPath}/\${selectedFile}" target="_blank" style="color:#00d9ff;text-decoration:none">
                        <strong>\${selectedFile}</strong> ↗
                      </a>
                      <button class="btn btn-small btn-danger" onClick=\${deleteFile}>🗑️</button>
                    </div>
                    <\${JsonLdEditor} data=\${fileContent} onSave=\${saveFile} showStatus=\${showStatus} />
                  </div>
                \`}
              \`}
            </div>

            <!-- Create Tab -->
            <div class="tab-content \${tab === 'create' ? 'active' : ''}">
              \${!session ? html\`<p class="text-muted">Login to create resources</p>\` : html\`
                <div>
                  <label>Path (relative to /storage/\${session.username}/)</label>
                  <input class="input" placeholder="e.g., notes/todo.json or blog/post-1.json" value=\${newPath} onInput=\${e => setNewPath(e.target.value)} />

                  <label class="mt-1">Content (JSON-LD)</label>
                  <textarea class="input json-editor" value=\${newContent} onInput=\${e => setNewContent(e.target.value)}></textarea>

                  <button class="btn mt-1" onClick=\${createResource} disabled=\${loading || !newPath.trim()}>
                    \${loading ? 'Creating...' : '💾 Create Resource'}
                  </button>
                </div>
              \`}
            </div>

            <!-- API Tab -->
            <div class="tab-content \${tab === 'api' ? 'active' : ''}">
              <div class="api-list">
                <a href="/" class="api-item"><span class="method get">GET</span><code>/</code><span class="desc">This playground</span></a>
                <a href="/.well-known/lws" target="_blank" class="api-item"><span class="method get">GET</span><code>/.well-known/lws</code><span class="desc">Discovery</span></a>
                <div class="api-item"><span class="method post">POST</span><code>/auth/register</code><span class="desc">Create identity</span></div>
                <div class="api-item"><span class="method post">POST</span><code>/auth/token</code><span class="desc">Get token</span></div>
                <a href="/storage/" target="_blank" class="api-item"><span class="method get">GET</span><code>/storage/*</code><span class="desc">Read resource</span></a>
                <div class="api-item"><span class="method put">PUT</span><code>/storage/*</code><span class="desc">Write resource</span></div>
                <div class="api-item"><span class="method delete">DELETE</span><code>/storage/*</code><span class="desc">Delete resource</span></div>
              </div>
            </div>

            \${status && html\`<div class="status \${status.type}">\${status.msg}</div>\`}
          </div>
        </div>
      \`
    }

    render(html\`<\${App} />\`, document.getElementById('app'))
  </script>
</body>
</html>`
}
