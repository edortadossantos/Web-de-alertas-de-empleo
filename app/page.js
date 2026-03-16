'use client'
import { useState } from 'react'

export default function Home() {
  // ====== Formulario de alta de alertas ======
  const [form, setForm] = useState({
    email: '',
    job_title: '',
    country: '',
    city: '',
    mode: 'onsite'
  })
  const [msg, setMsg] = useState('')

  async function saveAlert() {
    setMsg('Guardando…')
    try {
      const res = await fetch('/api/save-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error al guardar alerta')
      setMsg('✅ Alerta guardada')
    } catch (e) {
      setMsg(`❌ ${e.message}`)
    }
  }

  const input = { display:'block', marginBottom:10, padding:8, width:320 }

  // ====== Gestión por email (listar, borrar, mute/unmute) ======
  const [emailManage, setEmailManage] = useState('');
  const [wipeHistory, setWipeHistory] = useState(false);
  const [msgManage, setMsgManage] = useState('');

  async function listAlerts() {
    setMsgManage('Cargando…');
    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(emailManage)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error listando alertas');
      console.log('Alertas para', emailManage, data.items);
      setMsgManage(`Encontradas ${data.items?.length || 0} alertas. Abre la consola (F12) para verlas.`);
    } catch (e) {
      setMsgManage(`❌ ${e.message}`);
    }
  }

  async function deleteAllAlerts() {
    setMsgManage('Borrando…');
    try {
      const res = await fetch('/api/delete-by-email', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email: emailManage, wipe_history: wipeHistory })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error borrando filtros');
      setMsgManage(`✅ Filtros borrados${wipeHistory ? ' + histórico limpio' : ''} para ${emailManage}`);
    } catch (e) {
      setMsgManage(`❌ ${e.message}`);
    }
  }

  async function mute(action) {
    setMsgManage('Procesando…');
    try {
      const res = await fetch('/api/mute-email', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email: emailManage, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error en mute/unmute');
      setMsgManage(
        action === 'mute'
          ? `✅ ${emailManage} silenciado (no recibirá más avisos)`
          : `✅ ${emailManage} reactivado (volverá a recibir avisos)`
      );
    } catch (e) {
      setMsgManage(`❌ ${e.message}`);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily:'sans-serif' }}>
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

      <label style={{ display:'block', marginBottom:6 }}>Modalidad</label>
      <select
        style={{ ...input, width: 336 }}
        value={form.mode}
        onChange={e => setForm({ ...form, mode: e.target.value })}
      >
        <option value="remote">Teletrabajo</option>
        <option value="onsite">Presencial</option>
        <option value="hybrid">Híbrido</option>
      </select>

      <button onClick={saveAlert} style={{ padding: '8px 16px' }}>
        Guardar alerta
      </button>
      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

      {/* ===== Bloque Gestión por Email ===== */}
      <hr style={{ margin: '24px 0' }} />
      <h2>Gestionar por email</h2>

      <div style={{ marginBottom: 8 }}>
        <input
          style={{ padding: 8, width: 320, marginRight: 8 }}
          placeholder="Email para gestionar"
          value={emailManage}
          onChange={e => setEmailManage(e.target.value)}
        />
      </div>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={wipeHistory}
          onChange={e => setWipeHistory(e.target.checked)}
          style={{ marginRight: 6 }}
        />
        Al borrar filtros, limpiar también el histórico de envíos (jobs-sent)
      </label>

      <div style={{ display:'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button onClick={listAlerts} style={{ padding:'8px 16px' }}>
          Listar alertas (ver consola)
        </button>
        <button onClick={deleteAllAlerts} style={{ padding:'8px 16px' }}>
          Borrar filtros (este email)
        </button>
        <button onClick={() => mute('mute')} style={{ padding:'8px 16px' }}>
          No mandar más avisos (mute)
        </button>
        <button onClick={() => mute('unmute')} style={{ padding:'8px 16px' }}>
          Volver a mandar avisos (unmute)
        </button>
      </div>

      {msgManage && <p style={{ marginTop: 10 }}>{msgManage}</p>}
    </div>
  )
}