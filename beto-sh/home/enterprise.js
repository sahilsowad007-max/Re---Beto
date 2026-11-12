// beto.sh home, private AI for your enterprise (docs/landing-plan.md v2): the
// immersive hero (the real Beto on the private AI stack, a language-model
// cortex behind him, js/cortex.js), the stack explorer, reveals, the phone
// menu and bar, and the chat over the page.
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const phone = matchMedia('(max-width: 620px)')
const small = matchMedia('(max-width: 940px)').matches || (navigator.hardwareConcurrency || 8) <= 4

let cortex = null
const stageRuntime = Promise.all([
  import('/js/stage.js'),
  import('/js/cortex.js'),
]).then(([stage, cortexModule]) => ({
  Stage: stage.Stage,
  preload: stage.preload,
  buildCortex: cortexModule.buildCortex,
})).catch((error) => {
  document.documentElement.classList.add('no-webgl')
  console.warn('Beto’s 3D stage is unavailable; showing the static mascot assets.', error)
  return null
})

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

// Scroll reveals live in js/motion.js. A second observer here fought it over
// the same elements (adding `in` while motion.js removed it), which flickered.

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
const rows = STACK.map((L, i) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'lrow'
  b.setAttribute('role', 'tab')
  b.style.setProperty('--k', L.k)
  b.innerHTML = `<span class="n${L.dk ? ' dk' : ''}">0${i + 1}</span><span><b>Layer ${i + 1} · ${L.n}</b><small>${L.line}</small></span>`
  b.onclick = () => pick(i, true)
  return b
}).reverse()
layersEl.replaceChildren(...rows)
function pick(i, user) {
  STACK.forEach((_, j) => rows[STACK.length - 1 - j].setAttribute('aria-selected', String(j === i)))
  const L = STACK[i]
  detail.style.setProperty('--k', L.k)
  detail.innerHTML = `<h3>Layer ${i + 1} · ${L.n}</h3>
    <p class="lk you">You choose</p><ul>${L.you.map((t) => `<li>${t}</li>`).join('')}</ul>
    <p class="lk we">Betopia builds and runs</p><ul>${L.we.map((t) => `<li>${t}</li>`).join('')}</ul>`
  if (user) { cortex?.pulse(i); window.betoTrack?.('layer_view', { layer: L.n }) }
}
pick(1)
// The hero legend opens the explorer at that layer.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-layer]')
  if (a) pick(Number(a.dataset.layer))
})

// ---- the hero and supporting Beto stages ----------------------------------
stageRuntime.then((runtime) => {
  if (!runtime) return

  const { Stage, preload, buildCortex } = runtime
  preload()
  const heroEl = $('#st-hero')
  const hero = new Stage(heroEl, {
    mood: 'wave',
    view: small ? { y: 1.5, dist: 11, fov: 30, lookY: 1.05 } : { y: 1.7, dist: 11.2, fov: 30, lookY: 1.15 },
    follow: 0.7, yaw: small ? 0 : -0.12, shadow: false,
    onReady: (s) => setTimeout(() => s.mood === 'wave' && s.set('stand'), 2400),
    tick: (s, dt, t) => {
      const w = heroEl.clientWidth, h = heroEl.clientHeight
      if (!small && w > 0) s.camera.setViewOffset(w, h, -w * 0.25, 0, w, h)
      else if (s.camera.view) s.camera.clearViewOffset()
      cortex?.update(dt, t)
    },
  })
  if (hero.scene) {
    heroEl.classList.add('rendered')
    cortex = buildCortex(hero, { small, reduce })
    const items = $$('#legend li')
    cortex.onLayer((i) => {
      for (const li of items) li.classList.toggle('on', Number(li.dataset.l) === i)
      if (i === 5 && hero.beto && !reduce) {
        let k = 0
        const id = setInterval(() => { hero.beto.face.level = k++ % 2 ? 0.2 : 0.8; if (k > 6) { clearInterval(id); hero.beto.face.level = 0 } }, 90)
      }
    })
    $$('#legend a').forEach((a) => a.addEventListener('pointerenter', () => cortex.pulse(Number(a.dataset.layer))))
  } else {
    heroEl.classList.add('fallback')
    document.documentElement.classList.add('no-webgl')
  }
  heroEl.addEventListener('click', () => { hero.hop(0.8); if (hero.beto) { hero.set('happy'); setTimeout(() => hero.mood === 'happy' && hero.set('stand'), 1400) } })

  const FULL = { y: 1.15, dist: 7.6, fov: 26, lookY: 1.05 }
  function lazy(id, opts, onSeen) {
    const el = document.getElementById(id)
    if (!el) return
    let s = null
    const near = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      near.disconnect()
      s = new Stage(el, opts)
      if (s.scene) el.classList.add('rendered')
      else el.classList.add('fallback')
      el.addEventListener('click', () => s.hop(1))
    }, { rootMargin: '600px 0px' })
    near.observe(el)
    new IntersectionObserver(([e]) => { if (e.isIntersecting && s) onSeen?.(s) }, { threshold: 0.5 }).observe(el)
  }
  lazy('st-proof', { mood: 'stand', view: FULL, follow: 0.8, yaw: 0.3 }, (s) => { s.set('wave'); setTimeout(() => s.mood === 'wave' && s.set('stand'), 2000) })
  lazy('st-cta', { mood: 'stand', view: { ...FULL, dist: 6.8 }, follow: 0.8 }, (s) => {
    s.set('wave')
    setTimeout(() => { s.set('happy'); setTimeout(() => s.set('stand'), 1600) }, 1800)
  })
}).catch((error) => {
  document.documentElement.classList.add('no-webgl')
  console.error('Beto’s 3D stage could not be initialized; showing the static mascot assets.', error)
})

// The security brief button notes the request in the form.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-brief]')) return
  const msg = document.querySelector('#lead-form textarea[name="message"]')
  if (msg && !msg.value.trim()) msg.value = 'Please send the security brief. '
})

// ---- Ask Beto: the chat over the page ---------------------------------------
const box = $('#chatbox')
const dummy = $('#chat-dummy')
const frame = $('#chatFrame')
let lastFocus = null
function openChat(intent) {
  const url = `/chat/${intent ? `?intent=${encodeURIComponent(intent)}` : ''}`
  $('#chatFull').href = url
  if (frame.dataset.url !== url) { frame.src = url; frame.dataset.url = url }
  lastFocus = document.activeElement
  box.hidden = false
  document.body.style.overflow = 'hidden'
  setTimeout(() => $('#chatClose').focus(), 50)
}
function openDummy(btn) {
  lastFocus = document.activeElement
  dummy.classList.remove('dummy-left', 'dummy-right')
  if (btn) {
    const r = btn.getBoundingClientRect()
    dummy.classList.add(r.right > innerWidth / 2 ? 'dummy-right' : 'dummy-left')
  } else {
    dummy.classList.add('dummy-left')
  }
  dummy.hidden = false
  document.body.style.overflow = 'hidden'
  setTimeout(() => $('#dummyClose').focus(), 50)
}

function closeChat() {
  box.hidden = true
  document.body.style.overflow = ''
  lastFocus?.focus?.()
}
function closeDummy() {
  dummy.hidden = true
  document.body.style.overflow = ''
  lastFocus?.focus?.()
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-chat]')
  if (!b) return
  e.preventDefault()
  menu(false)
  if (!b.dataset.chat) { openDummy(b); return }
  openChat(b.dataset.chat || '')
})
$('#chatClose').onclick = closeChat
$('#dummyClose').onclick = closeDummy
box.addEventListener('click', (e) => e.target === box && closeChat())
dummy.addEventListener('click', (e) => e.target === dummy && closeDummy())
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!box.hidden) closeChat()
  else if (!dummy.hidden) closeDummy()
  else menu(false)
})
phone.addEventListener('change', () => menu(false))
