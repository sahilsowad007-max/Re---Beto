// beto.sh motion layer: scroll reveals, section progress, the interactive hero
// (pointer parallax, spotlight, magnetic actions, word-by-word headline, a live
// chat demo). Does nothing under prefers-reduced-motion; the page is complete
// without it.
(() => {
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const rm = matchMedia('(prefers-reduced-motion: reduce)')
  if (rm.matches) return
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
      if (kids.length >= 3 && !child.matches('form,details')) kids.forEach((k, n) => { k.style.setProperty('--d', `${Math.min(n, 5) * 50}ms`); targets.add(k) })
      else { child.style.setProperty('--d', '50ms'); targets.add(child) }
    }
  }
  // The footer's blocks rise in as the last sheet lands.
  const foot = $('.bfoot')
  if (foot) {
    const blocks = $$('.bfoot > *:not(script)').flatMap((b) => (b.children.length >= 3 ? [...b.children] : [b]))
    blocks.slice(0, 12).forEach((b, n) => { b.style.setProperty('--d', `${Math.min(n, 5) * 50}ms`); targets.add(b) })
  }
  // Items already tagged in the markup keep their sibling stagger.
  $$('.reveal').forEach((el) => {
    if (!el.style.getPropertyValue('--d')) {
      const n = [...el.parentElement.children].indexOf(el)
      el.style.setProperty('--d', `${Math.min(n, 5) * 50}ms`)
    }
    targets.add(el)
  })
  $$('.head h2').forEach((h) => splitWords(h))

  // Reveal once and stay revealed, with one consistent motion (a short rise):
  // re-hiding on exit made every section fade out and back in whenever the
  // reader scrolled up and down. After the entrance plays, the element is
  // handed back to its own hover/press transitions (.done).
  const io = new IntersectionObserver((list) => {
    for (const e of list) {
      if (!e.isIntersecting) continue
      const el = e.target
      el.classList.add('in')
      io.unobserve(el)
      setTimeout(() => el.classList.add('done'), 1400)
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 })
  targets.forEach((el) => { el.classList.add('reveal'); el.style.transitionDelay = ''; io.observe(el) })

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
  // Layout reads are cached and refreshed on resize/load, not on every frame.
  let ticking = false
  let maxScroll = 0
  let heroSpan = 1
  const measure = () => {
    maxScroll = document.documentElement.scrollHeight - innerHeight
    heroSpan = Math.max(1, hero.offsetHeight * 0.75)
  }
  // Where the browser supports scroll timelines, motion.css drives the progress bar and the
  // hero fade on the compositor (no JS per frame, never janks with a busy main thread).
  // Everywhere else this handler does it, as before.
  const scrollLinkedInCSS = CSS.supports('animation-timeline', 'scroll()')
  const onScroll = () => {
    ticking = false
    bar.classList.toggle('on', scrollY > 8)
    if (scrollLinkedInCSS) return
    bar.style.transform = `scaleX(${maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0})`
    hero.style.setProperty('--hp', clamp(scrollY / heroSpan, 0, 1).toFixed(3))
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll) } }, { passive: true })
  addEventListener('resize', () => { measure(); onScroll() })
  addEventListener('load', () => { measure(); onScroll() })
  measure()
  onScroll()

  // ---- anchor links glide on a spring ----------------------------------------
  // Native smooth scroll has a fixed duration and no momentum, so an 8,000px jump
  // crawls. This uses a critically damped spring that starts from rest, speeds up
  // for longer trips, and gives up the instant the reader touches the page (wheel,
  // touch, key, pointer), leaving native scrolling in charge. Ordinary wheel and
  // touch scrolling is never intercepted.
  let glideRaf = 0
  const stopGlide = () => { if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = 0 } }
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) addEventListener(type, stopGlide, { passive: true })
  function glide(target) {
    stopGlide()
    target = clamp(target, 0, document.documentElement.scrollHeight - innerHeight)
    const from = scrollY
    if (rm.matches) { scrollTo({ top: target, behavior: 'instant' }); return }
    if (Math.abs(target - from) < 2) return
    const response = clamp(0.32 + Math.abs(target - from) / 12000, 0.32, 0.6)
    const w = (2 * Math.PI) / response
    let x = from, v = 0, last = performance.now()
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n
      for (let i = 0; i < n; i++) { v += (-(w * w) * (x - target) - 2 * w * v) * h; x += v * h }
      if (Math.abs(x - target) < 0.5 && Math.abs(v) < 8) { scrollTo({ top: target, behavior: 'instant' }); glideRaf = 0; return }
      scrollTo({ top: x, behavior: 'instant' })
      glideRaf = requestAnimationFrame(step)
    }
    glideRaf = requestAnimationFrame(step)
  }
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    const id = decodeURIComponent(a.getAttribute('href').slice(1))
    const el = id ? document.getElementById(id) : null
    if (id && !el) return
    e.preventDefault()
    const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
    glide(el ? el.getBoundingClientRect().top + scrollY - pad : 0)
    if (el) {
      history.pushState(null, '', `#${id}`)
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
      el.focus({ preventScroll: true })
    }
  })

  // pointer: parallax, spotlight and magnetic actions
  if (fine) {
    const magnets = $$('.xhero .btn.gold, .hero-aside > a', hero)
    magnets.forEach((m) => m.setAttribute('data-magnet', ''))
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, last = 0
    // frame-rate independent smoothing: same feel at 60 and 120 Hz
    const loop = (now) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
      last = now
      const k = 1 - Math.exp(-dt * 5)
      cx += (tx - cx) * k
      cy += (ty - cy) * k
      hero.style.setProperty('--px', cx.toFixed(3))
      hero.style.setProperty('--py', cy.toFixed(3))
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(loop)
      else { raf = 0; last = 0 }
    }
    hero.addEventListener('pointermove', (e) => {
      if (rm.matches) return
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
    // Pause / resume: the conversation loops, so people need a way to stop it (WCAG 2.2.2).
    const pauseBtn = document.createElement('button')
    pauseBtn.type = 'button'
    pauseBtn.className = 'hero-replay hero-pause'
    pauseBtn.textContent = 'Pause'
    pauseBtn.setAttribute('aria-label', 'Pause the example conversation')
    pauseBtn.setAttribute('aria-pressed', 'false')
    bar2?.append(pauseBtn)
    let paused = false

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

    function setPaused(on) {
      paused = on
      pauseBtn.textContent = on ? 'Resume' : 'Pause'
      pauseBtn.setAttribute('aria-pressed', String(on))
      pauseBtn.setAttribute('aria-label', on ? 'Resume the example conversation' : 'Pause the example conversation')
      if (on) {
        // stop the loop and show the whole conversation, fully readable
        timers.forEach(clearTimeout)
        timers = []
        $$('.hero-message', demo).forEach((m) => m.classList.remove('pending'))
        $$('.hero-message', demo).forEach((m) => m.classList.add('on'))
      } else {
        play()
      }
    }

    function play() {
      if (!active || paused) return
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
        later(play, 700) // tracked, so Replay / Pause can cancel it
      }, nextDelay)
    }

    replay.addEventListener('click', () => {
      industryIndex = 0
      active = true
      paused = false
      pauseBtn.textContent = 'Pause'
      pauseBtn.setAttribute('aria-pressed', 'false')
      pauseBtn.setAttribute('aria-label', 'Pause the example conversation')
      play()
    })
    pauseBtn.addEventListener('click', () => setPaused(!paused))
    // turning "reduce motion" on mid-session stops the loop and shows the full conversation
    rm.addEventListener('change', (e) => { if (e.matches && !paused) setPaused(true) })

    let started = false
    new IntersectionObserver(([e], obs) => {
      if (e.isIntersecting && !started) {
        started = true
        active = true
        later(play, 900)
        obs.disconnect()
      }
    }, { threshold: 0.3 }).observe(demo)

    // Pause the loop when the tab is hidden or the demo is off-screen.
    let onScreen = true
    new IntersectionObserver(([e]) => {
      const was = active
      onScreen = e.isIntersecting
      active = onScreen && document.visibilityState === 'visible'
      if (!started) return
      if (active && !was) play()
      else if (!active) { timers.forEach(clearTimeout); timers = [] }
    }).observe(demo)
    addEventListener('visibilitychange', () => {
      const was = active
      active = onScreen && document.visibilityState === 'visible'
      if (!started) return
      if (active && !was) play() // play() itself does nothing while paused
      else if (!active) { timers.forEach(clearTimeout); timers = [] }
    })
  }
})()

