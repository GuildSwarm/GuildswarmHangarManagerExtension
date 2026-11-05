// Cuando SC Tools abre un artículo en RSI (findPledge en background/findPledge.js), la URL lleva #gs-pledge=<hash>,
// donde <hash> es el SHA-256 del pledge id: el mismo `id` del fichero exportado. Aquí se busca ese artículo en la página,
// se baja hasta él y las abejas de GuildSwarm revolotean a su alrededor. Después se deja la vista normal del hangar para la próxima visita del usuario.
const MARK = /^#gs-pledge=([0-9a-f]{64})$/
// Las abejas vuelan unos 3 segundos y se van; empiezan cuando el scroll suave ya ha llegado al artículo
const SWARM_MS = 3000
const SWARM_DELAY_MS = 500
// Cada abeja vuela un bucle alrededor de su propio punto junto al artículo (x, y en fracciones de su ancho y alto; fuera de
// 0–1 queda por fuera). El bucle es una curva de Lissajous: `a` y `b` son su ancho y alto en px y `fx`:`fy` su forma
// (1:1 un óvalo, 1:2 un ocho, 3:2 un lazo). `s` son los segundos por bucle, `at` dónde empieza (0–1) y `back` el sentido
const BEES = [
  { x: 0.06, y: 0.15, a: 44, b: 26, fx: 1, fy: 2, s: 5.8, at: 0, back: false },
  { x: 0.24, y: 1.0, a: 56, b: 22, fx: 1, fy: 1, s: 6.6, at: 0.3, back: true },
  { x: 0.43, y: -0.05, a: 60, b: 28, fx: 3, fy: 2, s: 8.8, at: 0.6, back: false },
  { x: 0.62, y: 1.05, a: 48, b: 24, fx: 1, fy: 2, s: 6.1, at: 0.15, back: true },
  { x: 0.8, y: 0.0, a: 52, b: 20, fx: 1, fy: 1, s: 7.1, at: 0.75, back: false },
  { x: 0.96, y: 0.55, a: 34, b: 34, fx: 2, fy: 3, s: 8.5, at: 0.45, back: true },
  { x: 0.0, y: 0.8, a: 30, b: 26, fx: 1, fy: 2, s: 5.4, at: 0.9, back: false }
]
const LOOP_POINTS = 96

// El bucle como path() de CSS, cerrado y centrado en el punto de la abeja
const loopPath = ({ a, b, fx, fy }) => {
  const points = []
  for (let i = 0; i < LOOP_POINTS; i++) {
    const t = (i / LOOP_POINTS) * 2 * Math.PI
    // Con fx igual a fy hace falta desfasar un cuarto de vuelta para que salga un óvalo y no una línea
    const x = a * Math.sin(fx * t + (fx === fy ? Math.PI / 2 : 0))
    const y = b * Math.sin(fy * t)
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return `path('M ${points[0]} L ${points.slice(1).join(' L ')} Z')`
}

const sha256 = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const findItem = async (pledgeHash) => {
  for (const input of document.querySelectorAll('ul.list-items li input.js-pledge-id')) {
    if (input.value && await sha256(input.value) === pledgeHash) return input.closest('li')
  }
  return null
}

// El enjambre va en una capa propia encima del artículo (no dentro, para no tocar el maquetado de RSI)
const swarmAround = (item) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const rect = item.getBoundingClientRect()
  const swarm = document.createElement('div')
  swarm.className = 'gs-pledge-bees'
  swarm.setAttribute('aria-hidden', 'true')
  Object.assign(swarm.style, {
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  })
  const beeUrl = chrome.runtime.getURL('assets/bee.svg')
  const layer = (className, parent) => {
    const element = document.createElement('span')
    element.className = className
    parent.append(element)
    return element
  }
  for (const bee of BEES) {
    const home = layer('gs-pledge-bee-home', swarm)
    home.style.left = `${bee.x * 100}%`
    home.style.top = `${bee.y * 100}%`
    const flyer = layer(`gs-pledge-bee${bee.back ? ' is-back' : ''}`, home)
    flyer.style.offsetPath = loopPath(bee)
    flyer.style.setProperty('--s', `${bee.s}s`)
    flyer.style.setProperty('--d', `${-bee.at * bee.s}s`)
    const image = document.createElement('img')
    image.src = beeUrl
    image.alt = ''
    image.draggable = false
    flyer.append(image)
  }
  document.body.append(swarm)

  setTimeout(() => {
    swarm.classList.add('is-leaving')
    setTimeout(() => swarm.remove(), 550)
  }, SWARM_MS)
}

const focusPledge = async () => {
  const match = MARK.exec(window.location.hash)
  if (!match) return

  // La marca solo sirve una vez: al recargar o compartir la URL no se vuelve a buscar
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)

  const item = await findItem(match[1])
  if (item) {
    item.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => swarmAround(item), SWARM_DELAY_MS)
  }

  chrome.runtime.sendMessage({ type: 'handleResetHangarView' }).catch((error) => {
    console.warn('No se pudo dejar la vista normal del hangar:', error)
  })
}

focusPledge().catch((error) => console.error(error))
