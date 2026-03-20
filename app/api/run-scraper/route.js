export const runtime = 'nodejs'

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import nodemailer from 'nodemailer'

const MAX_PAGES_ENV   = Number(process.env.ADZUNA_MAX_PAGES || 0)
const MAX_RESULTS_ENV = Number(process.env.ADZUNA_MAX_RESULTS_PER_ALERT || 0)
const CHUNK_SIZE      = Number(process.env.EMAIL_CHUNK_SIZE || 100)

const CITY_FIX = {
  'barceloma': 'barcelona',
  'bilbao españa': 'bilbao',
  'barcelona españa': 'barcelona',
  'madrid españa': 'madrid',
  'españa': '',
  'spain': ''
}

function cleanCity(rawCity = '') {
  let s = String(rawCity || '').toLowerCase().trim()
  s = s.replace(/\s+españa\b/g, '').replace(/\s+spain\b/g, '')
  if (CITY_FIX[s]) s = CITY_FIX[s]
  s = s.replace(/\s{2,}/g, ' ').trim()
  return s
}

const normalizeIndeed = (job, domain) => {
  let link = job.link || ''
  if (link && !link.startsWith('http')) link = domain + link
  return { title: job.title || '', link, company: job.company || '', location: job.location || '', snippet: job.snippet || '' }
}

const matchesMode = (mode, jobText) => {
  const s = (jobText || '').toLowerCase()
  const isRemote = s.includes('remote') || s.includes('teletrab') || s.includes('remoto')
  const isHybrid = s.includes('hybrid') || s.includes('híbrido') || s.includes('hibrido')
  if (mode === 'remote') return isRemote
  if (mode === 'hybrid') return isHybrid || (isRemote && s.includes('híbrido'))
  if (mode === 'onsite') return !isRemote
  return true
}

async function fetchAdzunaOffers(alert) {
  const WHAT  = encodeURIComponent(String(alert.job_title || '').trim())
  const WHERE = encodeURIComponent(cleanCity(alert.city))
  const base  = `https://api.adzuna.com/v1/api/jobs/es/search`
  const all   = []
  let page    = 1

  while (true) {
    if (MAX_PAGES_ENV > 0 && page > MAX_PAGES_ENV) break
    if (MAX_RESULTS_ENV > 0 && all.length >= MAX_RESULTS_ENV) break

    const params = new URLSearchParams({
      app_id:  process.env.ADZUNA_APP_ID,
      app_key: process.env.ADZUNA_APP_KEY,
      results_per_page: '20',
      what: WHAT, where: WHERE,
      'content-type': 'application/json'
    })

    try {
      const { data } = await axios.get(`${base}/${page}?${params}`, {
        headers: { Accept: 'application/json' }, timeout: 20000
      })
      const results = data?.results || []
      if (results.length === 0) break
      all.push(...results.map(r => ({
        title:    r?.title || '',
        link:     r?.redirect_url || '',
        company:  r?.company?.display_name || '',
        location: r?.location?.display_name || '',
        snippet:  (r?.description || '').slice(0, 300)
      })))
      if (MAX_RESULTS_ENV > 0 && all.length >= MAX_RESULTS_ENV) break
      page++
    } catch (e) {
      console.warn('[Adzuna] error', e?.response?.status, e?.message)
      break
    }
  }
  return all
}

async function fetchIndeedOffers(alert) {
  const q      = encodeURIComponent(String(alert.job_title || '').trim())
  const l      = encodeURIComponent(cleanCity(alert.city))
  const domain = 'https://www.indeed.es'

  try {
    const { data: html } = await axios.get(`${domain}/jobs?q=${q}&l=${l}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9', 'DNT': '1'
      }, timeout: 20000
    })
    const $ = cheerio.load(html)
    const found = []
    $('[data-testid="slider_item"]').each(function () {
      const title    = $(this).find('h2 a').text().trim()
      const link     = $(this).find('h2 a').attr('href') || ''
      const company  = $(this).find('[data-testid="company-name"]').text().trim()
      const location = $(this).find('[data-testid="text-location"]').text().trim()
      const snippet  = $(this).find('[data-testid="job-snippet"]').text().trim()
      if (title && link) found.push(normalizeIndeed({ title, link, company, location, snippet }, domain))
    })
    return found
  } catch (e) {
    console.warn('⚠️ Indeed bloqueado:', e?.response?.status, e?.message)
    return []
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────
export async function GET(request) {

  // ── Autenticación obligatoria ──────────────────────────────────────────
  // CRON_SECRET es REQUERIDA. Sin ella el endpoint queda bloqueado.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[run-scraper] CRON_SECRET no definida. Endpoint bloqueado por seguridad.')
    return Response.json({ error: 'Endpoint no disponible.' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    // Log del intento fallido con IP para detectar abusos
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    console.warn(`[run-scraper] Acceso no autorizado desde IP: ${ip}`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Variables de entorno requeridas ───────────────────────────────────
  const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','EMAIL','EMAIL_PASS','ADZUNA_APP_ID','ADZUNA_APP_KEY']
  const missing  = required.filter(k => !process.env[k])
  if (missing.length) return Response.json({ error: `Faltan variables: ${missing.join(', ')}` }, { status: 500 })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // ── Filtro opcional por email (trigger inmediato desde save-alert) ─────
  const { searchParams } = new URL(request.url)
  const emailFilter = searchParams.get('email')?.toLowerCase().trim() || null

  if (emailFilter) {
    console.log(`[run-scraper] Trigger inmediato para: ${emailFilter}`)
  } else {
    console.log('[run-scraper] Modo cron — procesando todas las alertas')
  }

  // ── Cargar alertas ────────────────────────────────────────────────────
  let query = supabase.from('alerts').select('*')
  if (emailFilter) query = query.eq('email', emailFilter)

  const { data: alerts, error: alertsError } = await query
  if (alertsError) return Response.json({ error: alertsError.message }, { status: 500 })

  // ── Emails muteados ───────────────────────────────────────────────────
  const { data: mutedRows, error: mutedErr } = await supabase.from('muted_emails').select('email')
  if (mutedErr) return Response.json({ error: mutedErr.message }, { status: 500 })
  const mutedSet = new Set((mutedRows || []).map(r => String(r.email || '').toLowerCase()))

  const effectiveAlerts = (alerts || []).filter(
    a => !mutedSet.has(String(a.email || '').toLowerCase())
  )

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS }
  })

  let totalNew = 0
  const resultsByUser = {}

  for (const alert of effectiveAlerts) {
    try {
      const [adz, ind] = await Promise.all([fetchAdzunaOffers(alert), fetchIndeedOffers(alert)])
      const mode   = (alert.mode || '').toLowerCase()
      const merged = [...adz, ...ind].filter(j =>
        matchesMode(mode, `${j.title} ${j.snippet} ${j.location}`)
      )

      for (const job of merged) {
        if (!job?.link) continue

        const { data: already, error: alreadyErr } = await supabase
          .from('jobs-sent')
          .select('job_id').eq('job_id', job.link).eq('sent_to', alert.email).maybeSingle()

        if (alreadyErr) { console.error('supabase check error', alreadyErr.message); continue }
        if (already) continue

        if (!resultsByUser[alert.email]) resultsByUser[alert.email] = []
        resultsByUser[alert.email].push(job)

        const { error: insErr } = await supabase
          .from('jobs-sent')
          .insert([{ job_id: job.link, sent_to: alert.email }])
        if (insErr) console.error('insert jobs-sent error', insErr.message)
        else totalNew++
      }
    } catch (e) {
      console.error('Error procesando alerta:', e?.message)
    }
  }

  // ── Enviar correos ────────────────────────────────────────────────────
  for (const [email, jobs] of Object.entries(resultsByUser)) {
    if (!jobs?.length) continue
    const chunks = (!isFinite(CHUNK_SIZE) || CHUNK_SIZE <= 0)
      ? [jobs]
      : Array.from({ length: Math.ceil(jobs.length / CHUNK_SIZE) }, (_, i) => jobs.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const lines = chunk.map(j => `• ${j.title} — ${j.company || ''} (${j.location || ''})\n  ${j.link}`).join('\n\n')
      const subject = chunks.length > 1
        ? `Nuevas ofertas (${chunk.length}/${jobs.length}) [parte ${i + 1}/${chunks.length}]`
        : `Nuevas ofertas (${jobs.length}) para tu alerta`
      try {
        await transporter.sendMail({
          from: `"Alertas de Empleo" <${process.env.EMAIL}>`, to: email, subject,
          text: `Hola,\n\nHemos encontrado ${jobs.length} oferta(s) nueva(s) que encajan con tu alerta.\n\n${lines}\n\n— Alertas de Empleo`
        })
      } catch (e) { console.error('email error', e.message) }
    }
  }

  return Response.json({ ok: true, alerts: alerts?.length || 0, newSent: totalNew })
}