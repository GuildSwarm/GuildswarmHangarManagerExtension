// La guía para cerrar una escalera, sobre el hangar de RSI (prototipo, Fabio 2026-11-27). SC Tools la empieza (background/closeChain.js) y aquí
// se enseña un paso cada vez: las abejas señalan el CCU del paso, y cuando el usuario abre la ventana «Apply Upgrade» de RSI se le marca el
// pledge de su escalera. Aplicar lo hace siempre el usuario, en la ventana de RSI y con su contraseña: aquí no se pulsa nada por él.
//
// El error que evita (Fabio): RSI solo deja aplicar un CCU a un pledge que ya tiene su nave de origen, así que equivocarse es elegir otro
// CCU que sale de la misma nave hacia otro destino. Si el usuario abre la ventana de un CCU que no es el del paso, se le dice ahí mismo y no se
// le marca nada.
//
// Cuándo se comprueba el paso (handleGuideCheck): al cargar la página, al cerrarse la ventana de RSI y con «Ya lo he aplicado». Si el CCU ya no
// existe se da por aplicado, se pasa al siguiente y, si está en otra página del hangar, se va a ella en esta misma pestaña.
import { GUIDE_KEY, GUIDE_MARK } from '../shared/chainGuide.js'
import { SWARM_DELAY_MS, swarmAround } from '../shared/bees.js'

const t = (key, substitutions = []) => chrome.i18n.getMessage(key, substitutions.map(String))
const send = (message) => chrome.runtime.sendMessage(message)

let guide = null
let panel = null
// El pledge id del CCU cuyo «Apply Upgrade» pulsó el usuario por última vez (para saber de qué CCU es la ventana que se abre)
let pressed = null
let dialogOpen = false
let busy = false
let exiting = false
let notFound = false
let marked = null

// ---- DOM: todo con createElement y textContent (los nombres vienen de RSI y de SC Tools) ----
const h = (tag, attributes = {}, ...children) => {
  const element = document.createElement(tag)
  for (const [key, value] of Object.entries(attributes)) {
    if (value === false || value == null) continue
    if (key === 'class') element.className = value
    else if (key.startsWith('on')) element.addEventListener(key.slice(2), value)
    else element.setAttribute(key, value === true ? '' : value)
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue
    element.append(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return element
}

const step = () => guide?.steps[guide.current]
const jump = (s) => `${s.from} → ${s.to}`
const finalShip = () => guide.steps[guide.steps.length - 1].to

const itemOf = (pledgeId) => {
  for (const input of document.querySelectorAll('ul.list-items li input.js-pledge-id')) {
    if (input.value === String(pledgeId)) return input.closest('li')
  }
  return null
}

// ---- El CCU del paso, marcado en la página ----
const unmark = () => {
  document.querySelectorAll('.gs-guide-target').forEach((element) => element.classList.remove('gs-guide-target'))
  document.querySelectorAll('.gs-guide-apply').forEach((element) => element.classList.remove('gs-guide-apply'))
  document.querySelectorAll('.gs-guide-tag').forEach((element) => element.remove())
  marked = null
}

const markStep = (swarm) => {
  const current = step()
  const item = current && itemOf(current.pledgeId)
  if (!item) {
    unmark()
    return false
  }
  if (marked === item) return true
  unmark()
  marked = item
  item.classList.add('gs-guide-target')
  item.querySelector('.js-apply-upgrade')?.classList.add('gs-guide-apply')
  item.prepend(h('span', { class: 'gs-guide-tag' }, t('guideTag', [guide.current + 1])))
  if (swarm) {
    item.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => swarmAround(item), SWARM_DELAY_MS)
  }
  placeSoon()
  return true
}

const showItem = () => {
  if (!marked) return
  marked.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => swarmAround(marked), SWARM_DELAY_MS)
}

// ---- La ventana «Apply Upgrade» de RSI: una fila con un botón de opción por pledge (su valor es el pledge id) ----
const dialogRadios = () => [...document.querySelectorAll('input[type="radio"]')]
  .filter((radio) => /^\d+$/.test(radio.value) && !radio.closest('ul.list-items') && !radio.closest('.gs-guide'))

const rowOf = (radio) => radio.closest('.row, li, label') ?? radio.parentElement

const onDialog = () => {
  const radios = dialogRadios()
  const open = radios.length > 0
  if (!open) {
    // se cerró: puede que lo haya aplicado (RSI quizá recargue la página; si no, se mira aquí)
    if (dialogOpen) setTimeout(() => { refresh().catch(console.error) }, 800)
    dialogOpen = false
    return
  }
  if (radios.every((radio) => radio.dataset.gsGuide)) return
  dialogOpen = true
  radios.forEach((radio) => { radio.dataset.gsGuide = 'seen' })
  const current = step()
  if (!guide || guide.state !== 'guiding' || !current) return

  const list = rowOf(radios[0])?.parentElement
  list?.querySelector('.gs-guide-dialog-note')?.remove()
  const wrong = pressed && pressed !== String(current.pledgeId)
  if (wrong) {
    // la ventana es de otro CCU (seguramente uno que sale de la misma nave): no se marca nada
    list?.prepend(h('p', { class: 'gs-guide-dialog-note is-warning', role: 'alert' }, t('guideWrongCcuDialog', [guide.current + 1, jump(current)])))
    render()
    return
  }
  const pick = radios.find((radio) => radio.value === String(guide.base.pledgeId))
  if (!pick) {
    list?.prepend(h('p', { class: 'gs-guide-dialog-note is-warning', role: 'alert' }, t('guideBaseMissingDialog', [guide.base.name])))
    return
  }
  const row = rowOf(pick)
  row.classList.add('gs-guide-pick')
  row.append(h('span', { class: 'gs-guide-pick-badge' }, t('guidePickBadge')))
  // Se deja elegido (con un clic, como lo haría el usuario, para que RSI se entere); aplicar sigue necesitando su contraseña
  if (pressed && !pick.checked) pick.click()
  row.scrollIntoView({ block: 'nearest' })
}

let dialogFrame = 0
const watchDialog = () => {
  new window.MutationObserver(() => {
    if (dialogFrame) return
    dialogFrame = window.requestAnimationFrame(() => {
      dialogFrame = 0
      onDialog()
    })
  }).observe(document.body, { childList: true, subtree: true })
}

// ---- El panel ----
const stepRow = (s, index) => {
  const state = s.done ? 'done' : index === guide.current && guide.state === 'guiding' ? 'active-guide' : 'pending'
  return h('li', { class: 'gs-step gs-guide-step', 'data-state': state, 'aria-current': state === 'active-guide' ? 'step' : null },
    h('span', { class: 'gs-step-icon', 'aria-hidden': 'true' }, s.done ? '' : String(index + 1)),
    h('span', { class: 'gs-step-label' }, jump(s)),
    h('span', { class: 'gs-guide-sr' }, s.done ? t('guideStepDone') : state === 'active-guide' ? t('guideStepNow') : t('guideStepPending'))
  )
}

const warningText = () => {
  const current = step()
  if (notFound) return t('guideCcuNotFound', [guide.current + 1])
  if (pressed && current && pressed !== String(current.pledgeId) && dialogOpen) return t('guideWrongCcu', [guide.current + 1])
  if (guide.warning === 'base-not-ready') return t('guideBaseNotReady', [guide.base.name, current?.from ?? ''])
  return null
}

const render = () => {
  if (!guide || (guide.state !== 'guiding' && guide.state !== 'closed')) {
    panel?.remove()
    panel = null
    unmark()
    return
  }
  const closed = guide.state === 'closed'
  if (closed) unmark()
  const current = step()
  const head = h('div', { class: 'gs-guide-head' },
    h('img', { class: 'gs-guide-logo', src: chrome.runtime.getURL('assets/bee.svg'), alt: '' }),
    h('div', { class: 'gs-guide-heading' },
      h('p', { class: 'gs-guide-kicker' }, 'GuildSwarm'),
      h('h2', { class: 'gs-guide-title', id: 'gs-guide-title' }, closed ? t('guideTitleClosed') : t('guideTitle'))
    ),
    !closed && h('button', { type: 'button', class: 'gs-close-process-button gs-guide-x', 'aria-label': t('guideExit'), title: t('guideExit'), onclick: () => { exiting = true; render() } },
      h('span', { 'aria-hidden': 'true' }, '×'))
  )
  const chain = h('p', { class: 'gs-guide-chain' }, t('guideChain', [guide.steps[0].from, finalShip()]))
  const steps = h('ol', { class: 'gs-steps gs-guide-steps', 'aria-label': t('guideStepsLabel') }, guide.steps.map(stepRow))

  let body
  if (exiting) {
    body = h('div', { class: 'gs-guide-now' },
      h('p', { class: 'gs-guide-lead' }, t('guideExitQuestion')),
      h('p', { class: 'gs-guide-note' }, t('guideExitNote')),
      h('div', { class: 'gs-guide-actions' },
        h('button', { type: 'button', class: 'gs-guide-button is-primary', onclick: endGuide }, t('guideExitConfirm')),
        h('button', { type: 'button', class: 'gs-guide-button', onclick: () => { exiting = false; render() } }, t('guideExitCancel'))
      )
    )
  } else if (closed) {
    const exportButton = document.querySelector('.gs-start-process-button')
    body = h('div', { class: 'gs-guide-now' },
      h('p', { class: 'gs-guide-lead' }, t('guideClosedLead', [guide.base.name, finalShip()])),
      guide.warning === 'final-unconfirmed' && h('p', { class: 'gs-guide-warning', role: 'alert' }, t('guideFinalUnconfirmed', [finalShip()])),
      h('p', { class: 'gs-guide-note' }, t('guideClosedNote')),
      h('div', { class: 'gs-guide-actions' },
        exportButton && h('button', { type: 'button', class: 'gs-guide-button is-primary', onclick: () => { endGuide().then(() => exportButton.click()).catch(console.error) } }, t('guideExport')),
        h('button', { type: 'button', class: `gs-guide-button${exportButton ? '' : ' is-primary'}`, onclick: endGuide }, t('guideFinish'))
      )
    )
  } else {
    const warning = warningText()
    body = h('div', { class: 'gs-guide-now' },
      h('p', { class: 'gs-guide-count' }, t('guideCount', [guide.current + 1, guide.steps.length])),
      h('p', { class: 'gs-guide-lead' }, t('guideApply'), ' ', h('strong', {}, jump(current))),
      h('ol', { class: 'gs-guide-how' },
        h('li', {}, t('guideHowPress')),
        h('li', {}, t('guideHowPick'), ' ', h('strong', {}, `${guide.base.name} (#${guide.base.pledgeId})`), '. ', t('guideHowPickNote')),
        h('li', {}, t('guideHowConfirm'))
      ),
      warning && h('p', { class: 'gs-guide-warning', role: 'alert' }, warning),
      h('div', { class: 'gs-guide-actions' },
        h('button', { type: 'button', class: 'gs-guide-button is-primary', 'aria-busy': busy ? 'true' : null, disabled: busy, onclick: () => { refresh(true).catch(console.error) } },
          busy ? t('guideChecking') : t('guideApplied')),
        marked && h('button', { type: 'button', class: 'gs-guide-button', onclick: showItem }, t('guideShowCcu'))
      )
    )
  }

  const next = h('aside', { class: 'gs-guide', 'aria-labelledby': 'gs-guide-title', 'data-state': guide.state },
    h('div', { class: 'gs-guide-glass' }, head, chain, steps, h('div', { 'aria-live': 'polite' }, body)))
  // (se conserva el foco si estaba en el panel: el botón equivalente del panel nuevo lo recibe)
  const focused = panel?.contains(document.activeElement) ? document.activeElement.textContent : null
  if (panel) panel.replaceWith(next)
  else document.body.append(next)
  panel = next
  if (focused) [...panel.querySelectorAll('button')].find((button) => button.textContent === focused)?.focus()
  place()
}

// El panel va abajo a la derecha, donde RSI pone los botones de cada artículo: si tapa el «Apply Upgrade» del CCU marcado, se pasa a la izquierda
const place = () => {
  if (!panel) return
  const target = marked?.querySelector('.js-apply-upgrade') ?? marked
  const box = target?.getBoundingClientRect()
  const margin = 20
  const right = { left: window.innerWidth - margin - panel.offsetWidth, top: window.innerHeight - margin - panel.offsetHeight }
  const covers = !!box && box.right > right.left && box.bottom > right.top && box.top < window.innerHeight - margin
  panel.classList.toggle('is-left', covers)
}
let placeFrame = 0
const placeSoon = () => {
  if (placeFrame) return
  placeFrame = window.requestAnimationFrame(() => { placeFrame = 0; place() })
}

// ---- Estado ----
async function endGuide () {
  exiting = false
  await send({ type: 'handleGuideEnd' })
}

// Cómo va el paso actual; si cambió de paso y su CCU está en otra página, se va a ella. `asked`: lo pidió el usuario («Ya lo he aplicado»).
async function refresh (asked = false) {
  if (busy || !guide || guide.state !== 'guiding') return
  busy = true
  render()
  const before = guide.current
  try {
    const reply = await send({ type: 'handleGuideCheck' })
    guide = reply?.guide ?? null
  } finally {
    busy = false
  }
  if (!guide || guide.state !== 'guiding') {
    render()
    return
  }
  const moved = guide.current !== before
  if (moved) pressed = null
  if (markStep(moved || asked)) {
    notFound = false
    render()
    return
  }
  // el CCU del paso está en otra página del hangar
  render()
  const located = await send({ type: 'handleGuideLocate' })
  if (located?.url) {
    window.location.assign(located.url)
    return
  }
  notFound = true
  render()
}

const start = async () => {
  if (window.location.hash === GUIDE_MARK) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
  guide = (await chrome.storage.local.get(GUIDE_KEY))[GUIDE_KEY] ?? null
  // Se apunta qué «Apply Upgrade» pulsa el usuario: así se sabe de qué CCU es la ventana que abre RSI
  document.addEventListener('click', (event) => {
    const button = event.target instanceof window.Element ? event.target.closest('.js-apply-upgrade') : null
    if (!button) return
    pressed = button.closest('li')?.querySelector('input.js-pledge-id')?.value ?? null
  }, true)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(GUIDE_KEY in changes)) return
    guide = changes[GUIDE_KEY].newValue ?? null
    if (!guide) unmark()
    else markStep(false)
    render()
  })
  watchDialog()
  window.addEventListener('scroll', placeSoon, { passive: true })
  window.addEventListener('resize', placeSoon)
  if (!guide) return
  markStep(true)
  render()
  await refresh()
}

start().catch((error) => console.error(error))
