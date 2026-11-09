// Contact form, shared by the Joya, Beto, Mando and Pia sites (the same file in
// each site's public/js; a test keeps them identical). It posts to the form's
// data-endpoint, where the Worker saves the request and passes it to Betopia's
// CRM (shared/leads.ts). The visitor never sees a failure: field problems show
// as gentle hints beside the field, and if the network or the server is down
// the request is kept on this device and sent when the page can reach us again
// (on reconnect or the next visit).
//
// Markup hooks: form#lead-form[data-endpoint][data-thanks] inside .lead-card,
// each field in a .f with a .hint, a .lead-send button, and a hidden
// .lead-done with [data-first] and [data-msg]. data-thanks may use {phone}.

const QUEUE = 'betopia-lead-queue'
const form = document.getElementById('lead-form')
const ENDPOINT = form?.dataset.endpoint || '/api/lead'
if (form) init(form)

function init(form) {
  const card = form.closest('.lead-card')
  const done = card.querySelector('.lead-done')
  const send = form.querySelector('.lead-send')
  const t0 = performance.now()

  // A link like /?interest=kiosk#contact (a QR code, a campaign) preselects the choice.
  const pre = new URLSearchParams(location.search).get('interest')
  const preset = pre && form.querySelector(`input[name="interest"][value="${CSS.escape(pre)}"]`)
  if (preset) preset.checked = true

  const field = (name) => form.elements.namedItem(name)
  function hint(name, text) {
    const input = field(name)
    const label = input.closest('.f')
    label.classList.toggle('ask', !!text)
    label.querySelector('.hint').textContent = text || ''
    input.setAttribute('aria-invalid', text ? 'true' : 'false')
  }
  function check() {
    const v = values()
    const asks = {}
    if (!/\p{L}/u.test(v.name)) asks.name = 'Please add your name.'
    if (!normPhone(v.phone)) asks.phone = 'Please check the number, for example 01712 345678.'
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(v.email)) asks.email = 'Please check the email address.'
    for (const k of ['name', 'phone', 'email']) hint(k, asks[k])
    return asks
  }
  function values() {
    const get = (k) => (field(k)?.value || '').trim()
    return {
      name: get('name'), company: get('company'), phone: get('phone'), email: get('email'), message: get('message'),
      interest: form.querySelector('input[name="interest"]:checked')?.value || 'unsure',
      website_url: get('website_url'),
      page: (location.origin + location.pathname + location.search).slice(0, 300),
    }
  }
  // Hints clear as soon as the visitor fixes the field.
  for (const k of ['name', 'phone', 'email']) {
    field(k).addEventListener('input', () => { if (field(k).closest('.f').classList.contains('ask')) check() })
  }

  function thank(v, queued) {
    const first = v.name.split(/\s+/)[0]
    done.querySelector('[data-first]').textContent = first ? `, ${first}` : ''
    done.querySelector('[data-msg]').textContent = queued
      ? 'Your request is saved on this device and will reach our team as soon as your connection is back.'
      : (form.dataset.thanks || 'Our team will call you on {phone}.').replace('{phone}', v.phone)
    form.hidden = true
    done.hidden = false
    done.focus({ preventScroll: true })
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (send.disabled) return
    const asks = check()
    const first = ['name', 'phone', 'email'].find((k) => asks[k])
    if (first) { field(first).focus(); return }
    const v = { ...values(), elapsed_ms: Math.round(performance.now() - t0) }
    send.disabled = true
    const label = send.firstChild.textContent
    send.firstChild.textContent = 'Sending '
    const r = await post(v)
    send.disabled = false
    send.firstChild.textContent = label
    if (r.fields) {
      for (const [k, text] of Object.entries(r.fields)) if (field(k)) hint(k, text)
      const k = Object.keys(r.fields).find((n) => field(n))
      if (k) { field(k).focus(); return }
    }
    if (!r.ok) enqueue(v)
    thank(v, !r.ok)
  })

  flush()
  addEventListener('online', flush)
}

// One request with two quiet retries. Returns {ok}, or {fields} for hints.
async function post(v, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) })
      const out = await res.json().catch(() => ({}))
      if (res.ok && out.ok) return { ok: true }
      if (res.status === 400 && out.fields) return { ok: false, fields: out.fields }
      if (res.status < 500 && res.status !== 429) return { ok: false }
    } catch {}
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 1200 * (i + 1)))
  }
  return { ok: false }
}

function readQueue() { try { return JSON.parse(localStorage.getItem(QUEUE) || '[]') } catch { return [] } }
function writeQueue(q) { try { q.length ? localStorage.setItem(QUEUE, JSON.stringify(q)) : localStorage.removeItem(QUEUE) } catch {} }
function enqueue(v) { const q = readQueue(); q.push({ ...v, elapsed_ms: 60000 }); writeQueue(q.slice(-5)) }

async function flush() {
  const q = readQueue()
  if (!q.length || !navigator.onLine) return
  const left = []
  for (const v of q) { const r = await post(v, 1); if (!r.ok && !r.fields) left.push(v) }
  writeQueue(left)
}

// Same rules as the server (shared/leads.ts normPhone).
function normPhone(raw) {
  let p = raw.replace(/[\s\-().]/g, '')
  if (p.startsWith('00')) p = '+' + p.slice(2)
  if (/^880\d{8,10}$/.test(p)) p = '+' + p
  if (/^0\d{8,10}$/.test(p)) p = '+88' + p
  if (/^\+880\d{8,10}$/.test(p)) return p
  if (/^\+[1-9]\d{7,14}$/.test(p) && !p.startsWith('+880')) return p
  return null
}
