export const runtime = 'nodejs'

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import nodemailer from 'nodemailer'

const MAX_PAGES_ENV   = Number(process.env.ADZUNA_MAX_PAGES || 0)
const MAX_RESULTS_ENV = Number(process.env.ADZUNA_MAX_RESULTS_PER_ALERT || 0)
const CHUNK_SIZE      = Number(process.env.EMAIL_CHUNK_SIZE || 100)

function cleanLocation(raw = '') {
  let s = String(raw || '').trim()
  s = s.replace(/,?\s*españa\s*$/i, '').replace(/,?\s*spain\s*$/i, '')
  return s.replace(/\s{2,}/g, ' ').trim()
}

const normalizeIndeed = (job, domain) => {
  let link = job.link || ''
  if (link && !link.startsWith('http')) link = domain + link
  return { title: job.title || '', link, company: job.company || '', location: job.location || '', snippet: job.snippet || '', salary_min: null, salary_max: null }
}

const STOPWORDS = new Set(['de','la','el','en','y','a','con','para','por','del','los','las','un','una','al'])

function isRelevant(jobTitle, searchedTitle) {
  const normalize = str => str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  const searchWords = normalize(searchedTitle)
  const titleWords  = normalize(jobTitle)
  if (searchWords.length === 0) return true
  return searchWords.some(sw => titleWords.some(tw => tw.includes(sw) || sw.includes(tw)))
}

function matchesMode(modes, jobText) {
  const modesArr = Array.isArray(modes)
    ? modes.map(m => m.toLowerCase())
    : [String(modes || '').toLowerCase()]
  if (modesArr.length === 0 || modesArr.every(m => !['remote','onsite','hybrid'].includes(m))) return true
  const s = (jobText || '').toLowerCase()
  const isRemote = s.includes('remote') || s.includes('teletrab') || s.includes('remoto')
  const isHybrid = s.includes('hybrid') || s.includes('híbrido') || s.includes('hibrido')
  return modesArr.some(mode => {
    if (mode === 'remote') return isRemote
    if (mode === 'hybrid') return isHybrid
    if (mode === 'onsite') return !isRemote && !isHybrid
    return true
  })
}

// ─── Template HTML ────────────────────────────────────────────────────────
function buildEmailHtml(jobs, totalJobs) {
  const jobCards = jobs.map(j => {
    const salary = (j.salary_min || j.salary_max)
      ? `<div style="margin-top:6px;">
           <span style="display:inline-block;background:#f0eeff;color:#6c63ff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">
             💰 ${j.salary_min ? j.salary_min.toLocaleString('es-ES') + '€' : ''}${j.salary_max ? ' – ' + j.salary_max.toLocaleString('es-ES') + '€' : ''}
           </span>
         </div>`
      : ''
    const company  = j.company  ? `<div style="color:#666;font-size:13px;margin-top:4px;">🏢 ${j.company}</div>`  : ''
    const location = j.location ? `<div style="color:#666;font-size:13px;margin-top:2px;">📍 ${j.location}</div>` : ''

    return `
      <div style="background:#fff;border:1px solid #e8e8f0;border-radius:12px;padding:20px;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:700;color:#1a1a2e;line-height:1.3;">${j.title}</div>
        ${company}${location}${salary}
        <div style="margin-top:14px;">
          <a href="${j.link}" target="_blank"
             style="display:inline-block;background:#6c63ff;color:#fff;text-decoration:none;padding:9px 20px;border-radius:8px;font-size:13px;font-weight:600;">
            Ver oferta →
          </a>
        </div>
      </div>`
  }).join('')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://web-de-alertas-de-empleo.vercel.app'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <tr><td style="background:linear-gradient(135deg,#6c63ff,#8b7fff);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🎯 Alertas de Empleo</div>
          <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px;">
            Hemos encontrado <strong>${totalJobs} oferta${totalJobs !== 1 ? 's' : ''} nueva${totalJobs !== 1 ? 's' : ''}</strong> que encajan con tu alerta
          </div>
        </td></tr>

        <tr><td style="padding:20px 0;">${jobCards}</td></tr>

        <tr><td style="background:#fff;border:1px solid #e8e8f0;border-radius:12px;padding:20px;text-align:center;">
          <div style="color:#999;font-size:12px;line-height:1.6;">
            Recibes este email porque tienes una alerta activa en <strong>Alertas de Empleo</strong>.<br>
            ¿Ya no quieres recibirlos? <a href="${baseUrl}" style="color:#6c63ff;text-decoration:none;">Gestiona tus alertas aquí</a>.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildEmailText(jobs) {
  return jobs.map(j => {
    const salary = (j.salary_min || j.salary_max)
      ? ` | 💰 ${j.salary_min ? j.salary_min.toLocaleString('es-ES') + '€' : ''}${j.salary_max ? ' – ' + j.salary_max.toLocaleString('es-ES') + '€' : ''}`
      : ''
    return `• ${j.title} — ${j.company || ''} (${j.location || ''})${salary}\n  ${j.link}`
  }).join('\n\n')
}

// ─── Adzuna ───────────────────────────────────────────────────────────────
async function fetchAdzunaOffers(alert) {
  const WHAT  = encodeURIComponent(String(alert.job_title || '').trim())
  const WHERE = encodeURIComponent(cleanLocation(alert.city))
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
    if (alert.salary_min) params.set('salary_min', String(alert.salary_min))

    try {
      const { data } = await axios.get(`${base}/${page}?${params}`, {
        headers: { Accept: 'application/json' }, timeout: 20000
      })
      const results = data?.results || []
      console.log(`[Adzuna] page=${page} what="${alert.job_title}" where="${cleanLocation(alert.city)}" -> ${results.length} resultados`)
      if (results.length === 0) break

      all.push(...results.map(r => ({
        title:      r?.title || '',
        link:       r?.redirect_url || '',
        company:    r?.company?.display_name || '',
        location:   r?.location?.display_name || '',
        snippet:    (r?.description || '').slice(0, 300),
        salary_min: r?.salary_min || null,
        salary_max: r?.salary_max || null
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

// ─── Indeed ───────────────────────────────────────────────────────────────
async function fetchIndeedOffers(alert) {
  const q      = encodeURIComponent(String(alert.job_title || '').trim())
  const l      = encodeURIComponent(cleanLocation(alert.city))
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
    console.warn('⚠️ Indeed bloqueado:', e?.response?.status)
    return []
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[run-scraper] CRON_SECRET no definida. Endpoint bloqueado.')
    return Response.json({ error: 'Endpoint no disponible.' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    console.warn(`[run-scraper] Acceso no autorizado desde IP: ${ip}`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','EMAIL','EMAIL_PASS','ADZUNA_APP_ID','ADZUNA_APP_KEY']
  const missing  = required.filter(k => !process.env[k])
  if (missing.length) return Response.json({ error: `Faltan variables: ${missing.join(', ')}` }, { status: 500 })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { searchParams } = new URL(request.url)
  const emailFilter = searchParams.get('email')?.toLowerCase().trim() || null

  if (emailFilter) console.log(`[run-scraper] Trigger inmediato para: ${emailFilter}`)
  else console.log('[run-scraper] Modo cron — todas las alertas')

  let query = supabase.from('alerts').select('*')
  if (emailFilter) query = query.eq('email', emailFilter)

  const { data: alerts, error: alertsError } = await query
  if (alertsError) return Response.json({ error: alertsError.message }, { status: 500 })

  const { data: mutedRows } = await supabase.from('muted_emails').select('email')
  const mutedSet = new Set((mutedRows || []).map(r => String(r.email || '').toLowerCase()))
  const effectiveAlerts = (alerts || []).filter(a => !mutedSet.has(String(a.email || '').toLowerCase()))

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS }
  })

  let totalNew = 0
  const resultsByUser = {}

  for (const alert of effectiveAlerts) {
    try {
      const [adz, ind] = await Promise.all([fetchAdzunaOffers(alert), fetchIndeedOffers(alert)])
      console.log(`Adzuna: ${adz.length} | Indeed: ${ind.length} para ${alert.email}`)

      const merged = [...adz, ...ind].filter(j => {
        if (!isRelevant(j.title, alert.job_title)) return false
        if (!matchesMode(alert.mode, `${j.title} ${j.snippet} ${j.location}`)) return false
        return true
      })
      console.log(`Tras filtros quedan ${merged.length}`)

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
      : Array.from({ length: Math.ceil(jobs.length / CHUNK_SIZE) }, (_, i) =>
          jobs.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const subject = chunks.length > 1
        ? `🎯 Nuevas ofertas (${chunk.length}/${jobs.length}) [parte ${i + 1}/${chunks.length}]`
        : `🎯 ${jobs.length} oferta${jobs.length !== 1 ? 's' : ''} nueva${jobs.length !== 1 ? 's' : ''} para ti`

      try {
        await transporter.sendMail({
          from: `"Alertas de Empleo" <${process.env.EMAIL}>`,
          to: email,
          subject,
          html: buildEmailHtml(chunk, jobs.length),
          text: buildEmailText(chunk)
        })
        console.log(`[email] Enviado a ${email} con ${chunk.length} ofertas`)
      } catch (e) { console.error('email error', e.message) }
    }
  }

  if (!Object.keys(resultsByUser).length) {
    console.log(emailFilter ? `Sin novedades para ${emailFilter}` : 'Sin novedades para ningún usuario')
  }

  return Response.json({ ok: true, alerts: alerts?.length || 0, newSent: totalNew })
}