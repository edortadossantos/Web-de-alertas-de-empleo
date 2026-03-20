'use client'
import { useState } from 'react'

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
  .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.18; animation: float 12s ease-in-out infinite; }
  .orb-1 { width: 500px; height: 500px; background: var(--accent); top: -150px; left: -100px; animation-delay: 0s; }
  .orb-2 { width: 400px; height: 400px; background: var(--accent2); bottom: -100px; right: -80px; animation-delay: -4s; }
  .orb-3 { width: 300px; height: 300px; background: var(--accent3); top: 40%; left: 50%; animation-delay: -8s; }
  @keyframes float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-30px) scale(1.05); }
  }

  .bg-grid {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 50px 50px;
  }

  .container { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; padding: 60px 24px 80px; }

  .header { text-align: center; margin-bottom: 56px; animation: slideDown 0.7s cubic-bezier(.22,1,.36,1) both; }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: translateY(0); } }

  .badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(108,99,255,0.12); border: 1px solid rgba(108,99,255,0.3);
    color: var(--accent); border-radius: 999px; padding: 5px 14px;
    font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px;
  }
  .badge-dot { width: 6px; height: 6px; background: var(--accent3); border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }

  h1 {
    font-family: 'Syne', sans-serif; font-size: clamp(32px, 6vw, 48px);
    font-weight: 800; line-height: 1.1; letter-spacing: -0.03em;
    background: linear-gradient(135deg, #fff 0%, var(--muted) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    margin-bottom: 12px;
  }
  .subtitle { color: var(--muted); font-size: 15px; font-weight: 300; line-height: 1.6; }

  .tabs {
    display: flex; background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 4px; gap: 2px; margin-bottom: 32px;
    animation: fadeIn 0.5s 0.2s both;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .tab {
    flex: 1; padding: 10px 16px; border-radius: 10px; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    color: var(--muted); background: transparent; transition: all 0.2s;
  }
  .tab.active { background: var(--surface2); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
  .tab:hover:not(.active) { color: var(--text); }

  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
    padding: 32px; position: relative; overflow: hidden;
    animation: slideUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both;
  }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .card::before {
    content: ''; position: absolute; inset: 0; border-radius: 20px;
    background: linear-gradient(135deg, rgba(108,99,255,0.04) 0%, transparent 60%);
    pointer-events: none;
  }

  .field { margin-bottom: 20px; }
  .field-label {
    display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
  }
  .field-label span { font-size: 10px; color: rgba(136,136,170,0.4); text-transform: none; letter-spacing: 0; margin-left: 5px; font-weight: 400; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .input {
    width: 100%; padding: 13px 16px; background: var(--bg);
    border: 1px solid var(--border); border-radius: 12px;
    color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s; outline: none;
    -webkit-appearance: none; appearance: none;
  }
  .input::placeholder { color: rgba(136,136,170,0.5); }
  .input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(108,99,255,0.15); }

  .input-prefix-wrapper { position: relative; }
  .input-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; pointer-events: none; }
  .input-with-prefix { padding-left: 28px; }

  .mode-pills { display: flex; gap: 8px; }
  .mode-pill {
    flex: 1; padding: 11px 8px; border-radius: 10px; border: 1px solid var(--border);
    background: var(--bg); color: var(--muted); font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer; text-align: center;
    transition: all 0.2s; position: relative;
  }
  .mode-pill:hover { border-color: rgba(108,99,255,0.4); color: var(--text); }
  .mode-pill.selected { background: rgba(108,99,255,0.15); border-color: var(--accent); color: var(--text); }
  .mode-pill.selected::after { content: '✓'; position: absolute; top: 4px; right: 7px; font-size: 9px; color: var(--accent); }

  .btn {
    width: 100%; padding: 15px 24px; border-radius: 12px; border: none; cursor: pointer;
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
    letter-spacing: 0.01em; position: relative; overflow: hidden; transition: all 0.2s; margin-top: 8px;
  }
  .btn-primary { background: linear-gradient(135deg, var(--accent) 0%, #8b7fff 100%); color: #fff; box-shadow: 0 4px 20px rgba(108,99,255,0.35); }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(108,99,255,0.5); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .btn-primary::after {
    content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transition: left 0.5s;
  }
  .btn-primary:hover::after { left: 100%; }

  .btn-secondary {
    background: var(--surface2); color: var(--text); border: 1px solid var(--border);
    font-size: 13px; padding: 11px 16px; width: auto; margin-top: 0;
  }
  .btn-secondary:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }
  .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

  .manage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }

  .msg {
    margin-top: 16px; padding: 12px 16px; border-radius: 10px; font-size: 13px;
    display: flex; align-items: center; gap: 8px; animation: fadeIn 0.3s both;
  }
  .msg-success { background: rgba(67,232,176,0.1); border: 1px solid rgba(67,232,176,0.25); color: var(--success); }
  .msg-error   { background: rgba(255,101,132,0.1); border: 1px solid rgba(255,101,132,0.25); color: var(--error); }
  .msg-info    { background: rgba(108,99,255,0.1);  border: 1px solid rgba(108,99,255,0.25);  color: var(--accent); }

  .checkbox-row {
    display: flex; align-items: center; gap: 10px; padding: 12px 14px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
    cursor: pointer; margin-bottom: 16px; transition: border-color 0.2s;
  }
  .checkbox-row:hover { border-color: rgba(108,99,255,0.35); }
  .checkbox-row input[type=checkbox] { accent-color: var(--accent); width: 15px; height: 15px; cursor: pointer; }
  .checkbox-row span { font-size: 13px; color: var(--muted); }

  .section-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .section-sub { font-size: 12px; color: var(--muted); margin-bottom: 20px; }
  .footer { text-align: center; margin-top: 48px; font-size: 12px; color: rgba(136,136,170,0.4); animation: fadeIn 1s 0.5s both; }
`

export default function Home() {
  const [tab, setTab] = useState('create')

  const [form, setForm] = useState({
    email: '',
    job_title: '',
    country: 'España',
    city: '',
    modes: ['onsite'],
    salary_min: ''
  })
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [saving, setSaving] = useState(false)

  function toggleMode(value) {
    setForm(prev => {
      const already = prev.modes.includes(value)
      if (already && prev.modes.length === 1) return prev
      return { ...prev, modes: already ? prev.modes.filter(m => m !== value) : [...prev.modes, value] }
    })
  }

  async function saveAlert() {
    if (!form.email || !form.job_title) {
      setMsg({ text: 'El email y el puesto son obligatorios.', type: 'error' }); return
    }
    setSaving(true); setMsg({ text: '', type: '' })
    try {
      const payload = {
        email: form.email,
        job_title: form.job_title,
        country: form.country,
        city: form.city,
        mode: form.modes,
        salary_min: form.salary_min ? Number(form.salary_min) : null
      }
      const res = await fetch('/api/save-alert', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error al guardar alerta')
      setMsg({ text: 'Alerta guardada. Recibirás un email cuando haya novedades.', type: 'success' })
      setForm({ email: '', job_title: '', country: 'España', city: '', modes: ['onsite'], salary_min: '' })
    } catch (e) {
      setMsg({ text: e.message, type: 'error' })
    } finally { setSaving(false) }
  }

  const [emailManage, setEmailManage] = useState('')
  const [wipeHistory, setWipeHistory] = useState(false)
  const [msgManage, setMsgManage] = useState({ text: '', type: '' })
  const [busy, setBusy] = useState(false)

  async function listAlerts() {
    setBusy(true); setMsgManage({ text: '', type: '' })
    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(emailManage)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error listando alertas')
      setMsgManage({ text: `${data.items?.length || 0} alerta(s) activa(s). Abre la consola (F12) para el detalle.`, type: 'info' })
    } catch (e) { setMsgManage({ text: e.message, type: 'error' }) }
    finally { setBusy(false) }
  }

  async function deleteAllAlerts() {
    setBusy(true); setMsgManage({ text: '', type: '' })
    try {
      const res = await fetch('/api/delete-by-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailManage, wipe_history: wipeHistory })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error borrando filtros')
      setMsgManage({ text: `Filtros eliminados${wipeHistory ? ' + histórico limpio' : ''}.`, type: 'success' })
    } catch (e) { setMsgManage({ text: e.message, type: 'error' }) }
    finally { setBusy(false) }
  }

  async function mute(action) {
    setBusy(true); setMsgManage({ text: '', type: '' })
    try {
      const res = await fetch('/api/mute-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailManage, action })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error en mute/unmute')
      setMsgManage({ text: action === 'mute' ? 'Email silenciado.' : 'Email reactivado.', type: action === 'mute' ? 'info' : 'success' })
    } catch (e) { setMsgManage({ text: e.message, type: 'error' }) }
    finally { setBusy(false) }
  }

  const modes = [
    { value: 'onsite', label: '🏢 Presencial' },
    { value: 'remote', label: '🏠 Teletrabajo' },
    { value: 'hybrid', label: '⚡ Híbrido' }
  ]

  return (
    <>
      <style>{styles}</style>
      <div className="root">
        <div className="bg-orbs">
          <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        </div>
        <div className="bg-grid" />

        <div className="container">
          <header className="header">
            <div className="badge"><span className="badge-dot" />Alertas automáticas</div>
            <h1>Tu radar de empleo</h1>
            <p className="subtitle">Configura tus filtros y recibe ofertas en tu bandeja de entrada sin levantar un dedo.</p>
          </header>

          <div className="tabs">
            <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>✦ Crear alerta</button>
            <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>⚙ Gestionar</button>
          </div>

          {tab === 'create' && (
            <div className="card">
              <div className="field">
                <label className="field-label">Email</label>
                <input className="input" type="email" placeholder="tu@email.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="field">
                <label className="field-label">Puesto buscado</label>
                <input className="input" placeholder="Ej: Psicólogo, Desarrollador React…"
                  value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} />
              </div>

              <div className="field field-row">
                <div>
                  <label className="field-label">País</label>
                  <input className="input" placeholder="España"
                    value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Ciudad o provincia</label>
                  <input className="input" placeholder="Bilbao, Bizkaia…"
                    value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Salario mínimo <span>(opcional)</span></label>
                <div className="input-prefix-wrapper">
                  <span className="input-prefix">€</span>
                  <input className="input input-with-prefix" type="number" placeholder="Ej: 25000"
                    min="0" step="1000"
                    value={form.salary_min}
                    onChange={e => setForm({ ...form, salary_min: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Modalidad <span>(puedes seleccionar varias)</span></label>
                <div className="mode-pills">
                  {modes.map(m => (
                    <button key={m.value}
                      className={`mode-pill ${form.modes.includes(m.value) ? 'selected' : ''}`}
                      onClick={() => toggleMode(m.value)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={saveAlert} disabled={saving}>
                {saving ? 'Guardando…' : 'Crear alerta →'}
              </button>

              {msg.text && (
                <div className={`msg msg-${msg.type}`}>
                  {msg.type === 'success' ? '✓' : msg.type === 'error' ? '✕' : 'ℹ'} {msg.text}
                </div>
              )}
            </div>
          )}

          {tab === 'manage' && (
            <div className="card">
              <p className="section-title">Gestionar alertas</p>
              <p className="section-sub">Introduce el email asociado a tus alertas para listarlas, silenciarlas o eliminarlas.</p>

              <div className="field">
                <label className="field-label">Email</label>
                <input className="input" type="email" placeholder="tu@email.com"
                  value={emailManage} onChange={e => setEmailManage(e.target.value)} />
              </div>

              <label className="checkbox-row">
                <input type="checkbox" checked={wipeHistory} onChange={e => setWipeHistory(e.target.checked)} />
                <span>Al borrar filtros, limpiar también el histórico de envíos</span>
              </label>

              <div className="manage-grid">
                <button className="btn btn-secondary" onClick={listAlerts} disabled={busy || !emailManage}>Ver alertas</button>
                <button className="btn btn-secondary" onClick={deleteAllAlerts} disabled={busy || !emailManage}>Borrar filtros</button>
                <button className="btn btn-secondary" onClick={() => mute('mute')} disabled={busy || !emailManage}>🔇 Silenciar</button>
                <button className="btn btn-secondary" onClick={() => mute('unmute')} disabled={busy || !emailManage}>🔔 Reactivar</button>
              </div>

              {msgManage.text && (
                <div className={`msg msg-${msgManage.type}`}>
                  {msgManage.type === 'success' ? '✓' : msgManage.type === 'error' ? '✕' : 'ℹ'} {msgManage.text}
                </div>
              )}
            </div>
          )}

          <p className="footer">Powered by Adzuna · Next.js · Supabase</p>
        </div>
      </div>
    </>
  )
}