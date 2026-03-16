import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return Response.json({ error: 'Falta parámetro email' }, { status: 400 })

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Alertas del email
    const { data: items, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('email', email)
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Estado de mute
    const { data: mutedRow } = await supabase
      .from('muted_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    return Response.json({ items: items || [], muted: !!mutedRow })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
