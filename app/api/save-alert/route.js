import { createClient } from '@supabase/supabase-js'

function sanitizeAlert(body) {
  const out = {}
  out.email      = String(body.email || '').trim()
  out.job_title  = String(body.job_title || '').trim()
  const rawCity  = String(body.city || '').toLowerCase().trim()
  // quita país pegado y dobles espacios; corrige typos básicos
  let city = rawCity.replace(/\s+españa\b/g, '').replace(/\s+spain\b/g, '')
  city = city.replace(/\s{2,}/g, ' ').trim()
  if (city === 'barceloma') city = 'barcelona'
  out.city      = city
  out.country   = String(body.country || '').trim()      // opcional; no lo metemos en where
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
    return Response.json({ success: true, data: ins }, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}