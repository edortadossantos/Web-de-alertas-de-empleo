export const runtime = 'nodejs'

import { runScraper } from '../scraper/logic.js'

export async function GET(request) {
  // ── Autenticación obligatoria ─────────────────────────────────────────
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

  // ── Variables requeridas ──────────────────────────────────────────────
  const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','EMAIL','EMAIL_PASS','ADZUNA_APP_ID','ADZUNA_APP_KEY']
  const missing  = required.filter(k => !process.env[k])
  if (missing.length) return Response.json({ error: `Faltan variables: ${missing.join(', ')}` }, { status: 500 })

  // ── Filtro opcional por email ─────────────────────────────────────────
  const { searchParams } = new URL(request.url)
  const emailFilter = searchParams.get('email')?.toLowerCase().trim() || null

  try {
    const result = await runScraper(emailFilter)
    return Response.json({ ok: true, ...result })
  } catch (e) {
    console.error('[run-scraper] error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}