'use client'
import { useState } from 'react'

export default function Home() {
  const [form, setForm] = useState({
    email: '',
    job_title: '',
    country: '',
    city: '',
    mode: 'remote',
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function send() {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/save-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error al guardar')
      setMsg('✅ Alerta guardada correctamente')
    } catch (e) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const input = { display: 'block', marginBottom: 10, padding: 8, width: 320 }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>Crear alerta de empleo</h1>
      <input
        style={input}
        placeholder="Email"
        value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
      />
      <input
        style={input}
        placeholder="Puesto (job_title)"
        value={form.job_title}
        onChange={e => setForm({ ...form, job_title: e.target.value })}
      />
      <input
        style={input}
        placeholder="País (country)"
        value={form.country}
        onChange={e => setForm({ ...form, country: e.target.value })}
      />
      <input
        style={input}
        placeholder="Ciudad (city)"
        value={form.city}
        onChange={e => setForm({ ...form, city: e.target.value })}
      />

      <label style={{ display:'block', marginTop: 6, marginBottom: 6 }}>Modalidad</label>
      <select
        style={{ ...input, width: 336 }}
        value={form.mode}
        onChange={e => setForm({ ...form, mode: e.target.value })}
      >
        <option value="remote">Teletrabajo</option>
        <option value="onsite">Presencial</option>
        <option value="hybrid">Híbrido</option>
      </select>

      <button disabled={saving} onClick={send} style={{ padding: '8px 16px' }}>
        {saving ? 'Guardando…' : 'Guardar alerta'}
      </button>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  )
}