import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = Deno.env.get('MAKE_WEBHOOK_SECRET')
  if (!supabaseUrl || !serviceKey || !webhookSecret) {
    return json({ error: 'Server configuration error' }, 500)
  }

  // Machine-to-machine auth: shared webhook secret (constant-time compare)
  const provided = (req.headers.get('x-webhook-secret') || '').trim()
  if (!provided || provided.length !== webhookSecret.length) {
    return json({ error: 'Unauthorized' }, 401)
  }
  let diff = 0
  for (let i = 0; i < webhookSecret.length; i++) {
    diff |= provided.charCodeAt(i) ^ webhookSecret.charCodeAt(i)
  }
  if (diff !== 0) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  let body: { id?: string; payment_confirmation_sent?: boolean }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const id = body?.id
  const flag = body?.payment_confirmation_sent
  if (!id || typeof id !== 'string') {
    return json({ error: 'Missing or invalid "id"' }, 400)
  }
  if (typeof flag !== 'boolean') {
    return json({ error: 'Missing or invalid "payment_confirmation_sent"' }, 400)
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(id)) {
    return json({ error: 'Invalid id format' }, 400)
  }

  const { data, error } = await supabase
    .from('submissions')
    .update({ payment_confirmation_sent: flag })
    .eq('id', id)
    .select('id, payment_confirmation_sent')
    .maybeSingle()

  if (error) {
    console.error('Update failed', { error, id })
    return json({ success: false, error: error.message }, 500)
  }

  if (!data) {
    return json({ success: false, error: 'Submission not found' }, 404)
  }

  console.log('payment_confirmation_sent updated', { id: data.id, value: data.payment_confirmation_sent, actor: 'webhook' })
  return json({ success: true, id: data.id, payment_confirmation_sent: data.payment_confirmation_sent })
})
