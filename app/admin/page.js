'use client'
import { useState, useEffect } from 'react'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #13131a;
    --surface2: #1c1c28;
    --border: rgba(255,255,255,0.07);
    --accent: #6c63ff;
    --accent2: #ff6584;
    --accent3: #43e8b0;
    --text: #f0f0f5;
    --muted: #8888aa;
    --success: #43e8b0;
    --error: #ff6584;
  }

  html, body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }

  .root { min-height: 100vh; background: var(--bg); position: relative; overflow-x: hidden; }

  .bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
  .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.12; animation: float 12s ease-in-out infinite; }
  .orb-1 { width: 500px; height: 500px; background: var(--accent); top: -150px; left: -100px; animation-delay: 0s; }
  .orb-2 { width: 400px; height: 400px; background: var(--accent2); bottom: -100px; right: -80px; animation-delay: -4s; }
  @keyframes float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-20px) scale(1.04)} }

  .bg-grid {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px);
    background-size: 50px 50px;
  }

  .container { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 40px 24px 80px; }

  /* Login */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .login-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    padding: 40px; width: 100%; max-width: 380px; position: relative; z-index: 1;
    animation: slideUp 0.5s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .login-icon { font-size: 32px; margin-bottom: 16px; }
  .login-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 6px; }
  .login-sub { font-size: 13px; color: var(--muted); margin-bottom: 28px; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; animation: fadeIn 0.4s both; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .header-left h1 { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }
  .header-left p { font-size: 13px; color: var(--muted); margin-top: 2px; }

  /* Metric cards */
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  @media(max-width:640px){ .metrics{ grid-template-columns: repeat(2,1fr); } }
  .metric {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px;
    animation: slideUp 0.5s cubic-bezier(.22,1,.36,1) both;
  }
  .metric-label { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .metric-value { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; }
  .metric-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

  /* Grid 2 cols */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  @media(max-width:640px){ .grid2{ grid-template-columns: 1fr; } }

  /* Cards */
  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 22px;
    animation: slideUp 0.5s 0.1s cubic-bezier(.22,1,.36,1) both;
  }
  .card-title { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; margin-bottom: 18px; }

  /* Bar */
  .bar-row { margin-bottom: 12px; }
  .bar-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
  .bar-track { height: 5px; background: var(--surface2); border-radius: 4px; }
  .bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.8s cubic-bezier(.22,1,.36,1); }

  /* Mode pills */
  .mode-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .mode-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .mode-bar-wrap { flex: 1; }
  .mode-bar-track { height: 5px; background: var(--surface2); border-radius: 4px; margin-top: 4px; }
  .mode-pct { font-size: 12px; color: var(--muted); }

  /* Table */
  .table-wrap { overflow-x: auto; }
  .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; font-weight: 600; font-size: 11px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--border); }
  td { padding: 12px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }

  .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
  .badge-active { background: rgba(67,232,176,0.12); color: var(--success); }
  .badge-muted  { background: rgba(255,101,132,0.12); color: var(--error); }

  /* Form elements */
  .input {
    width: 100%; padding: 12px 14px; background: var(--bg); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 14px;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input::placeholder { color: rgba(136,136,170,0.5); }
  .input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }

  .search { padding: 9px 14px; font-size: 13px; width: 220px; }

  .btn {
    padding: 12px 20px; border-radius: 12px; border: none; cursor: pointer;
    font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .btn-primary { background: linear-gradient(135deg,var(--accent),#8b7fff); color: #fff; box-shadow: 0 4px 16px rgba(108,99,255,0.3); width: 100%; margin-top: 8px; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(108,99,255,0.45); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-sm:hover { border-color: rgba(255,255,255,0.2); }
  .btn-logout { padding: 8px 16px; font-size: 13px; border-radius: 10px; background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }
  .btn-logout:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

  .msg { margin-top: 12px; padding: 10px 14px; border-radius: 10px; font-size: 13px; }
  .msg-error { background: rgba(255,101,132,0.1); border: 1px solid rgba(255,101,132,0.25); color: var(--error); }

  .loading { text-align: center; padding: 60px; color: var(--muted); font-size: 14px; }
  .dot { display: inline-block; animation: pulse 1.4s ease-in-out infinite; }
  .dot:nth-child(2){ animation-delay: 0.2s; }
  .dot:nth-child(3){ animation-delay: 0.4s; }
  @keyframes pulse { 0%,80%,100%{opacity:0.3} 40%{opacity:1} }
`

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false)
  const [password, setPassword] = useState('')
  const [loginMsg, setLoginMsg] = useState('')
  const [logging, setLogging]  = useState(false)
  const [stats, setStats]      = useState(null)
  const [loading, setLoading]  = useState(false)
  const [search, setSearch]    = useState('')
  const [actionMsg, setActionMsg] = useState('')

  async function login() {
    setLogging(true); setLoginMsg('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        setAuthed(true)
        loadStats()
      } else {
        setLoginMsg('Contraseña incorrecta.')
      }
    } catch { setLoginMsg('Error de conexión.') }
    finally { setLogging(false) }
  }

  async function loadStats() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': password || sessionStorage.getItem('admin_pw') || '' }
      })
      const data = await res.json()
      setStats(data)
      sessionStorage.setItem('admin_pw', password)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function muteUser(email, action) {
    setActionMsg('')
    try {
      const res = await fetch('/api/mute-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action })
      })
      if (res.ok) {
        setActionMsg(`${action === 'mute' ? 'Silenciado' : 'Reactivado'}: ${email}`)
        loadStats()
      }
    } catch { setActionMsg('Error al procesar.') }
  }

  async function deleteUser(email) {
    if (!confirm(`¿Borrar todas las alertas de ${email}?`)) return
    try {
      await fetch('/api/delete-by-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, wipe_history: true })
      })
      setActionMsg(`Eliminado: ${email}`)
      loadStats()
    } catch { setActionMsg('Error al eliminar.') }
  }

  // Restaurar sesión
  useEffect(() => {
    const pw = sessionStorage.getItem('admin_pw')
    if (pw) { setPassword(pw); setAuthed(true); loadStats() }
  }, [])

  function logout() {
    sessionStorage.removeItem('admin_pw')
    setAuthed(false); setStats(null); setPassword('')
  }

  const filteredUsers = stats?.users?.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.job_title || '').toLowerCase().includes(search.toLowerCase())
  ) || []

  const topJobs = stats?.topJobs || []
  const maxJob  = topJobs[0]?.count || 1
  const modes   = stats?.modes || { onsite: 0, remote: 0, hybrid: 0 }
  const totalModes = (modes.onsite + modes.remote + modes.hybrid) || 1

  if (!authed) return (
    <>
      <style>{styles}</style>
      <div className="root">
        <div className="bg-orbs"><div className="orb orb-1"/><div className="orb orb-2"/></div>
        <div className="bg-grid"/>
        <div className="login-wrap" style={{position:'relative',zIndex:1}}>
          <div className="login-card">
            <div className="login-icon">🔐</div>
            <div className="login-title">Panel de administración</div>
            <div className="login-sub">Acceso restringido. Introduce la contraseña de administrador.</div>
            <div style={{marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:'var(--muted)',display:'block',marginBottom:8}}>Contraseña</label>
              <input className="input" type="password" placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()} />
            </div>
            <button className="btn btn-primary" onClick={login} disabled={logging || !password}>
              {logging ? 'Verificando…' : 'Entrar →'}
            </button>
            {loginMsg && <div className="msg msg-error">{loginMsg}</div>}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{styles}</style>
      <div className="root">
        <div className="bg-orbs"><div className="orb orb-1"/><div className="orb orb-2"/></div>
        <div className="bg-grid"/>
        <div className="container">

          <div className="header">
            <div className="header-left">
              <h1>Panel de administración</h1>
              <p>Alertas de Empleo — vista general</p>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="btn btn-sm" onClick={loadStats}>↻ Actualizar</button>
              <button className="btn btn-logout" onClick={logout}>Cerrar sesión</button>
            </div>
          </div>

          {loading && (
            <div className="loading">
              <span className="dot">•</span><span className="dot">•</span><span className="dot">•</span>
            </div>
          )}

          {!loading && stats && (
            <>
              {/* Métricas */}
              <div className="metrics">
                <div className="metric" style={{animationDelay:'0s'}}>
                  <div className="metric-label">Usuarios</div>
                  <div className="metric-value">{stats.totalUsers}</div>
                  <div className="metric-sub">emails únicos</div>
                </div>
                <div className="metric" style={{animationDelay:'0.05s'}}>
                  <div className="metric-label">Alertas activas</div>
                  <div className="metric-value">{stats.totalAlerts}</div>
                  <div className="metric-sub">en total</div>
                </div>
                <div className="metric" style={{animationDelay:'0.1s'}}>
                  <div className="metric-label">Emails enviados</div>
                  <div className="metric-value">{stats.totalSent}</div>
                  <div className="metric-sub">ofertas enviadas</div>
                </div>
                <div className="metric" style={{animationDelay:'0.15s'}}>
                  <div className="metric-label">Silenciados</div>
                  <div className="metric-value">{stats.totalMuted}</div>
                  <div className="metric-sub">usuarios</div>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid2">
                <div className="card">
                  <div className="card-title">Puestos más buscados</div>
                  {topJobs.length === 0 && <div style={{fontSize:13,color:'var(--muted)'}}>Sin datos</div>}
                  {topJobs.map((j, i) => (
                    <div className="bar-row" key={i}>
                      <div className="bar-top">
                        <span style={{fontSize:13}}>{j.job_title}</span>
                        <span style={{color:'var(--muted)',fontSize:12}}>{j.count}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{width: `${Math.round(j.count / maxJob * 100)}%`}}/>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="card-title">Modalidad preferida</div>
                  {[
                    { key:'onsite', label:'Presencial', icon:'🏢', color:'rgba(108,99,255,0.15)', fill:'var(--accent)' },
                    { key:'remote', label:'Teletrabajo', icon:'🏠', color:'rgba(67,232,176,0.15)', fill:'var(--success)' },
                    { key:'hybrid', label:'Híbrido',    icon:'⚡', color:'rgba(255,101,132,0.15)', fill:'var(--error)' }
                  ].map(m => {
                    const pct = Math.round((modes[m.key] || 0) / totalModes * 100)
                    return (
                      <div className="mode-row" key={m.key}>
                        <div className="mode-icon" style={{background:m.color}}>{m.icon}</div>
                        <div className="mode-bar-wrap">
                          <div style={{display:'flex',justifyContent:'space-between'}}>
                            <span style={{fontSize:13}}>{m.label}</span>
                            <span className="mode-pct">{pct}%</span>
                          </div>
                          <div className="mode-bar-track">
                            <div style={{height:'100%',width:`${pct}%`,background:m.fill,borderRadius:4,transition:'width 0.8s cubic-bezier(.22,1,.36,1)'}}/>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tabla usuarios */}
              <div className="card" style={{animationDelay:'0.2s'}}>
                <div className="table-header">
                  <div className="card-title" style={{marginBottom:0}}>Usuarios registrados</div>
                  <input className="input search" placeholder="Buscar email o puesto…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {actionMsg && <div style={{fontSize:12,color:'var(--success)',marginBottom:12}}>{actionMsg}</div>}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Puesto</th>
                        <th>Localización</th>
                        <th>Modalidad</th>
                        <th>Estado</th>
                        <th style={{textAlign:'right'}}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={6} style={{textAlign:'center',color:'var(--muted)',padding:'24px'}}>Sin resultados</td></tr>
                      )}
                      {filteredUsers.map((u, i) => (
                        <tr key={i}>
                          <td style={{color:'var(--text)'}}>{u.email}</td>
                          <td>{u.job_title || '—'}</td>
                          <td style={{color:'var(--muted)'}}>{u.city || '—'}</td>
                          <td style={{color:'var(--muted)',fontSize:12}}>
                            {Array.isArray(u.mode) ? u.mode.join(', ') : (u.mode || '—')}
                          </td>
                          <td>
                            <span className={`badge ${u.muted ? 'badge-muted' : 'badge-active'}`}>
                              {u.muted ? 'Silenciado' : 'Activo'}
                            </span>
                          </td>
                          <td style={{textAlign:'right'}}>
                            <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                              <button className="btn btn-sm"
                                onClick={() => muteUser(u.email, u.muted ? 'unmute' : 'mute')}>
                                {u.muted ? '🔔 Reactivar' : '🔇 Silenciar'}
                              </button>
                              <button className="btn btn-sm" style={{color:'var(--error)',borderColor:'rgba(255,101,132,0.3)'}}
                                onClick={() => deleteUser(u.email)}>
                                Borrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}