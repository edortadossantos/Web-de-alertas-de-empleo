export const runtime = 'nodejs'

import { createClient } from '@supabase/supabase-js'
import dns from 'dns/promises'
import { runScraper } from '../scraper/logic.js'

// ─── Validación de email ───────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function isEmailDomainValid(email) {
  try {
    const domain = email.split('@')[1]
    const records = await dns.resolveMx(domain)
    return records && records.length > 0
  } catch {
    return false
  }
}

// ─── Sanitización ─────────────────────────────────────────────────────────
function sanitizeAlert(body) {
  const out = {}
  out.email     = String(body.email || '').trim().toLowerCase()
  out.job_title = String(body.job_title || '').trim()
  out.city      = String(body.city || '').trim().replace(/\s{2,}/g, ' ')
  out.country   = String(body.country || '').trim()

  const rawMode = body.mode
  if (Array.isArray(rawMode)) {
    const valid = rawMode.map(m => String(m).toLowerCase().trim()).filter(m => ['remote','onsite','hybrid'].includes(m))
    out.mode = valid.length > 0 ? valid : ['onsite']
  } else {
    const m = String(rawMode || '').toLowerCase().trim()
    out.mode = ['remote','onsite','hybrid'].includes(m) ? [m] : ['onsite']
  }

  out.salary_min = body.salary_min ? Number(body.salary_min) : null
  return out
}

// ─── Rate limiting ─────────────────────────────────────────────────────────
const RATE_LIMIT_MAX    = Number(process.env.RATE_LIMIT_MAX    || 5)
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW || 60 * 60 * 1000)

async function checkRateLimit(supabase, ip) {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString()
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', windowStart)

  if (error) {
    console.warn('[rate-limit] Error:', error.message)
    return { allowed: true }
  }
  if (count >= RATE_LIMIT_MAX) return { allowed: false }

  await supabase.from('rate_limit_log').insert([{ ip, created_at: new Date().toISOString() }])
  return { allowed: true }
}

// ─── Handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 1) Rate limiting
    const { allowed } = await checkRateLimit(supabase, ip)
    if (!allowed) {
      return Response.json({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' }, { status: 429 })
    }

    // 2) Parsear y sanitizar
    const body = await request.json()
    const data = sanitizeAlert(body)

    if (!data.email || !data.job_title) {
      return Response.json({ error: 'email y job_title son obligatorios' }, { status: 400 })
    }

    // 3) Validar formato de email
    if (!EMAIL_REGEX.test(data.email)) {
      return Response.json({ error: 'El formato del email no es válido.' }, { status: 400 })
    }

    // 4) Validar dominio del email (MX record)
    const domainOk = await isEmailDomainValid(data.email)
    if (!domainOk) {
      return Response.json({ error: 'El dominio del email no parece válido.' }, { status: 400 })
    }

    // 5) Limitar longitud de campos
    if (data.job_title.length > 100) {
      return Response.json({ error: 'job_title demasiado largo.' }, { status: 400 })
    }
    if (data.city.length > 100 || data.country.length > 80) {
      return Response.json({ error: 'Localización o país demasiado largo.' }, { status: 400 })
    }

    // 6) Máximo 10 alertas por email
    const { count: alertCount } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('email', data.email)

    if (alertCount >= 10) {
      return Response.json({ error: 'Has alcanzado el límite de alertas por email (máx. 10).' }, { status: 400 })
    }

    // 7) Guardar alerta
    const { data: ins, error } = await supabase.from('alerts').insert([data]).select()
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // 8) Trigger inmediato — llamada directa sin HTTP fetch
    // Se ejecuta en segundo plano sin bloquear la respuesta al usuario
    runScraper(data.email).catch(err =>
      console.error('[save-alert] scraper error:', err.message)
    )

    return Response.json({ success: true, data: ins }, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}