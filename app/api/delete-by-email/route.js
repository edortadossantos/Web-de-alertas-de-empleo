export const runtime = 'nodejs'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { email, wipe_history } = await request.json()
    if (!email) return Response.json({ error: 'Falta email' }, { status: 400 })

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // borrar alertas del email
    const { error: delAlertsErr } = await supabase
      .from('alerts')
      .delete()
      .eq('email', email)
    if (delAlertsErr) return Response.json({ error: delAlertsErr.message }, { status: 400 })

    // opcional: borrar histórico de envíos (para “empezar de cero”)
    if (wipe_history) {
      const { error: delHistErr } = await supabase
        .from('jobs-sent') // o jobs_sent si lo renombraste
        .delete()
        .eq('sent_to', email)
      if (delHistErr) return Response.json({ error: delHistErr.message }, { status: 400 })
    }

    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
