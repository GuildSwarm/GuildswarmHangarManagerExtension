import { readCsrf, send, signedIn } from './cart.js'

// Qué CCU vende RSI ahora desde cada nave (Fabio, 2026-11-27: al meter una escalera en la cesta, RSI rechazó varios CCU que SC Tools daba por
// comprables; la escalera tiene que enseñarlos en rojo antes). Que una nave tenga un CCU a la venta no quiere decir que se venda desde cualquier
// otra, ni que el Warbond de ese día siga: lo sabe la herramienta de CCU de RSI, que para una nave de origen lista las naves de destino y los SKU
// que vende ahora. Es la misma consulta que hace esa herramienta (filterShips con fromId) y necesita una cuenta con sesión, así que va por aquí.
// Solo lee: no toca la cesta.

const RSI_ID = /^\d{1,12}$/
// Una escalera larga tiene pocas naves de origen distintas; más allá de esto la lista está mal formada
const MAX_SHIPS = 40

const QUERY = `query filterShips($fromId: Int, $toFilters: [FilterConstraintValues]) {
  to(from: $fromId, filters: $toFilters) {
    ships { id skus { id } }
  }
}`

// Lo que llega de la página: los ids de las naves de origen, sin repetir
export const parseShipIds = (value) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SHIPS) return null
  const ids = [...new Set(value.map(String))]
  return ids.every((id) => RSI_ID.test(id)) ? ids.map(Number) : null
}

// Las naves a las que RSI vende ahora un CCU desde esta, cada una con sus SKU de CCU ([{ id, skus }]), o null si no contestó como se esperaba
const availableFrom = async (rsiToken, csrf, fromShipId) => {
  const response = await send('/pledge-store/api/upgrade/v2/graphql', [{
    operationName: 'filterShips',
    variables: { fromId: fromShipId, toFilters: [] },
    query: QUERY
  }], rsiToken, csrf)
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  const ships = (Array.isArray(body) ? body[0] : body)?.data?.to?.ships
  if (!Array.isArray(ships)) return null
  return ships
    .filter((ship) => RSI_ID.test(String(ship?.id ?? '')))
    .map((ship) => ({
      id: String(ship.id),
      skus: (Array.isArray(ship.skus) ? ship.skus : []).map((sku) => String(sku?.id ?? '')).filter((id) => RSI_ID.test(id))
    }))
}

// Devuelve { error: 'signed-out' | 'store' } o { ships: [{ id, to: [{ id, skus }] | null }], checkedAt } (to null: RSI no contestó para esa nave)
export const checkUpgrades = async (rsiToken, shipIds) => {
  if (!rsiToken || !(await signedIn(rsiToken))) return { error: 'signed-out' }
  const csrf = await readCsrf(rsiToken)
  if (!csrf) return { error: 'store' }
  const ships = []
  for (const id of shipIds) {
    let to = null
    try {
      to = await availableFrom(rsiToken, csrf, id)
    } catch (error) {
      console.warn(`No se pudo preguntar a RSI por los CCU desde la nave ${id}:`, error)
    }
    ships.push({ id, to })
  }
  return { ships, checkedAt: new Date().toISOString() }
}
