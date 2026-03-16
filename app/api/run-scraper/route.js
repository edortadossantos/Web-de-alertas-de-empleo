// Fuerza runtime Node para poder usar nodemailer en Next.js 16
export const runtime = 'nodejs'

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import nodemailer from 'nodemailer'

// =======================
// Parámetros opcionales por ENV (límite defensivo)
// Si NO los defines en Vercel/.env.local, no aplican límites.
// =======================
const MAX_PAGES_ENV   = Number(process.env.ADZUNA_MAX_PAGES || 0)              // 0 = sin tope
const MAX_RESULTS_ENV = Number(process.env.ADZUNA_MAX_RESULTS_PER_ALERT || 0)  // 0 = sin tope
const CHUNK_SIZE      = Number(process.env.EMAIL_CHUNK_SIZE || 100)            // troceo de emails

// ========= Utilidades =========
const CITY_FIX = {
  'barceloma': 'barcelona',
  'bilbao españa': 'bilbao',
  'barcelona españa': 'barcelona',
  'madrid españa': 'madrid',
  'españa': '',
  'spain': ''
}

function cleanCity(rawCity = '', rawCountry = '') {
  let s = String(rawCity || '').toLowerCase().trim()
  // el país ya va en /jobs/es/, no lo metas en where
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

const matchesMode = (mode, jobText, apiTeleworking) => {
  const s = (jobText || '').toLowerCase()
  const isRemote = s.includes('remote') || s.includes('teletrab') || s.includes('remoto')
  const isHybrid = s.includes('hybrid') || s.includes('híbrido') || s.includes('hibrido')

  if (apiTeleworking) {
    const t = apiTeleworking.toLowerCase()
    if (mode === 'remote') return ['remote','teletrab','remoto','home'].some(x => t.includes(x))
    if (mode === 'hybrid') return t.includes('hybrid') || t.includes('híbrido') || t.includes('hibrido')
    if (mode === 'onsite') return t.includes('office') || t.includes('presencial')
  }
  if (mode === 'remote') return isRemote
  if (mode === 'hybrid') return isHybrid || (isRemote && s.includes('híbrido'))
  if (mode === 'onsite') return !isRemote
  return true
}

// ========= Adzuna (ES): paginar hasta el final =========
async function fetchAdzunaOffers(alert) {
  const WHAT  = encodeURIComponent(String(alert.job_title || '').trim())
  const CITY  = cleanCity(alert.city, alert.country)
  const WHERE = encodeURIComponent(CITY)         // solo ciudad
  const base  = `https://api.adzuna.com/v1/api/jobs/es/search`

  const all = []
  let page = 1

  while (true) {
    // Límite defensivo opcional de páginas
    if (MAX_PAGES_ENV > 0 && page > MAX_PAGES_ENV) {
      console.warn(`[Adzuna] Parado por ADZUNA_MAX_PAGES=${MAX_PAGES_ENV}`)
      break
    }
    // Límite defensivo opcional de resultados
    if (MAX_RESULTS_ENV > 0 && all.length >= MAX_RESULTS_ENV) {
      console.warn(`[Adzuna] Parado por ADZUNA_MAX_RESULTS_PER_ALERT=${MAX_RESULTS_ENV}`)
      break
    }

    const params = new URLSearchParams({
      app_id:  process.env.ADZUNA_APP_ID,
      app_key: process.env.ADZUNA_APP_KEY,
      results_per_page: '20',
      what: WHAT,
      where: WHERE,
      'content-type': 'application/json'
    })
    const url = `${base}/${page}?${params.toString()}`

    try {
      const { data } = await axios.get(url, {
        headers: { 'Accept': 'application/json' },
        timeout: 20000
      })
      const results = data?.results || []
      console.log(`[Adzuna] page=${page} what="${decodeURIComponent(WHAT)}" where="${decodeURIComponent(WHERE)}" -> ${results.length} resultados`)

      if (results.length === 0) break  // FIN NATURAL (no hay más)

      const batch = results.map(r => ({
        title:    r?.title || '',
        link:     r?.redirect_url || '',
        company:  r?.company?.display_name || '',
        location: r?.location?.display_name || '',
        snippet:  (r?.description || '').slice(0, 300)
      }))
      all.push(...batch)

      // Límite defensivo por resultados tras añadir la tanda
      if (MAX_RESULTS_ENV > 0 && all.length >= MAX_RESULTS_ENV) {
        console.warn(`[Adzuna] Parado por ADZUNA_MAX_RESULTS_PER_ALERT tras añadir page=${page}`)
        break
      }

      page += 1
    } catch (e) {
      console.warn('[Adzuna] error', { url, status: e?.response?.status, msg: e?.message })
      break
    }
  }

  return all
}

// ========= Indeed (secundario, tolera 403) =========
async function fetchIndeedOffers(alert) {
  const q = encodeURIComponent(String(alert.job_title || '').trim())
  const cityOnly = cleanCity(alert.city, alert.country)
  const l = encodeURIComponent(cityOnly)
  const domain = 'https://www.indeed.es'
  const url = `${domain}/jobs?q=${q}&l=${l}`

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': domain + '/', 'Cache-Control':'no-cache','Pragma':'no-cache','DNT':'1','Upgrade-Insecure-Requests':'1'
      }, timeout: 20000
    })
    const $ = cheerio.load(html)
    const found = []
    $('[data-testid="slider_item"]').each(function () {
      const title = $(this).find('h2 a').text().trim()
      let link    = $(this).find('h2 a').attr('href') || ''
      const company  = $(this).find('[data-testid="company-name"]').text().trim()
      const location = $(this).find('[data-testid="text-location"]').text().trim()
      const snippet  = $(this).find('[data-testid="job-snippet"]').text().trim()
      if (title && link) found.push(normalizeIndeed({ title, link, company, location, snippet }, domain))
    })
    return found
  } catch (e) {
    console.warn('⚠️ Bloqueado por Indeed / error HTTP. Se salta Indeed para esta alerta.', { url, status: e?.response?.status, msg: e?.message })
    return []
  }
}

// ========= Handler =========
export async function GET(request) {
  // Protección por token: se requiere header Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','EMAIL','EMAIL_PASS','ADZUNA_APP_ID','ADZUNA_APP_KEY']
  const missing = required.filter(k => !process.env[k])
  if (missing.length) return Response.json({ error: `Faltan variables: ${missing.join(', ')}` }, { status: 500 })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // 1) Cargar alertas
  const { data: alerts, error: alertsError } = await supabase.from('alerts').select('*')
  if (alertsError) return Response.json({ error: alertsError.message }, { status: 500 })

  // 2) Cargar emails muteados y construir Set para filtrarlos
  const { data: mutedRows, error: mutedErr } = await supabase.from('muted_emails').select('email')
  if (mutedErr) return Response.json({ error: mutedErr.message }, { status: 500 })
  const mutedSet = new Set((mutedRows || []).map(r => String(r.email || '').toLowerCase()))

  // 3) Filtrar alertas por emails NO muteados
  const effectiveAlerts = (alerts || []).filter(a => !mutedSet.has(String(a.email || '').toLowerCase()))

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS } })

  let totalNew = 0
  const resultsByUser = {}

  for (const alert of effectiveAlerts) {
    try {
      const [adz, ind] = await Promise.all([ fetchAdzunaOffers(alert), fetchIndeedOffers(alert) ])
      console.log(`Adzuna devolvió ${adz.length} | Indeed devolvió ${ind.length} para`, alert)

      const mode = (alert.mode || '').toLowerCase()
      const merged = [...adz, ...ind].filter(j => matchesMode(mode, `${j.title} ${j.snippet} ${j.location}`, null))
      console.log(`Tras filtro de modalidad (${mode}) quedan ${merged.length}`)

      for (const job of merged) {
        if (!job?.link) continue

        // DEDUPE por (job_id, sent_to)
        const { data: already, error: alreadyErr } = await supabase
          .from('jobs-sent')  // o jobs_sent si renombraste
          .select('job_id').eq('job_id', job.link).eq('sent_to', alert.email).maybeSingle()

        if (alreadyErr) { console.error('supabase check error', alreadyErr.message); continue }
        if (already) continue

        if (!resultsByUser[alert.email]) resultsByUser[alert.email] = []
        resultsByUser[alert.email].push(job)

        const { error: insErr } = await supabase
          .from('jobs-sent')  // o jobs_sent
          .insert([{ job_id: job.link, sent_to: alert.email }])

        if (insErr) console.error('insert jobs-sent error', insErr.message)
        else totalNew++
      }
    } catch (e) {
      console.error('Error procesando una alerta:', e?.message)
    }
  }

  // 4) Enviar correos (troceo si hay muchos)
  for (const [email, jobs] of Object.entries(resultsByUser)) {
    if (!jobs?.length) continue

    if (!isFinite(CHUNK_SIZE) || CHUNK_SIZE <= 0) {
      const lines = jobs.map(j => `• ${j.title} — ${j.company || ''} (${j.location || ''})\n  ${j.link}`).join('\n\n')
      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: `Nuevas ofertas (${jobs.length}) para tu alerta`,
          text: `Hola,\n\nHemos encontrado ${jobs.length} oferta(s) nueva(s) que encajan con tu alerta.\n\n${lines}\n\n— Buscador de Empleo Automatizado`
        })
      } catch (e) { console.error('email error', e.message) }
    } else {
      for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
        const chunk = jobs.slice(i, i + CHUNK_SIZE)
        const lines = chunk.map(j => `• ${j.title} — ${j.company || ''} (${j.location || ''})\n  ${j.link}`).join('\n\n')
        const index = Math.floor(i / CHUNK_SIZE) + 1
        const totalChunks = Math.ceil(jobs.length / CHUNK_SIZE)
        try {
          await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: `Nuevas ofertas (${chunk.length}/${jobs.length}) [parte ${index}/${totalChunks}]`,
            text: `Hola,\n\nHemos encontrado ${jobs.length} oferta(s) nueva(s) que encajan con tu alerta.\n\n${lines}\n\n— Buscador de Empleo Automatizado`
          })
        } catch (e) { console.error('email error', e.message) }
      }
    }
  }

  if (!Object.keys(resultsByUser).length) console.log('No hay novedades para enviar (dedupe/filtrado dejó 0)')
  return Response.json({ ok: true, alerts: alerts?.length || 0, newSent: totalNew })
}

