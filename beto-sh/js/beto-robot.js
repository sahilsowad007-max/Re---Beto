// Beto robot: a procedural 3D mascot drawn into the hero stage (#st-hero) and the
// "We run Betopia on it first" stage (#st-proof).
// Uses the "three" import map in index.html. If WebGL or the import fails, the
// static image in the stage stays visible (the .rendered class is added only on success).
import * as THREE from 'three'

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

// fill: share of the stage height the robot covers. lift: gap under its feet, as a share of the height.
// waveOn: 'reveal' waves once the splash closes; 'view' waves the first time the stage scrolls into view.
const MOUNTS = [
  ['st-hero', { fill: 0.68, lift: 0.2, smallFill: 0.92, smallLift: 0, waveOn: 'reveal' }],
  ['st-proof', { fill: 0.9, lift: 0.03, smallFill: 0.9, smallLift: 0.03, waveOn: 'view' }],
  // charge: the "charging up with knowledge" loop (glow, inward sparks, power-up pose)
  ['st-hub', { fill: 0.94, lift: 0.02, smallFill: 0.94, smallLift: 0.02, waveOn: 'none', charge: true }],
]
for (const [id, cfg] of MOUNTS) {
  const el = document.getElementById(id)
  if (!el) continue
  try { mount(el, cfg) } catch (err) { console.warn('Beto robot unavailable; showing the static mascot.', err) }
}

function mount(stage, cfg) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch (e) {
    return
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block'
  canvas.setAttribute('aria-hidden', 'true')

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a90a8, 2.2))
  const key = new THREE.DirectionalLight(0xffffff, 2.6)
  key.position.set(5, 10, 7)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xffd9a8, 1.6)
  rim.position.set(-6, 4, -6)
  scene.add(rim)

  const slate = new THREE.MeshPhysicalMaterial({ color: 0x4a4d63, roughness: 0.38, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.35 })
  const slateDark = new THREE.MeshStandardMaterial({ color: 0x25273a, roughness: 0.4 })
  const orange = new THREE.MeshStandardMaterial({ color: 0xffa12b, roughness: 0.3, emissive: 0xff8a00, emissiveIntensity: 0.12 })
  const cream = new THREE.MeshStandardMaterial({ color: 0xfaf7ee, roughness: 0.35 })
  const gold = new THREE.MeshStandardMaterial({ color: 0xf2d867, roughness: 0.25, emissive: 0xffc933, emissiveIntensity: 0 })
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffa530, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08,
    emissive: 0xff8c14, emissiveIntensity: 0.28,
  })

  // Rounded box: push a subdivided box's vertices out from an inner box by radius r.
  function rbox(w, h, d, r, seg = 12) {
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg)
    const p = g.attributes.position, n = g.attributes.normal
    const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r
    const v = new THREE.Vector3(), c = new THREE.Vector3(), dir = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      c.set(Math.max(-ix, Math.min(ix, v.x)), Math.max(-iy, Math.min(iy, v.y)), Math.max(-iz, Math.min(iz, v.z)))
      dir.subVectors(v, c)
      if (dir.lengthSq() > 1e-8) {
        dir.normalize()
        v.copy(c).addScaledVector(dir, r)
        n.setXYZ(i, dir.x, dir.y, dir.z)
      }
      p.setXYZ(i, v.x, v.y, v.z)
    }
    return g
  }
  function add(parent, geo, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }
  const ring = (parent, r, y, mat, x = 0) => add(parent, new THREE.CylinderGeometry(r + 0.025, r + 0.025, 0.11, 40), mat, x, y, 0)

  const robot = new THREE.Group()
  scene.add(robot)

  // Feet, legs, pelvis
  for (const s of [-1, 1]) {
    const x = s * 0.52
    add(robot, new THREE.SphereGeometry(1, 32, 20), slate, x, 0.3, 0.12).scale.set(0.52, 0.32, 0.72)
    add(robot, new THREE.CylinderGeometry(0.2, 0.2, 0.75, 32), slate, x, 0.98, 0)
    ring(robot, 0.2, 1.1, orange, x)
    ring(robot, 0.2, 0.97, cream, x)
    ring(robot, 0.2, 0.84, orange, x)
    ring(robot, 0.21, 0.76, orange, x)
    ring(robot, 0.23, 0.66, cream, x)
    ring(robot, 0.2, 1.3, cream, x)
  }
  add(robot, rbox(1.3, 0.5, 0.85, 0.22), slate, 0, 1.5, 0)
  add(robot, rbox(1.34, 0.1, 0.89, 0.05, 6), cream, 0, 1.5, 0)

  // Torso
  const torso = new THREE.Group()
  robot.add(torso)
  add(torso, rbox(1.85, 1.4, 1.1, 0.42), slate, 0, 2.38, 0)

  // Arms (each pivots about its shoulder; see setArm)
  const arms = []
  for (const s of [-1, 1]) {
    const arm = new THREE.Group()
    arm.position.set(s * 1.28, 0, 0)
    arm.rotation.z = s * 0.04
    arms.push({ arm, s })
    torso.add(arm)
    add(torso, new THREE.SphereGeometry(0.4, 32, 24), slate, s * 1.12, 2.75, 0)
    add(arm, new THREE.CylinderGeometry(0.27, 0.27, 1.2, 32), slate, 0, 2.05, 0)
    ring(arm, 0.27, 2.52, orange)
    ring(arm, 0.27, 2.39, cream)
    ring(arm, 0.27, 2.26, orange)
    ring(arm, 0.27, 1.8, orange)
    ring(arm, 0.27, 1.67, cream)
    ring(arm, 0.27, 1.54, orange)
    add(arm, rbox(0.3, 0.55, 0.32, 0.12, 8), slate, 0, 1.2, 0).rotation.z = -s * 0.08
  }

  // Neck
  add(torso, new THREE.CylinderGeometry(0.26, 0.26, 0.2, 32), slateDark, 0, 3.15, 0)
  ring(torso, 0.28, 3.1, orange)
  ring(torso, 0.28, 3.2, cream)

  // Head
  const head = new THREE.Group()
  head.position.set(0, 4.18, 0)
  torso.add(head)
  add(head, rbox(2.7, 1.9, 2.0, 0.55), slate)
  add(head, rbox(2.06, 1.32, 0.3, 0.3), slateDark, 0, 0.02, 0.92)
  add(head, rbox(1.84, 1.1, 0.3, 0.26), visorMat, 0, 0.02, 0.99)
  const eye = add(head, rbox(0.62, 0.11, 0.1, 0.05, 8), cream, 0, 0.02, 1.17)
  add(head, new THREE.CylinderGeometry(0.045, 0.045, 0.65, 16), slateDark, 0, 1.2, 0)
  add(head, new THREE.SphereGeometry(0.13, 24, 16), gold, 0, 1.55, 0)

  // "Charging up with knowledge" (cfg.charge only): a glow behind the robot and sparks
  // that spiral in from the edges toward its chest.
  let glow, sparks, sparkAttr
  const SPARKS = 40, sparkSeed = []
  if (cfg.charge) {
    const dotCanvas = document.createElement('canvas')
    dotCanvas.width = dotCanvas.height = 64
    const g2 = dotCanvas.getContext('2d')
    const grad = g2.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,190,90,0.85)')
    grad.addColorStop(1, 'rgba(255,150,40,0)')
    g2.fillStyle = grad
    g2.fillRect(0, 0, 64, 64)
    const dotTex = new THREE.CanvasTexture(dotCanvas)
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xff9a2e, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
    glow.position.set(0, 2.9, -1.6)
    scene.add(glow)
    for (let i = 0; i < SPARKS; i++) sparkSeed.push({ a: Math.random() * Math.PI * 2, y: 0.6 + Math.random() * 4.6, ph: i / SPARKS, sp: 0.8 + Math.random() * 0.5 })
    sparkAttr = new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3)
    const sparkGeo = new THREE.BufferGeometry()
    sparkGeo.setAttribute('position', sparkAttr)
    sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
    sparks.frustumCulled = false
    scene.add(sparks)
  }

  stage.appendChild(canvas)
  stage.classList.add('rendered') // hides the static .still image

  // Framing: the robot (about 5.9 tall) fills `fill` of the stage height, with its feet `lift` above the bottom edge.
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const small = innerWidth <= 720
    const fill = small ? cfg.smallFill : cfg.fill
    const lift = small ? cfg.smallLift : cfg.lift
    const visibleH = 5.9 / fill
    const dist = visibleH / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const lookY = visibleH * (0.5 - lift)
    camera.position.set(0, lookY + 0.3, dist)
    camera.lookAt(0, lookY, 0)
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(stage)
  addEventListener('resize', resize)
  resize()

  // Head follows the pointer
  const look = { x: 0, y: 0, tx: 0, ty: 0 }
  if (!reduce) {
    addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.4
      look.tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth * 0.5)))
      look.ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (innerHeight * 0.5)))
    }, { passive: true })
    document.addEventListener('pointerleave', () => { look.tx = 0; look.ty = 0 })
  }

  // Only draw while the hero is on screen
  let onScreen = true
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting }).observe(stage)

  // Rotate an arm about its shoulder by `a` radians (a > 0 swings it outward and up).
  const PIVOT_Y = 2.7
  function setArm({ arm, s }, a) {
    const ox = s * 0.08, oy = -PIVOT_Y // arm origin relative to the shoulder
    const c = Math.cos(a), n = Math.sin(a)
    arm.rotation.z = a
    arm.position.set(s * 1.2 + ox * c - oy * n, PIVOT_Y + ox * n + oy * c, 0)
  }
  const waver = arms.find((x) => x.s === 1)

  // Wave once when the page is revealed (the splash covers the hero until then).
  const WAVE = { raise: 0.5, hold: 2.4, lower: 0.6 }
  const WAVE_TOTAL = WAVE.raise + WAVE.hold + WAVE.lower
  let waveStart = -1
  const clock = new THREE.Clock()
  function startWave() { if (!reduce) waveStart = clock.elapsedTime }
  const splashOpen = () => document.body.classList.contains('splash-open')
  if (cfg.waveOn === 'none') {
    // no wave on this stage
  } else if (cfg.waveOn === 'view') {
    // wave the first time this stage is mostly on screen (and not while the splash covers the page)
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !splashOpen()) { io.disconnect(); setTimeout(startWave, 250) }
    }, { threshold: 0.5 })
    io.observe(stage)
  } else if (splashOpen()) {
    const mo = new MutationObserver(() => {
      if (!splashOpen()) { mo.disconnect(); setTimeout(startWave, 350) }
    })
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  } else {
    startWave()
  }
  // click (or Enter / Space on a focusable stage) waves again
  if (!cfg.charge) {
    stage.addEventListener('click', () => { if (waveStart < 0) startWave() })
    stage.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && waveStart < 0) { e.preventDefault(); startWave() }
    })
  }
  const ease = (x) => x * x * (3 - 2 * x)

  renderer.setAnimationLoop(() => {
    if (!onScreen) return
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime
    let wave = 0, waving = 0
    if (waveStart >= 0) {
      const w = t - waveStart
      if (w < WAVE_TOTAL) {
        waving = w < WAVE.raise ? ease(w / WAVE.raise)
          : w < WAVE.raise + WAVE.hold ? 1
          : 1 - ease((w - WAVE.raise - WAVE.hold) / WAVE.lower)
        wave = waving * (2.45 + Math.sin(w * 13) * 0.22)
      } else waveStart = -1
    }
    let level = 0
    if (cfg.charge) {
      let flash = 0
      if (reduce) level = 0.55
      else {
        const p = (t % 4.6) / 4.6 // charge up for 80% of the cycle, flash, then drain
        level = p < 0.8 ? ease(p / 0.8) : 1 - ease((p - 0.8) / 0.2)
        flash = p >= 0.8 && p < 0.92 ? 1 - (p - 0.8) / 0.12 : 0
      }
      visorMat.emissiveIntensity = 0.28 + level * 1.1 + flash * 1.1
      orange.emissiveIntensity = 0.12 + level * 0.9 + flash * 0.7
      gold.emissiveIntensity = level * 1.4 + flash
      glow.material.opacity = 0.12 + level * 0.55 + flash * 0.3
      glow.scale.setScalar(8 + level * 2.5 + flash * 2)
      sparks.visible = !reduce
      if (!reduce) {
        sparks.material.opacity = 0.25 + level * 0.75
        for (let i = 0; i < SPARKS; i++) {
          const q = sparkSeed[i]
          const u = (t * 0.22 * q.sp + q.ph) % 1 // 0 at the edge, 1 at the chest
          const r = 3.6 * (1 - u) + 0.45, ang = q.a + u * 4.2
          sparkAttr.setXYZ(i, Math.cos(ang) * r, q.y * (1 - u) + 2.7 * u, Math.sin(ang) * r * 0.7)
        }
        sparkAttr.needsUpdate = true
        robot.position.x = Math.sin(t * 60) * 0.012 * level // a little energy shake
      }
      robot.scale.setScalar(1 + flash * 0.035)
    }
    for (const x of arms) setArm(x, x.s * (0.04 + level * 0.6) + (x === waver ? wave : 0))
    if (waving) look.tx *= 1 - waving * 0.5 // keep the face toward the viewer while waving
    const k = 1 - Math.exp(-dt * 6)
    look.x += (look.tx - look.x) * k
    look.y += (look.ty - look.y) * k
    head.rotation.y = look.x * 0.7
    head.rotation.x = look.y * 0.28
    torso.rotation.y = look.x * 0.16
    if (!reduce) {
      robot.position.y = Math.sin(t * 1.6) * 0.03
      head.rotation.z = Math.sin(t * 0.6) * 0.015 - look.x * 0.04
      const blink = (t % 4.2) > 4.08 ? 0.15 : 1
      eye.scale.y += (blink - eye.scale.y) * 0.5
    }
    renderer.render(scene, camera)
  })
}
