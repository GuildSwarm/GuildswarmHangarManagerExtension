// Cuando SC Tools abre un artículo en RSI (findPledge en background/findPledge.js), la URL lleva #gs-pledge=<hash>,
// donde <hash> es el SHA-256 del pledge id: el mismo `id` del fichero exportado. Aquí se busca ese artículo en la página,
// se baja hasta él y las abejas de GuildSwarm revolotean a su alrededor. Después se deja la vista normal del hangar para la próxima visita del usuario.
import { SWARM_DELAY_MS, swarmAround } from '../shared/bees.js'

const MARK = /^#gs-pledge=([0-9a-f]{64})$/
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
