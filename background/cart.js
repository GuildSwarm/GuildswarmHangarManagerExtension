import { baseUrlRsi } from './shared.js'
import { MAX_CART_ITEMS } from '../shared/cart.js'

// Meter en la cesta de RSI los CCU que SC Tools pide (los que le faltan a una escalera).
//
// Cómo lo hace la propia tienda de RSI con un CCU de la tienda (comprobado por FleetYards en noviembre de 2026, docs/findings/rsi-cart.md
// de su repositorio; esto está escrito aparte, sin su código):
//   1. POST /api/ship-upgrades/setContextToken  { fromShipId, toShipId, toSkuId, pledgeId: null }   (pledgeId solo en una recompra)
//   2. POST /pledge-store/api/upgrade/v2/graphql  mutation addToCart(from, to) → { jwt }              (from: id de la nave, to: SKU del CCU)
//   3. POST /api/store/v2/cart/token  { jwt }                                                            (el JWT caduca a los 30 segundos)
// Todas llevan la cookie de sesión, la cabecera X-Rsi-Token y la X-CSRF-TOKEN que trae cualquier página de la tienda en
// <meta name="csrf-token">. RSI contesta las negativas con un 200: el motivo va en `errors` (GraphQL) o en `success: 0` (REST).
//
// Uno a uno: así cada CCU tiene su respuesta y uno que RSI ya no vende no tumba los demás.

// Los ids de RSI son números; el id del CCU es la clave del salto en SC Tools ("store:7:8:13746")
const RSI_ID = /^\d{1,12}$/
const ITEM_ID = /^[\w:.-]{1,96}$/

const rsiId = (value) => ((typeof value === 'number' || typeof value === 'string') && RSI_ID.test(String(value)) ? Number(value) : null)

// Lo que llega de la página, comprobado campo a campo. Cualquier cosa rara invalida la lista entera (null): la página no
// decide nada más que qué CCU, por sus ids.
export const parseCartItems = (value) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CART_ITEMS) return null
  const items = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null
    const fromShipId = rsiId(raw.fromShipId)
    const toShipId = rsiId(raw.toShipId)
    const toSkuId = rsiId(raw.toSkuId)
    if (typeof raw.id !== 'string' || !ITEM_ID.test(raw.id) || !fromShipId || !toShipId || !toSkuId) return null
    items.push({ id: raw.id, fromShipId, toShipId, toSkuId })
  }
  return items
}

export const csrfFrom = (html) => {
  const tag = String(html).match(/<meta\b[^>]*\bname=["']csrf-token["'][^>]*>/i)?.[0]
  return tag?.match(/\bcontent=["']([^"']+)["']/i)?.[1] ?? null
}

const send = (path, body, rsiToken, csrf) => fetch(baseUrlRsi + path, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'content-type': 'application/json',
    accept: 'application/json',
    'x-rsi-token': rsiToken,
    ...(csrf ? { 'x-csrf-token': csrf } : {})
  },
  body: JSON.stringify(body)
})

const json = (response) => response.json().catch(() => null)
const first = (body) => (Array.isArray(body) ? body[0] : body)

// unavailable: RSI no vende ese CCU ahora (se acabó el Warbond, la nave salió de la tienda…) · failed: cualquier otra cosa
const graphqlRefusal = (body) => {
  const error = first(body)?.errors?.[0]
  if (!error) return null
  const code = error.code ?? error.extensions?.code
  return code === 'TyCartValidationException' || /not available/i.test(error.message ?? '') ? 'unavailable' : 'failed'
}
const restRefusal = (body) => (body && body.success === 0 ? 'failed' : null)

// ¿Hay alguien con sesión en RSI en este navegador? La cookie Rsi-Token también la tiene quien solo visita la web.
export const signedIn = async (rsiToken) => {
  const response = await send('/api/spectrum/auth/identify', {}, rsiToken)
  if (!response.ok) return false
  return !!first(await json(response))?.data?.member?.nickname
}

const readCsrf = async (rsiToken) => {
  const response = await fetch(`${baseUrlRsi}/en/store/pledge/cart`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'text/html', 'x-rsi-token': rsiToken }
  })
  return response.ok ? csrfFrom(await response.text()) : null
}

const addOne = async (rsiToken, csrf, { fromShipId, toShipId, toSkuId }) => {
  const context = await send('/api/ship-upgrades/setContextToken', { fromShipId, toShipId, toSkuId, pledgeId: null }, rsiToken, csrf)
  if (!context.ok) return 'failed'
  const contextRefusal = restRefusal(await json(context))
  if (contextRefusal) return contextRefusal

  const created = await send('/pledge-store/api/upgrade/v2/graphql', [{
    operationName: 'addToCart',
    variables: { from: fromShipId, to: toSkuId },
    query: 'mutation addToCart($from: Int!, $to: Int!) { addToCart(from: $from, to: $to) { jwt } }'
  }], rsiToken, csrf)
  if (!created.ok) return 'failed'
  const body = await json(created)
  const refusal = graphqlRefusal(body)
  if (refusal) return refusal
  const jwt = first(body)?.data?.addToCart?.jwt
  if (typeof jwt !== 'string' || !jwt) return 'failed'

  const redeemed = await send('/api/store/v2/cart/token', { jwt }, rsiToken, csrf)
  if (!redeemed.ok) return 'failed'
  return restRefusal(await json(redeemed))
}

// Devuelve { error } si no se puede ni empezar ('signed-out' | 'store'), o { results: [{ id, ok, reason }] }.
// `onItem` recibe cada resultado según llega, para que la página vaya marcando los CCU; `stopped` corta la lista si la
// página ya no escucha (se cerró la pestaña).
export const addCcusToCart = async (rsiToken, items, onItem = () => {}, stopped = () => false) => {
  if (!rsiToken || !(await signedIn(rsiToken))) return { error: 'signed-out' }
  const csrf = await readCsrf(rsiToken)
  if (!csrf) return { error: 'store' }

  const results = []
  for (const item of items) {
    if (stopped()) break
    let reason
    try {
      reason = await addOne(rsiToken, csrf, item)
    } catch (error) {
      console.warn('No se pudo añadir un CCU a la cesta:', error)
      reason = 'failed'
    }
    const result = reason ? { id: item.id, ok: false, reason } : { id: item.id, ok: true, reason: null }
    results.push(result)
    onItem(result)
  }
  return { results }
}
