import { createClient } from '@supabase/supabase-js'

function sanitizeAlert(body) {
  const out = {}
  out.email      = String(body.email || '').trim()
  out.job_title  = String(body.job_title || '').trim()
  const rawCity  = String(body.city || '').toLowerCase().trim()
  let city = rawCity.replace(/\s+españa\b/g, '').replace(/\s+spain\b/g, '')
  city = city.replace(/\s{2,}/g, ' ').trim()
  if (city === 'barceloma') city = 'barcelona'
  out.city      = city
  out.country   = String(body.country || '').trim()
  const mode    = String(body.mode || '').toLowerCase().trim()
  out.mode      = ['remote','onsite','hybrid'].includes(mode) ? mode : ''
  return out
}

export async function POST(request) {
  try {
    const body = await request.json()
    const data = sanitizeAlert(body)

    if (!data.email || !data.job_title) {
      return Response.json({ error: 'email y job_title son obligatorios' }, { status: 400 })
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: ins, error } = await supabase.from('alerts').insert([data]).select()
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // ── Trigger inmediato: lanzar scraper solo para este email ──
    // Lo hacemos sin await para no bloquear la respuesta al usuario.
    // El usuario recibe "Alerta guardada" al instante; el correo llega segundos después.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://web-de-alertas-de-empleo.vercel.app'
    const scraperUrl = `${baseUrl}/api/run-scraper?email=${encodeURIComponent(data.email)}`

    fetch(scraperUrl, {
      headers: {
        ...(process.env.CRON_SECRET
          ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
          : {})
      }
    }).catch(err => console.error('[save-alert] trigger scraper error:', err.message))

    return Response.json({ success: true, data: ins }, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}