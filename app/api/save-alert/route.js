import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()

    // Validación mínima de campos
    const required = ['email', 'job_title', 'country', 'city', 'mode']
    const missing = required.filter(k => !body[k] || String(body[k]).trim() === '')
    if (missing.length) {
      return Response.json(
        { error: `Faltan campos: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
      .from('alerts') // ← tu tabla ya en minúsculas
      .insert([{
        email: body.email,
        job_title: body.job_title,
        country: body.country,
        city: body.city,
        mode: body.mode
      }])

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}