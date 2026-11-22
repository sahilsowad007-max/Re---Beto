// beto.sh home, private AI for your enterprise (docs/landing-plan.md v2): the
// stack explorer, the phone menu and bar, and the chat over the page.
// The 3D Beto stages live in js/beto-robot.js; scroll reveals in js/motion.js.
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const phone = matchMedia('(max-width: 620px)')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

// ---- nav, menu, the phone bar --------------------------------------------
const nav = $('#nav')
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40)
addEventListener('scroll', onScroll, { passive: true })
onScroll()

const seen = { ctas: true, plan: false }
const dock = () => $('#dockbar').classList.toggle('on', !seen.ctas && !seen.plan)
new IntersectionObserver(([e]) => { seen.ctas = e.isIntersecting; dock() }).observe($('.xhero .ctas'))
new IntersectionObserver(([e]) => { seen.plan = e.isIntersecting; dock() }).observe($('#plan'))

const menuBtn = $('#menuBtn')
const links = $('#links')
const menu = (open) => {
  links.classList.toggle('open', open)
  menuBtn.setAttribute('aria-expanded', String(open))
}
menuBtn.onclick = () => menu(!links.classList.contains('open'))
links.addEventListener('click', (e) => e.target.closest('a') && menu(false))

// ---- the stack explorer ------------------------------------------------------
const STACK = [
  { n: 'Infrastructure', k: '#22264F', line: 'Rent GPUs on QSor in Dhaka, or bring your own data centre.',
    you: ['Rent: dedicated GPUs on QSor, racked in Dhaka, single tenant', 'Or private endpoints inside your own cloud network', 'Or bring your own data centre and GPUs'],
    we: ['Sizing for your users and models', 'Install, monitoring and security operations', 'Moving you from rented to owned, when you are ready'] },
  { n: 'Models', k: '#2E336A', line: 'Open models you own, tuned on your data. One gateway for all.',
    you: ['Open models: Llama, Qwen, DeepSeek', 'Bangla speech, Bangla OCR and embeddings', 'Commercial models only through your gateway and policy'],
    we: ['Tuning on your documents and your tone', 'One gateway: keys, logs, cost and fallback in one place', 'Switching the model with a setting, not a rebuild'] },
  { n: 'Knowledge hub', k: '#2E7D6B', line: 'PDFs, intranet, website, drives, email. Answers with sources.',
    you: ['Which sources go in: PDFs, circulars, the intranet, drives, email, ERP records', 'What is public and what is staff only'],
    we: ['Collecting and indexing every source, and keeping it fresh', 'Answers that name their source. No source, no answer', 'A weekly list of what it could not answer, and the fix'] },
  { n: 'Agents and integration', k: '#D9A441', dk: true, line: 'Core banking, ERP, CRM, HR. Agents act, a person approves.',
    you: ['What it may do on its own', 'What needs a person to approve'],
    we: ['Connectors to core banking, ERP, CRM, HR and ticketing', 'Agents that draft, check and file, with an approval step', 'A record of every action'] },
  { n: 'Security and governance', k: '#C8553D', line: 'SSO, roles, audit trail, data-loss guard, Betopia SOC.',
    you: ['Who sees what, by role', 'Your retention and audit rules'],
    we: ['Single sign-on, roles and an audit trail', 'A guard that stops secrets and personal data going where they should not', 'An evaluation before every release, monitoring by Betopia\'s security team'] },
  { n: 'Apps', k: '#EF7F2C', dk: true, line: 'Web app, mobile app, voice, kiosk, API. Under your name.',
    you: ['Where people use it: web, iOS and Android, voice line, kiosk, API', 'Your name, logo and colours'],
    we: ['Your own ChatGPT for staff, on web and mobile', 'Customer assistants for your website, app and phone line', 'Releases, support and the app stores'] },
]
const layersEl = $('#layers')
const detail = $('#ldetail')
layersEl.setAttribute('aria-orientation', 'vertical')
// rows are listed top-down (layer 6 first), so rows[k] is STACK[STACK.length - 1 - k]
const rows = STACK.map((L, i) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'lrow'
  b.id = `ltab-${i}`
  b.setAttribute('role', 'tab')
  b.setAttribute('aria-controls', 'ldetail')
  b.style.setProperty('--k', L.k)
  b.innerHTML = `<span class="n${L.dk ? ' dk' : ''}">0${i + 1}</span><span><b>Layer ${i + 1} · ${L.n}</b><small>${L.line}</small></span>`
  b.onclick = () => pick(i, true)
  return b
}).reverse()
layersEl.replaceChildren(...rows)

function pick(i, user) {
  rows.forEach((row, k) => {
    const on = STACK.length - 1 - k === i
    row.setAttribute('aria-selected', String(on))
    row.tabIndex = on ? 0 : -1 // roving tabindex: one stop in the tab order
  })
  const L = STACK[i]
  detail.style.setProperty('--k', L.k)
  detail.setAttribute('aria-labelledby', `ltab-${i}`)
  detail.innerHTML = `<h3>Layer ${i + 1} · ${L.n}</h3>
    <p class="lk you">You choose</p><ul>${L.you.map((t) => `<li>${t}</li>`).join('')}</ul>
    <p class="lk we">Betopia builds and runs</p><ul>${L.we.map((t) => `<li>${t}</li>`).join('')}</ul>`
  if (user) {
    // the new content rises in from where the change happened (CSS: .ldetail.swap)
    detail.classList.remove('swap')
    void detail.offsetWidth
    detail.classList.add('swap')
    window.betoTrack?.('layer_view', { layer: L.n })
  }
}
// Arrow keys, Home and End move between layers, as in any tab list.
layersEl.addEventListener('keydown', (e) => {
  const at = rows.indexOf(document.activeElement)
  if (at < 0) return
  let to = at
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = (at + 1) % rows.length
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = (at - 1 + rows.length) % rows.length
  else if (e.key === 'Home') to = 0
  else if (e.key === 'End') to = rows.length - 1
  else return
  e.preventDefault()
  rows[to].focus()
  pick(STACK.length - 1 - to, true)
})
pick(1)
// Anything with data-layer opens the explorer at that layer.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-layer]')
  if (a) pick(Number(a.dataset.layer))
})

// The security brief button notes the request in the form.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-brief]')) return
  const msg = document.querySelector('#lead-form textarea[name="message"]')
  if (msg && !msg.value.trim()) msg.value = 'Please send the security brief. '
})

// ---- Ask Beto: the chat over the page ---------------------------------------
const box = $('#chatbox')
const boxIn = $('.chatbox-in', box)
const dummy = $('#chat-dummy')
const frame = $('#chatFrame')
let lastFocus = null

// Present / dismiss use CSS transitions on an .open class, not keyframes, so a
// panel can be grabbed mid-flight: closing while it opens (or reopening while it
// closes) continues from its current position instead of jumping.
const isOpen = (el) => !el.hidden && el.classList.contains('open')
function present(el, trigger, panel = el) {
  clearTimeout(el._t)
  el._cleanup?.() // drop any drag / spring state left by a swipe-dismiss
  const fresh = el.hidden
  el.hidden = false
  if (trigger && fresh) {
    // grow out of the control that was pressed, not out of the panel's centre
    const b = trigger.getBoundingClientRect()
    const r = panel.getBoundingClientRect()
    panel.style.transformOrigin = `${b.left + b.width / 2 - r.left}px ${b.top + b.height / 2 - r.top}px`
  }
  void el.offsetWidth // commit the closed state so the transition runs
  el.classList.add('open')
}
function dismiss(el) {
  el.classList.remove('open')
  clearTimeout(el._t)
  // leave along the path it arrived on, then take it out of the page
  el._t = setTimeout(() => { el.hidden = true; el._cleanup?.() }, reducedMotion.matches ? 0 : 320)
}

function openChat(intent, trigger) {
  const url = `/chat/${intent ? `?intent=${encodeURIComponent(intent)}` : ''}`
  $('#chatFull').href = url
  if (frame.dataset.url !== url) { frame.src = url; frame.dataset.url = url }
  if (!isOpen(box)) lastFocus = document.activeElement
  present(box, trigger, boxIn)
  document.body.style.overflow = 'hidden'
  setTimeout(() => $('#chatClose').focus(), 50)
}
function openDummy(btn) {
  if (!isOpen(dummy)) lastFocus = document.activeElement
  dummy.classList.remove('dummy-left', 'dummy-right')
  dummy.classList.add(btn && btn.getBoundingClientRect().right > innerWidth / 2 ? 'dummy-right' : 'dummy-left')
  present(dummy, btn)
  document.body.style.overflow = 'hidden'
  setTimeout(() => $('#dummyClose').focus(), 50)
}
function closeChat() {
  dismiss(box)
  document.body.style.overflow = ''
  lastFocus?.focus?.()
}
function closeDummy() {
  dismiss(dummy)
  document.body.style.overflow = ''
  lastFocus?.focus?.()
}

// Keep Tab inside whichever dialog is open.
function trapTab(e, dialog) {
  if (e.key !== 'Tab') return
  const f = [...dialog.querySelectorAll('button,[href],input,textarea,select,iframe,[tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null)
  if (!f.length) return
  const first = f[0], last = f[f.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

// ---- gestures: drag a chat sheet down to dismiss ------------------------------
// The sheet follows the finger 1:1 (keeping the offset from where it was grabbed),
// resists with rubber-banding if pulled up, and on release the release velocity
// is projected forward (like scroll deceleration) to decide open vs closed. A spring
// then carries it there starting at the finger's exact velocity, and can be grabbed
// again mid-flight.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const project = (v, rate = 0.998) => (v / 1000) * rate / (1 - rate) // v in px/s -> px travelled
const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

// Simulate a spring (Apple-style damping ratio + response) from `from` to `to` starting at v0 px/s.
// Returns one position per 1/60s, so it can be played as keyframes and still carry real velocity.
function springFrames(from, to, v0, { damping = 1, response = 0.3 } = {}) {
  const w = (2 * Math.PI) / response, k = w * w, c = 2 * damping * w
  const dt = 1 / 240
  let x = from, v = v0, t = 0
  const out = [x]
  while (t < 1.5) {
    for (let i = 0; i < 4; i++) { v += (-k * (x - to) - c * v) * dt; x += v * dt; t += dt }
    out.push(x)
    if (Math.abs(x - to) < 0.4 && Math.abs(v) < 8) break
  }
  out[out.length - 1] = to
  return out
}

function dragSheet({ root, panel, handle, scrim = false, onDismiss }) {
  const SCRIM = 0.28
  let anim = null, scrimAnim = null, dragging = false, grab = 0, hist = []
  const height = () => panel.getBoundingClientRect().height || 1
  // read the on-screen (presentation) translateY, never the logical target
  const currentY = () => new DOMMatrixReadOnly(getComputedStyle(panel).transform).m42
  const paintScrim = (a) => { if (scrim) root.style.background = `rgba(15,23,41,${a.toFixed(3)})` }
  const stop = () => { anim?.cancel(); scrimAnim?.cancel(); anim = scrimAnim = null }
  const reset = () => {
    stop()
    panel.style.transition = 'none'
    panel.style.transform = ''
    if (scrim) root.style.background = ''
    void panel.offsetWidth
    panel.style.transition = ''
  }
  root._cleanup = reset

  handle.addEventListener('pointerdown', (e) => {
    if (!phone.matches || e.button > 0 || e.target.closest('button,a,input,textarea,select')) return
    const y = currentY() // where the sheet is right now, even mid-flight
    stop()
    panel.style.transition = 'none'
    panel.style.transform = `translateY(${y}px)`
    handle.setPointerCapture(e.pointerId)
    dragging = true
    grab = e.clientY - y
    hist = [{ t: e.timeStamp, y: e.clientY }]
  })
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return
    let y = e.clientY - grab
    if (y < 0) y = -rubberband(-y, height()) // soft boundary above the resting position
    panel.style.transform = `translateY(${y}px)`
    paintScrim(SCRIM * (1 - clamp(y / height(), 0, 1)))
    hist.push({ t: e.timeStamp, y: e.clientY })
    while (hist.length > 2 && e.timeStamp - hist[0].t > 100) hist.shift()
  })
  const release = (e) => {
    if (!dragging) return
    dragging = false
    const y = currentY()
    const first = hist[0], last = hist[hist.length - 1]
    const dtMs = last.t - first.t
    const v = dtMs > 8 ? ((last.y - first.y) / dtMs) * 1000 : 0 // px/s, down is positive
    const h = height()
    const dismiss = y + project(v) > h * 0.4 // decide from where the gesture is heading
    if (reducedMotion.matches) {
      if (dismiss) onDismiss(); else reset()
      return
    }
    const target = dismiss ? h + 40 : 0
    const spring = dismiss ? { damping: 1, response: 0.28 } : { damping: Math.abs(v) > 300 ? 0.8 : 1, response: 0.35 }
    const frames = springFrames(y, target, v, spring)
    const duration = ((frames.length - 1) * 1000) / 60
    anim = panel.animate(frames.map((x) => ({ transform: `translateY(${x}px)` })), { duration, easing: 'linear', fill: 'forwards' })
    if (scrim) {
      scrimAnim = root.animate(frames.map((x) => ({ backgroundColor: `rgba(15,23,41,${(SCRIM * (1 - clamp(x / h, 0, 1))).toFixed(3)})` })), { duration, easing: 'linear', fill: 'forwards' })
    }
    anim.onfinish = () => { if (dismiss) onDismiss(); else reset() }
  }
  handle.addEventListener('pointerup', release)
  handle.addEventListener('pointercancel', release)
}
dragSheet({ root: box, panel: boxIn, handle: $('.chatbox-bar', box), scrim: true, onDismiss: () => closeChat() })
dragSheet({ root: dummy, panel: dummy, handle: $('.chat-dummy-bar', dummy), onDismiss: () => closeDummy() })

// The phone menu: tapping outside closes it, and so does a quick swipe up.
document.addEventListener('pointerdown', (e) => {
  if (links.classList.contains('open') && !e.target.closest('#links, #menuBtn')) menu(false)
})
let swipe = null
links.addEventListener('pointerdown', (e) => { swipe = { y: e.clientY, t: e.timeStamp } })
links.addEventListener('pointerup', (e) => {
  if (!swipe) return
  const dy = e.clientY - swipe.y, dt = Math.max(e.timeStamp - swipe.t, 1)
  swipe = null
  if (dy < -24 && dy + project((dy / dt) * 1000) < -80) menu(false)
})

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-chat]')
  if (!b) return
  e.preventDefault()
  menu(false)
  if (!b.dataset.chat) { openDummy(b); return }
  openChat(b.dataset.chat || '', b)
})
$('#chatClose').onclick = closeChat
$('#dummyClose').onclick = closeDummy
box.addEventListener('click', (e) => e.target === box && closeChat())
dummy.addEventListener('click', (e) => e.target === dummy && closeDummy())
addEventListener('keydown', (e) => {
  if (isOpen(dummy)) trapTab(e, dummy)
  else if (isOpen(box)) trapTab(e, boxIn)
  if (e.key !== 'Escape') return
  if (isOpen(box)) closeChat()
  else if (isOpen(dummy)) closeDummy()
  else menu(false)
})
phone.addEventListener('change', () => menu(false))
