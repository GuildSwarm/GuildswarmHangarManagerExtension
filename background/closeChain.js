import ky from 'ky'
import * as cheerio from 'cheerio'
import { baseUrlRsi, hash, retryLimit, statusCodesRetry } from './shared.js'
import { isPledgeHash, isProductType, pledgesUrl } from './findPledge.js'
import { GUIDE_KEY, GUIDE_MARK } from '../shared/chainGuide.js'

// Cerrar una escalera (prototipo, Fabio 2026-11-27): SC Tools manda la escalera (el pledge de partida y sus CCU en orden, cada uno por el
// SHA-256 de su pledge id) y aquí se comprueba con la sesión del usuario que todo sigue en su hangar, se guarda la guía y se abre RSI en el
// CCU del primer paso. Desde ahí guía el script de RSI (content/chainGuide.js): un paso cada vez, y el usuario aplica cada CCU en la ventana
// de RSI con su contraseña. La extensión nunca aplica nada: solo lee el hangar y pregunta a RSI a qué pledges admite un CCU, lo mismo que
// pregunta su propia ventana al pulsar «Apply Upgrade» (chooseUpgradeTarget). Aplicar es applyUpgrade, permanente, y aquí no se llama nunca.
//
// La guía se guarda en chrome.storage.local (`chainGuide`) mientras dura, con los pledge id de RSI (hacen falta para preguntar a RSI y para
// marcar el pledge en su ventana); se borra al salir de la guía o al terminar. A SC Tools solo vuelve el resumen (guideSummary): nunca un pledge id.

const MAX_STEPS = 40
const MAX_PAGES = 300
const NAME = /^[\p{L}\p{N} .,'’()&/+:#-]{1,80}$/u

const fetchPage = async (url) => {
  const response = await ky.get(url, { retry: { limit: retryLimit, methods: ['get'], statusCodes: statusCodesRetry } })
  return response.text()
}

const cleanName = (value) => (typeof value === 'string' && NAME.test(value.trim()) ? value.trim() : null)

// Lo que la página pide, validado campo a campo: nada que no sea un hash o un nombre corto llega a la guía
export const readRequest = (chain) => {
  if (!chain || typeof chain !== 'object') return null
  const steps = Array.isArray(chain.steps) ? chain.steps : []
  if (steps.length === 0 || steps.length > MAX_STEPS) return null
  const base = chain.base
  if (!base || !isPledgeHash(base.pledge)) return null
  const clean = steps.map((step) => ({ hash: step?.ccu, from: cleanName(step?.from), to: cleanName(step?.to) }))
  if (clean.some((step) => !isPledgeHash(step.hash) || !step.from || !step.to)) return null
  if (new Set(clean.map((step) => step.hash)).size !== clean.length) return null
  return {
    name: cleanName(chain.name),
    base: { hash: base.pledge, productType: isProductType(base.productType) ? base.productType : null },
    steps: clean
  }
}

// Recorre el hangar (de un product-type si se sabe) buscando estos hashes. Devuelve, por hash, su pledge id, su nombre y la página donde está.
// Para en cuanto los tiene todos.
export const locate = async (hashes, productType = null) => {
  const wanted = new Set(hashes)
  const found = new Map()
  for (let page = 1; page <= MAX_PAGES && found.size < wanted.size; page++) {
    const url = pledgesUrl({ page, productType })
    const $ = cheerio.load(await fetchPage(url))
    const items = $('ul.list-items li').toArray()
    for (const li of items) {
      const pledgeId = $(li).find('input.js-pledge-id').val()
      if (!pledgeId) continue
      const pledgeHash = hash(pledgeId)
      if (wanted.has(pledgeHash) && !found.has(pledgeHash)) {
        const contents = [$(li).find('div.items-col').text(), ...$(li).find('div.item div.title').toArray().map((title) => $(title).text())].join(' ')
        found.set(pledgeHash, { pledgeId, name: cleanName($(li).find('input.js-pledge-name').val()) ?? '', contents: contents.replace(/\s+/g, ' ').trim(), page, productType, url })
      }
    }
    const hasNextPage = $('div.pager div.right a.gt').length > 0
    if (items.length === 0 || !hasNextPage) break
  }
  return found
}

// La página del hangar donde está ahora el CCU de un paso (se mueve en cuanto se aplica cualquier otro), con la marca de la guía
export const stepUrl = async (step) => {
  const found = (await locate([step.hash], 'upgrade')).get(step.hash)
  return found ? `${found.url}${GUIDE_MARK}` : null
}

// Lo que RSI responde a "¿a qué pledges puedo aplicar este CCU?": la lista de pledge ids, o null si el CCU ya no existe
// (ErrInvalidObject: aplicado, fundido o regalado desde que se leyó el hangar).
export const upgradeTargets = async (rsiToken, upgradePledgeId) => {
  const response = await ky.post(`${baseUrlRsi}/api/account/chooseUpgradeTarget`, {
    headers: { 'content-type': 'application/json', 'x-rsi-token': rsiToken, 'x-requested-with': 'XMLHttpRequest' },
    body: JSON.stringify({ upgrade_id: String(upgradePledgeId) }),
    retry: { limit: retryLimit, methods: ['post'], statusCodes: statusCodesRetry }
  }).json()
  if (!response?.success && response?.code === 'ErrInvalidObject') return null
  if (!response?.success) throw new Error(response?.msg || 'chooseUpgradeTarget')
  const $ = cheerio.load(`<div>${response.data?.rendered ?? ''}</div>`)
  return $('input[type="radio"]').toArray().map((radio) => String($(radio).attr('value') ?? '')).filter(Boolean)
}

export const getGuide = async () => (await chrome.storage.local.get(GUIDE_KEY))[GUIDE_KEY] ?? null
export const saveGuide = (guide) => chrome.storage.local.set({ [GUIDE_KEY]: guide })
export const clearGuide = () => chrome.storage.local.remove(GUIDE_KEY)

// Empezar: todo tiene que seguir en el hangar. Si falta algo se dice qué (los pasos por su número y si falta la base), y no se guarda nada.
export const startGuide = async (request) => {
  const ccus = await locate(request.steps.map((step) => step.hash), 'upgrade')
  const bases = await locate([request.base.hash], request.base.productType)
  const base = bases.get(request.base.hash)
  const missing = request.steps.map((step, index) => (ccus.has(step.hash) ? null : index)).filter((index) => index !== null)
  if (!base || missing.length) return { error: 'missing', missing, base: !!base }

  const first = ccus.get(request.steps[0].hash)
  const guide = {
    version: 1,
    state: 'guiding',
    startedAt: new Date().toISOString(),
    name: request.name,
    base: { hash: request.base.hash, pledgeId: base.pledgeId, name: base.name, productType: request.base.productType },
    steps: request.steps.map((step) => ({ ...step, pledgeId: ccus.get(step.hash).pledgeId, done: false })),
    current: 0,
    warning: null
  }
  await saveGuide(guide)
  return { guide, url: `${first.url}${GUIDE_MARK}` }
}

const finalOnBase = async (guide, finalShip) => {
  try {
    const base = (await locate([guide.base.hash], guide.base.productType)).get(guide.base.hash)
    return !!base && base.contents.toLowerCase().includes(finalShip.toLowerCase())
  } catch (error) {
    return false
  }
}

// Mirar cómo va el paso actual. Si su CCU ya no existe, se da por aplicado y se pasa al siguiente (o se cierra la escalera si era el último).
// Del siguiente se comprueba que RSI ya lo deja aplicar al pledge de la escalera: si no, el anterior fue a otro pledge (o la base ya no está).
export const checkGuide = async (rsiToken) => {
  const guide = await getGuide()
  if (!guide || guide.state !== 'guiding') return guide
  let changed = false
  for (;;) {
    const step = guide.steps[guide.current]
    const targets = await upgradeTargets(rsiToken, step.pledgeId)
    if (targets === null) {
      step.done = true
      changed = true
      if (guide.current === guide.steps.length - 1) {
        guide.state = 'closed'
        guide.closedAt = new Date().toISOString()
        // El último no tiene siguiente que lo confirme: se mira que el pledge de la escalera lleve ya la nave final
        guide.warning = await finalOnBase(guide, step.to) ? null : 'final-unconfirmed'
        break
      }
      guide.current++
      continue
    }
    // El pledge de la escalera ya tiene la nave de la que sale este CCU: si no, algo se aplicó a otro pledge
    const warning = targets.includes(String(guide.base.pledgeId)) ? null : 'base-not-ready'
    if (warning !== guide.warning) {
      guide.warning = warning
      changed = true
    }
    break
  }
  if (changed) await saveGuide(guide)
  return guide
}
