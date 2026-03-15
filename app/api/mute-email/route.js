export const runtime = 'nodejs'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { email, action } = await request.json()
    if (!email || !action) return Response.json({ error: 'Faltan email o action' }, { status: 400 })

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (action === 'mute') {
      // insertar si no existe
      const { error } = await supabase
        .from('muted_emails')
        .upsert({ email }, { onConflict: 'email' })
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ ok: true, muted: true })
    }

    if (action === 'unmute') {
      const { error } = await supabase
        .from('muted_emails')
        .delete()
        .eq('email', email)
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ ok: true, muted: false })
    }

    return Response.json({ error: 'action debe ser "mute" o "unmute"' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}