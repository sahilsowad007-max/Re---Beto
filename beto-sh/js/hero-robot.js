// beto.sh · hero robot (4K quality)
// A fully 3D mascot built from high-detail geometry: spins 360° endlessly and
// leans toward the pointer. No WebGL, or prefers-reduced-motion → the static
// mascot stays (handled by CSS: .no-webgl / missing .rendered keeps .still).
import * as THREE from 'three'

const HERO = document.getElementById('hero')
const STAGE = document.getElementById('st-hero')
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches

let scene, camera, renderer, robot, head, loop, then = 0, shown = false
let autoYaw = 0                       // endless 360° spin
let target = { x: 0, y: 0 }           // normalized pointer, -1..1
let aim = { x: 0, y: 0 }              // lerped pointer aim
let bobVel = 0                        // click hop spring
let happyUntil = 0                    // visor pulse after a tap

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function materials() {
  return {
    metal:  new THREE.MeshStandardMaterial({ color: 0xe8edf6, metalness: 0.65, roughness: 0.32 }),
    dark:   new THREE.MeshStandardMaterial({ color: 0x1f2a44, metalness: 0.75, roughness: 0.18 }),
    gold:   new THREE.MeshStandardMaterial({ color: 0xf79549, metalness: 0.9, roughness: 0.15 }),
    visor:  new THREE.MeshStandardMaterial({ color: 0x11182b, emissive: 0xf4c76a, emissiveIntensity: 3.5, metalness: 0.4, roughness: 0.15 }),
    eye:    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x7df9ff, emissiveIntensity: 2, metalness: 0.2, roughness: 0.1 }),
    floor:  new THREE.MeshStandardMaterial({ color: 0xd9dee8, roughness: 0.95, metalness: 0 }),
  }
}

function createRobot(m) {
  const robot = new THREE.Group()
  robot.position.set(0.55, -0.3, 0) // stage right, where Beto stands

  // ---- floor (shadow receiver) ----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 9, 32, 32), m.floor)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.78
  ground.receiveShadow = true
  robot.add(ground)

  const body = new THREE.Group()
  body.position.y = 0.1

  // torso (high segment count for smooth 4K surfaces)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.5, 0.66, 8, 12, 6), m.metal)
  torso.castShadow = torso.receiveShadow = true
  body.add(torso)

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.34, 6, 8, 4), m.gold)
  chest.position.set(0, 0.14, 0.36)
  chest.castShadow = chest.receiveShadow = true
  body.add(chest)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 32), m.dark)
  neck.position.y = 0.9
  body.add(neck)

  // ---- head ----
  head = new THREE.Group()
  head.position.y = 1.25
  body.add(head)

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.7, 0.66, 8, 8, 6), m.metal)
  skull.castShadow = skull.receiveShadow = true
  head.add(skull)

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.68, 8, 6, 6), m.dark)
  face.position.z = 0.34
  head.add(face)

  visor = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.34, 16, 12), m.visor)
  visor.position.z = 0.341
  head.add(visor)

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 32, 32), m.eye)
  eyeL.position.set(-0.19, 0.11, 0.47)
  const eyeR = eyeL.clone()
  eyeR.position.x = 0.19
  head.add(eyeL, eyeR)

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.035, 32, 64), m.gold)
  halo.position.y = 1.95
  halo.rotation.x = Math.PI / 2
  head.add(halo)
  robot.userData.halo = halo

  const antenna = new THREE.Group()
  antenna.position.set(0, 0.42, 0)
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 24), m.gold)
  stick.position.y = -0.22
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), m.gold)
  ball.position.y = -0.49
  antenna.add(stick, ball)
  head.add(antenna)
  robot.userData.antenna = antenna

  // ---- arms ----
  const makeArm = (side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.5, 0.42, 0)
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.085, 0.7, 32), m.metal)
    upper.position.y = -0.38
    upper.castShadow = upper.receiveShadow = true
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 32), m.dark)
    hand.position.y = -0.82
    hand.castShadow = hand.receiveShadow = true
    pivot.add(upper, hand)
    body.add(pivot)
    return pivot
  }
  robot.userData.armL = makeArm(-1)
  robot.userData.armR = makeArm(1)

  // ---- legs ----
  const makeLeg = (side) => {
    const hip = new THREE.Group()
    hip.position.set(side * 0.22, -0.55, 0)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.095, 1.0, 32), m.metal)
    leg.position.y = -1.05
    leg.castShadow = leg.receiveShadow = true
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.48, 6, 4, 6), m.dark)
    foot.position.y = -1.71
    foot.castShadow = foot.receiveShadow = true
    hip.add(leg, foot)
    body.add(hip)
    return hip
  }
  makeLeg(-1)
  makeLeg(1)

  robot.add(body)
  return robot
}

function buildScene() {
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0xf3f5fc, 0.04)

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60)
  camera.position.set(3.4, 2.5, 6.5)

  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambient)

  const hemi = new THREE.HemisphereLight(0xffffff, 0xf3f5fc, 0.4)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xffffff, 1.0)
  sun.position.set(4, 7, 4)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.set(-7, 7, 7, -7)
  sun.shadow.bias = -0.0005
  scene.add(sun)

  const warm = new THREE.PointLight(0xf79549, 1.3, 10)
  warm.position.set(-1.4, 2.4, 1.6)
  warm.castShadow = true
  scene.add(warm)

  const cool = new THREE.PointLight(0x7df9ff, 0.7, 10)
  cool.position.set(3, 2, -2.2)
  scene.add(cool)

  robot = createRobot(materials())
  scene.add(robot)
}

function createRenderer() {
  const canvas = document.createElement('canvas')
  canvas.className = 'hero-robot'
  canvas.setAttribute('aria-hidden', 'true') // the stage element carries the accessible label
  canvas.style.visibility = 'hidden' // wait for the first frame so the still mascot isn't hidden early
  STAGE.appendChild(canvas)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)) // 4K-ready pixel ratio
  renderer.setSize(STAGE.clientWidth || 900, STAGE.clientHeight || 700)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.physicallyCorrectLights = true
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.setClearColor(0x000000, 0) // transparent: page background shows through
  return canvas
}

function onResize() {
  const w = STAGE.clientWidth, h = STAGE.clientHeight
  if (!w || !h || !camera || !renderer) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function frame(t) {
  loop = requestAnimationFrame(frame)
  const dt = t - then
  then = t
  if (!dt) return
  const sec = t * 0.001

  // endless 360° rotation (one full turn every ~10 seconds)
  autoYaw += 0.0006 * dt
  aim.x += (target.x - aim.x) * 0.05
  aim.y += (target.y - aim.y) * 0.05

  robot.rotation.y = autoYaw + aim.x * 0.25
  robot.rotation.x = -aim.y * 0.05
  robot.rotation.z = -aim.y * 0.1 + Math.sin(sec * 1.2) * 0.012

  const float = Math.sin(sec * 1.6) * 0.04
  robot.position.y = -0.3 + float + bobVel

  // click hop spring
  bobVel *= 0.82
  bobVel -= (robot.position.y + 0.3 - float) * 6
  if (Math.abs(bobVel) < 0.005) bobVel = 0

  // arms swing with the spin
  const swing = Math.sin(sec * 2.2) * 0.35
  robot.userData.armL.rotation.z = swing
  robot.userData.armR.rotation.z = -swing

  // head tracks the pointer
  head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, aim.x * 1.1, 0.1)
  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -aim.y * 0.85, 0.1)

  // antenna wobble
  robot.userData.antenna.rotation.z = Math.sin(sec * 2.4 + aim.x * 2) * 0.12

  // halo drift above the head
  robot.userData.halo.position.y = 1.95 + Math.sin(sec * 1.7) * 0.06

  // visor: breath, pointer brightness, happy pulse after a tap
  const visorIntensity = 3.5 + Math.sin(sec * 2) * 0.4 + Math.hypot(aim.x, aim.y) * 1.2
  visor.emissiveIntensity = Date.now() < happyUntil ? visorIntensity + 2.2 : visorIntensity

  // camera drifts slightly toward where the user is looking
  camera.lookAt(0.55 + aim.x * 0.9, 0.35 + aim.y * 0.5, 0)

  renderer.render(scene, camera)
  if (!shown) { renderer.domElement.style.visibility = 'visible'; shown = true }
}

function tap() {
  happyUntil = Date.now() + 500
  bobVel = 0.28
}

function listen() {
  const move = (e) => {
    const r = HERO.getBoundingClientRect()
    target.x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1)
    target.y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1)
  }
  HERO.addEventListener('pointermove', move, { passive: true })
  HERO.addEventListener('pointerleave', () => { target.x = 0; target.y = 0 })
  HERO.addEventListener('pointerdown', tap)
  addEventListener('resize', onResize, { passive: true })
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(onResize)
    ro.observe(STAGE)
  }
  addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(loop); loop = 0 }
    else if (!loop) { then = performance.now(); loop = requestAnimationFrame(frame) }
  })
}

export function init() {
  if (REDUCE || !HERO || !STAGE) return false
  const probe = document.createElement('canvas')
  if (!probe.getContext('webgl')) return false

  createRenderer()
  buildScene()
  STAGE.classList.add('rendered')           // hides the .still mascot
  document.documentElement.classList.remove('no-webgl')

  then = performance.now()
  listen()
  onResize()
  loop = requestAnimationFrame(frame)
  return true
}

if (!init()) {
  // WebGL unavailable or reduced motion: leave the static mascot visible.
  STAGE?.classList.add('fallback')
}
