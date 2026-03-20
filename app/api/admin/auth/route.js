export async function POST(request) {
  try {
    const { password } = await request.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return Response.json({ error: 'ADMIN_PASSWORD no configurada.' }, { status: 503 })
    }

    if (password !== adminPassword) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return Response.json({ ok: true }, { status: 200 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}