export const runtime = 'nodejs'

import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  // Verificar contraseña admin
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return Response.json({ error: 'ADMIN_PASSWORD no configurada.' }, { status: 503 })
  }

  const pw = request.headers.get('x-admin-password')
  if (pw !== adminPassword) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Alertas
  const { data: alerts } = await supabase.from('alerts').select('*')
  // Emails muteados
  const { data: mutedRows } = await supabase.from('muted_emails').select('email')
  // Jobs enviados
  const { data: sent } = await supabase.from('jobs-sent').select('id', { count: 'exact', head: false })

  const mutedSet = new Set((mutedRows || []).map(r => String(r.email || '').toLowerCase()))

  // Usuarios únicos con sus datos
  const userMap = {}
  for (const alert of (alerts || [])) {
    const email = String(alert.email || '').toLowerCase()
    if (!userMap[email]) {
      userMap[email] = {
        email,
        job_title: alert.job_title,
        city: alert.city,
        mode: alert.mode,
        muted: mutedSet.has(email),
        alertCount: 0
      }
    }
    userMap[email].alertCount++
  }

  const users = Object.values(userMap)

  // Top puestos buscados
  const jobCount = {}
  for (const alert of (alerts || [])) {
    const t = (alert.job_title || '').trim().toLowerCase()
    if (t) jobCount[t] = (jobCount[t] || 0) + 1
  }
  const topJobs = Object.entries(jobCount)
    .map(([job_title, count]) => ({ job_title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Distribución de modalidades
  const modes = { onsite: 0, remote: 0, hybrid: 0 }
  for (const alert of (alerts || [])) {
    const m = alert.mode
    const arr = Array.isArray(m) ? m : [m]
    for (const mode of arr) {
      if (mode === 'onsite') modes.onsite++
      else if (mode === 'remote') modes.remote++
      else if (mode === 'hybrid') modes.hybrid++
    }
  }

  return Response.json({
    totalUsers:  users.length,
    totalAlerts: (alerts || []).length,
    totalSent:   (sent || []).length,
    totalMuted:  mutedSet.size,
    users,
    topJobs,
    modes
  })
}