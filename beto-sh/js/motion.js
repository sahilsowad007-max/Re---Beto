// beto.sh motion layer: scroll reveals, section progress, the interactive hero
// (pointer parallax, spotlight, magnetic actions, word-by-word headline, a live
// chat demo). Does nothing under prefers-reduced-motion; the page is complete
// without it.
(() => {
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const root = document.documentElement
  root.classList.add('mx')

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

  // Split text into word spans, keeping <br> and inline elements in place.
  function splitWords(el, cls = 'w') {
    let i = 0
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment()
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue
            if (/^\s+$/.test(part)) { frag.append(part); continue }
            const s = document.createElement('span')
            s.className = cls
            s.style.setProperty('--i', i++)
            s.textContent = part
            frag.append(s)
          }
          child.replaceWith(frag)
        } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child)
      }
    }
    walk(el)
    return i
  }

  // ---- scroll reveals ---------------------------------------------------------
  const sections = $$('main > section:not(#hero)')
  const targets = new Set()
  for (const sec of sections) {
    const wrap = $('.wrap', sec) || sec
    for (const child of [...wrap.children]) {
      if (child.classList.contains('head')) { targets.add(child); continue }
      const kids = [...child.children]
      if (kids.length >= 3 && !child.matches('form,details')) kids.forEach((k, n) => { k.style.setProperty('--d', `${Math.min(n, 6) * 80}ms`); targets.add(k) })
      else { child.style.setProperty('--d', '80ms'); targets.add(child) }
    }
  }
  // The footer's blocks rise in as the last sheet lands.
  const foot = $('.bfoot')
  if (foot) {
    const blocks = $$('.bfoot > *:not(script)').flatMap((b) => (b.children.length >= 3 ? [...b.children] : [b]))
    blocks.slice(0, 12).forEach((b, n) => { b.style.setProperty('--d', `${Math.min(n, 5) * 70}ms`); targets.add(b) })
  }
  // Items already tagged in the markup keep their sibling stagger.
  $$('.reveal').forEach((el) => {
    if (!el.style.getPropertyValue('--d')) {
      const n = [...el.parentElement.children].indexOf(el)
      el.style.setProperty('--d', `${Math.min(n, 6) * 80}ms`)
    }
    targets.add(el)
  })
  $$('.head h2').forEach((h) => splitWords(h))

  const io = new IntersectionObserver((list) => {
    for (const e of list) {
      e.target.classList.toggle('in', e.isIntersecting)
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 })
  targets.forEach((el) => { el.classList.add('reveal'); el.style.transitionDelay = ''; io.observe(el) })

  // modern reveal variants: scale / blur / slide / flip between sections
  const variants = ['reveal-scale','reveal-blur','reveal-slide-left','reveal-slide-right','reveal-flip']
  $$('.section').forEach((sec, si) => {
    $$('.reveal', sec).forEach((el, i) => {
      el.classList.add(variants[(si + i) % variants.length])
    })
  })

  // ---- progress bar and current section in the nav ---------------------------
  const bar = document.createElement('div')
  bar.className = 'mx-progress'
  bar.setAttribute('aria-hidden', 'true')
  document.body.append(bar)
  const navLinks = $$('#links a[href^="#"]')
  const spy = new IntersectionObserver((list) => {
    for (const e of list) {
      if (!e.isIntersecting) continue
      for (const a of navLinks) a.setAttribute('aria-current', String(a.getAttribute('href') === `#${e.target.id}`))
    }
  }, { rootMargin: '-45% 0px -50% 0px' })
  sections.forEach((s) => spy.observe(s))

  // ---- hero ----------------------------------------------------------------
  const hero = $('#hero')
  if (!hero) return
  const h1 = $('h1', hero)
  const stage = $('#st-hero')
  const demo = $('.hero-demo', hero)
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
  if (h1) splitWords(h1)
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('go')))

  // scroll: progress bar and the hero easing away into the next section
  let ticking = false
  const onScroll = () => {
    ticking = false
    const max = document.documentElement.scrollHeight - innerHeight
    bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`
    bar.classList.toggle('on', scrollY > 8)
    hero.style.setProperty('--hp', clamp(scrollY / (hero.offsetHeight * 0.75), 0, 1).toFixed(3))
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll) } }, { passive: true })
  onScroll()

  // pointer: parallax, spotlight and magnetic actions
  if (fine) {
    const magnets = $$('.xhero .btn.gold, .hero-aside > a', hero)
    magnets.forEach((m) => m.setAttribute('data-magnet', ''))
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0
    const loop = () => {
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08
      hero.style.setProperty('--px', cx.toFixed(3))
      hero.style.setProperty('--py', cy.toFixed(3))
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(loop) : 0
    }
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2
      hero.style.setProperty('--mx', `${e.clientX - r.left}px`)
      hero.style.setProperty('--my', `${e.clientY - r.top}px`)
      hero.classList.add('aim')
      if (!raf) raf = requestAnimationFrame(loop)
      for (const m of magnets) {
        const b = m.getBoundingClientRect()
        const dx = e.clientX - (b.left + b.width / 2)
        const dy = e.clientY - (b.top + b.height / 2)
        const near = Math.hypot(dx, dy) < Math.max(b.width, 120)
        m.style.setProperty('--tx', near ? `${(dx * 0.22).toFixed(1)}px` : '0px')
        m.style.setProperty('--ty', near ? `${(dy * 0.3).toFixed(1)}px` : '0px')
      }
    })
    hero.addEventListener('pointerleave', () => {
      tx = ty = 0
      hero.classList.remove('aim')
      if (!raf) raf = requestAnimationFrame(loop)
      for (const m of magnets) { m.style.setProperty('--tx', '0px'); m.style.setProperty('--ty', '0px') }
    })
  }

  // click Beto: a little hop
  if (stage) {
    stage.addEventListener('click', () => {
      stage.classList.remove('hop')
      void stage.offsetWidth
      stage.classList.add('hop')
    })
    stage.addEventListener('animationend', () => stage.classList.remove('hop'))
  }

  // the live private-AI conversation: greets, then cycles through industries
  if (demo) {
    const INDUSTRIES = [
      {
        name: 'Banking & MFS',
        color: '#C8553D',
        question: 'What can you do for banks and financial services?',
        answer: 'I help with KYC document checks, credit memo drafts, policy answers for branch staff, and customer help in Bangla. Every answer is logged.',
        source: 'KYC policy, section 2'
      },
      {
        name: 'Telecom',
        color: '#2E7D6B',
        question: 'What are our current prepaid data packages?',
        answer: 'We offer daily, weekly and monthly bundles with varying data volumes and validity. I can detail any specific package.',
        source: 'Tariff catalog, 2026'
      },
      {
        name: 'Government',
        color: '#2E336A',
        question: 'Summarise the latest service rules for officers.',
        answer: 'The circular outlines leave entitlement, travel allowance, and conduct guidelines for all officers in your ministry.',
        source: 'Service rules circular'
      },
      {
        name: 'Healthcare',
        color: '#A8432E',
        question: 'What is the cardiology roster for next week?',
        answer: 'Dr. Rahman and Dr. Ali are on duty Monday to Friday, with emergency coverage on weekends.',
        source: 'Hospital roster'
      },
      {
        name: 'Manufacturing & RMG',
        color: '#8a6114',
        question: 'Check buyer compliance requirements for our next shipment.',
        answer: 'The buyer requires OEKO-TEX certification, wage records, and safety audit reports before shipment release.',
        source: 'Compliance manual'
      },
      {
        name: 'Conglomerates',
        color: '#6B5B95',
        question: 'Show me the finance dashboard for our textile subsidiary.',
        answer: 'Here are the textile subsidiary figures: revenue, cost of goods, and inventory levels for Q3.',
        source: 'Group ERP'
      },
    ]

    let industryIndex = 0
    let active = false
    const bar2 = $('.hero-demo-bar', demo)
    const industryLabel = $('.hero-demo-bar p', demo)
    const replay = document.createElement('button')
    replay.type = 'button'
    replay.className = 'hero-replay'
    replay.textContent = 'Replay'
    replay.setAttribute('aria-label', 'Replay the example conversation')
    bar2?.append(replay)

    let timers = []
    const later = (fn, ms) => timers.push(setTimeout(fn, ms))

    const GREETING = "Hello! I'm Beto, your private AI assistant. I work inside your organisation's walls, in Bangla and English."

    function clearMessages() {
      $$('.hero-message', demo).forEach((m) => m.remove())
    }

    function buildMessages(ind) {
      const frag = document.createDocumentFragment()

      // 1 · Beto's greeting (left side)
      const greet = document.createElement('div')
      greet.className = 'hero-message ours'
      greet.textContent = GREETING
      frag.append(greet)

      // 2 · User's question (right side)
      const q = document.createElement('div')
      q.className = 'hero-message theirs'
      q.textContent = ind.question
      frag.append(q)

      // 3 · Beto's answer (left side)
      const a = document.createElement('div')
      a.className = 'hero-message ours'
      a.innerHTML = ind.answer + (ind.source ? `<small>Source: ${ind.source}</small>` : '')
      frag.append(a)

      const bar = $('.hero-demo-bar', demo)
      demo.insertBefore(frag, bar?.nextSibling || demo.firstChild)
      return $$('.hero-message', demo)
    }

    function split(msgEl) {
      for (const n of [...msgEl.childNodes]) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue
        const holder = document.createElement('span')
        holder.textContent = n.textContent
        n.replaceWith(holder)
        splitWords(holder, 'dw')
      }
    }

    function play() {
      if (!active) return
      timers.forEach(clearTimeout)
      timers = []
      demo.classList.remove('done')
      clearMessages()

      const ind = INDUSTRIES[industryIndex]
      industryIndex = (industryIndex + 1) % INDUSTRIES.length
      if (industryLabel) industryLabel.innerHTML = `<span style="color:${ind.color};font-weight:700">${ind.name}</span> · <span style="color:${ind.color};font-weight:700">beto.your-organisation.ai</span>`
      demo.style.setProperty('--hero-theme', ind.color)

      const msgs = buildMessages(ind)
      msgs.forEach(split)
      msgs.forEach((m) => m.classList.remove('on', 'pending'))

      let t = 450
      msgs.forEach((m) => {
        const ours = m.classList.contains('ours')
        later(() => { m.classList.add('on'); if (ours) m.classList.add('pending') }, t)
        if (ours) { t += 1100; later(() => m.classList.remove('pending'), t) }
        t += 1300
      })

      const nextDelay = t + 2200
      later(() => {
        demo.classList.add('done')
        setTimeout(play, 700)
      }, nextDelay)
    }

    replay.addEventListener('click', () => {
      industryIndex = 0
      active = true
      play()
    })

    let started = false
    new IntersectionObserver(([e], obs) => {
      if (e.isIntersecting && !started) {
        started = true
        active = true
        later(play, 900)
        obs.disconnect()
      }
    }, { threshold: 0.3 }).observe(demo)

    addEventListener('visibilitychange', () => {
      active = document.visibilityState === 'visible'
      if (active) play()
    })
  }
})()

// ---- splash overlay: platform redesign reveal ----
(function(){
  const splash = document.getElementById('splash-overlay')
  const splashEnter = document.getElementById('splash-enter')
  const mainEl = document.querySelector('main')
  const body = document.body

  function closeSplash(){
    if(!splash) return
    splash.classList.add('exiting')
    setTimeout(()=>{
      splash.remove?.()
      body.classList.remove('splash-open')
      if(mainEl) mainEl.classList.remove('splash-hidden')
      document.documentElement.classList.remove('splash-lock')
    },700)
  }

  if(splash){
    body.classList.add('splash-open')
    document.documentElement.classList.add('splash-lock')
    splashEnter?.addEventListener('pointerdown', closeSplash)
    splashEnter?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') closeSplash() })
    // auto-close after 4.5s
    setTimeout(closeSplash, 4500)
  }
})()
