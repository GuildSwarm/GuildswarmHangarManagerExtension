// Puente entre SC Tools y la extensión (se inyecta solo en los dominios de SC Tools, ver manifest.json).
//
// La web y este script hablan por window.postMessage. Contrato (protocol 1):
//
//   web → extensión   { source: 'guildswarm-sctools', id, type, ...datos }
//   extensión → web   { source: 'guildswarm-hangar-extension', protocol: 1, id, ok, ...datos }
//
//   type 'ping'         → { version, autoSync, features }        (features: operaciones extra que entiende esta versión)
//   type 'getAutoSync'  → { autoSync }
//   type 'setAutoSync'  { enabled: boolean } → { autoSync }      (desactivarlo borra el hangar guardado)
//   type 'getHangar'    → { autoSync, snapshot }                 (snapshot: { exportedAt, file } | null)
//   type 'findPledge'   { pledge, productType } → { found, reason } (feature 'findPledge', ver abajo)
//   type 'addToCart'    { items: [{ id, fromShipId, toShipId, toSkuId }], openCart } → { error } | { results: [{ id, ok, reason }], cartOpened }
//                       (feature 'addToCart'; mientras trabaja avisa de cada CCU: { event: 'cartItem', request, result }; con openCart, si entró
//                       alguno, al acabar abre la cesta de RSI en una pestaña al lado)
//
//   type 'closeChain'   { chain: { name, base: { pledge, productType }, steps: [{ ccu, from, to }] } } → { started, guide } | { error, missing, base }
//                       (feature 'closeChain', prototipo: comprueba que todo sigue en el hangar y abre RSI en el CCU del primer paso, donde guía
//                       content/chainGuide.js; el usuario aplica cada CCU en RSI con su contraseña, la extensión nunca aplica nada)
//   type 'chainGuide'   → { guide }                               (cómo va la guía: ver guideSummary en shared/chainGuide.js)
//   type 'endChainGuide' → { ended }                              (salir de la guía; lo ya aplicado se queda aplicado)
//
//   La extensión avisa por su cuenta (sin id): { source, protocol: 1, event: 'hangarUpdated' | 'autoSyncChanged' | 'chainGuide', ... }
//
// Si la extensión no está instalada nadie contesta: la web lo toma como "no instalada" tras su tiempo de espera.
// Dos operaciones llegan al background y usan la sesión de RSI del usuario. 'findPledge' solo devuelve si
// el artículo está (y en ese caso abre su página de RSI) o por qué no: nunca datos del hangar. `pledge` es el `id` del
// fichero (el SHA-256 del pledge id) y `productType` su categoría de RSI; el background vuelve a validar los dos.
// 'addToCart' mete en la cesta de RSI los CCU que la página nombra por sus ids de RSI (la nave de partida, la de destino y el SKU
// del CCU), con la sesión del usuario: solo comprueba que hay sesión, no lee nada más de su cuenta. La cesta no es una compra: pagar lo hace el usuario en RSI.
// error: 'signed-out' (sin sesión en RSI) · 'store' (no se pudo leer la tienda) · 'invalid' · 'failed'.
// reason de cada CCU: 'unavailable' (RSI no lo vende ahora) · 'failed'.
import { STORAGE_KEYS, getAutoSync, setAutoSync, getSnapshot } from '../shared/autoSync.js'
import { CART_PORT, MAX_CART_ITEMS } from '../shared/cart.js'
import { GUIDE_KEY, guideSummary } from '../shared/chainGuide.js'

const FROM_WEB = 'guildswarm-sctools'
const FROM_EXTENSION = 'guildswarm-hangar-extension'
const PROTOCOL = 1
const FEATURES = ['findPledge', 'addToCart', 'closeChain']
const CLOSE_ERRORS = ['signed-out', 'missing', 'invalid']
const CART_ERRORS = ['signed-out', 'store', 'invalid']
const CART_REASONS = ['unavailable', 'failed']
const PLEDGE_HASH = /^[0-9a-f]{64}$/
const FIND_REASONS = ['not-found', 'signed-out']

const post = (message) => window.postMessage({ source: FROM_EXTENSION, protocol: PROTOCOL, ...message }, window.location.origin)

const handlers = {
  ping: async () => ({ version: chrome.runtime.getManifest().version, autoSync: await getAutoSync(), features: FEATURES }),
  getAutoSync: async () => ({ autoSync: await getAutoSync() }),
  setAutoSync: async ({ enabled }) => {
    if (typeof enabled !== 'boolean') throw new Error('invalid')
    await setAutoSync(enabled)
    return { autoSync: enabled }
  },
  getHangar: async () => {
    const autoSync = await getAutoSync()
    return { autoSync, snapshot: autoSync ? await getSnapshot() : null }
  },
  findPledge: async ({ pledge, productType }) => {
    if (typeof pledge !== 'string' || !PLEDGE_HASH.test(pledge)) throw new Error('invalid')
    const reply = await chrome.runtime.sendMessage({
      type: 'handleFindPledge',
      pledgeHash: pledge,
      productType: typeof productType === 'string' ? productType : null
    })
    if (!reply || reply.error) throw new Error('failed')
    if (reply.found === true) return { found: true, reason: null }
    return { found: false, reason: FIND_REASONS.includes(reply.reason) ? reply.reason : 'not-found' }
  },
  closeChain: async ({ chain }) => {
    const reply = await chrome.runtime.sendMessage({ type: 'handleCloseChain', chain })
    if (!reply || reply.error === true) throw new Error('failed')
    if (reply.started === true) return { started: true, guide: reply.guide ?? null }
    const error = CLOSE_ERRORS.includes(reply.error) ? reply.error : 'failed'
    return error === 'missing'
      ? { error, missing: Array.isArray(reply.missing) ? reply.missing.filter(Number.isInteger) : [], base: reply.base === true }
      : { error }
  },
  chainGuide: async () => {
    const reply = await chrome.runtime.sendMessage({ type: 'handleGuideSummary' })
    return { guide: reply?.guide ?? null }
  },
  endChainGuide: async () => {
    await chrome.runtime.sendMessage({ type: 'handleGuideEnd' })
    return { ended: true }
  },
  addToCart: ({ id, items, openCart }) => {
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_CART_ITEMS) throw new Error('invalid')
    // solo los campos que conoce: el background los vuelve a validar uno a uno
    const asked = items.map((item) => ({ id: item?.id, fromShipId: item?.fromShipId, toShipId: item?.toShipId, toSkuId: item?.toSkuId }))
    const result = (raw) => ({ id: String(raw?.id ?? ''), ok: raw?.ok === true, reason: raw?.ok === true ? null : CART_REASONS.includes(raw?.reason) ? raw.reason : 'failed' })
    return new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: CART_PORT })
      port.onMessage.addListener((message) => {
        if (message?.type === 'item') {
          post({ event: 'cartItem', request: id, result: result(message.result) })
        } else if (message?.type === 'done') {
          port.disconnect()
          if (message.error) resolve({ error: CART_ERRORS.includes(message.error) ? message.error : 'failed' })
          else resolve({ results: Array.isArray(message.results) ? message.results.map(result) : [], cartOpened: message.cartOpened === true })
        }
      })
      // el background se cayó o la extensión se recargó a medias
      port.onDisconnect.addListener(() => reject(new Error('failed')))
      port.postMessage({ type: 'addToCart', items: asked, openCart: openCart === true })
    })
  }
}

const onMessage = async (event) => {
  // Solo mensajes de esta misma ventana: nada de iframes ni de otros orígenes
  if (event.source !== window || event.origin !== window.location.origin) return
  // Esta copia es de antes de que la extensión se actualizara o se recargara con la pestaña abierta: sigue escuchando, pero ya
  // no llega al background y contestaría a todo con un error antes que la copia nueva. Se retira sin contestar.
  if (!chrome.runtime?.id) {
    stop()
    return
  }

  const request = event.data
  if (!request || request.source !== FROM_WEB || typeof request.id !== 'string' || typeof request.type !== 'string') return

  const handler = Object.hasOwn(handlers, request.type) ? handlers[request.type] : null
  if (!handler) {
    post({ id: request.id, ok: false, error: 'unknown-type' })
    return
  }

  try {
    post({ id: request.id, ok: true, ...(await handler(request)) })
  } catch (error) {
    post({ id: request.id, ok: false, error: 'failed' })
  }
}

const onStorageChanged = (changes, area) => {
  if (area !== 'local') return

  if (STORAGE_KEYS.snapshot in changes) {
    post({ event: 'hangarUpdated', exportedAt: changes[STORAGE_KEYS.snapshot].newValue?.exportedAt ?? null })
  }
  if (STORAGE_KEYS.autoSync in changes) {
    post({ event: 'autoSyncChanged', autoSync: changes[STORAGE_KEYS.autoSync].newValue === true })
  }
  if (GUIDE_KEY in changes) {
    post({ event: 'chainGuide', guide: guideSummary(changes[GUIDE_KEY].newValue ?? null) })
  }
}

function stop () {
  window.removeEventListener('message', onMessage)
  try { chrome.storage.onChanged.removeListener(onStorageChanged) } catch (error) { /* la extensión de esta copia ya no existe */ }
}

// El background inyecta este script en las pestañas de SC Tools que ya estaban abiertas al instalar o actualizar la extensión
// (ver background/index.js). Nunca responden dos a la vez: una copia de esta misma carga ya puesta en la página se quita aquí, y
// la de una versión anterior (Chrome la deja en otro mundo aislado, donde esto no llega) se retira sola al primer mensaje (onMessage).
try { globalThis.__guildswarmBridgeStop?.() } catch (error) { /* la copia anterior era de una versión que ya no existe */ }
window.addEventListener('message', onMessage)
chrome.storage.onChanged.addListener(onStorageChanged)
globalThis.__guildswarmBridgeStop = stop
