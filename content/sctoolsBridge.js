// Puente entre SC Tools y la extensión (se inyecta solo en los dominios de SC Tools, ver manifest.json).
//
// La web y este script hablan por window.postMessage. Contrato (protocol 1):
//
//   web → extensión   { source: 'guildswarm-sctools', id, type, ...datos }
//   extensión → web   { source: 'guildswarm-hangar-extension', protocol: 1, id, ok, ...datos }
//
//   type 'ping'         → { version, autoSync }
//   type 'getAutoSync'  → { autoSync }
//   type 'setAutoSync'  { enabled: boolean } → { autoSync }      (desactivarlo borra el hangar guardado)
//   type 'getHangar'    → { autoSync, snapshot }                 (snapshot: { exportedAt, file } | null)
//
//   La extensión avisa por su cuenta (sin id): { source, protocol: 1, event: 'hangarUpdated' | 'autoSyncChanged', ... }
//
// Si la extensión no está instalada nadie contesta: la web lo toma como "no instalada" tras su tiempo de espera.
// Este script NO reenvía nada al background: la web solo puede ejecutar estas cuatro operaciones y nunca las que
// leen RSI con las cookies del usuario.
import { STORAGE_KEYS, getAutoSync, setAutoSync, getSnapshot } from '../shared/autoSync.js'

const FROM_WEB = 'guildswarm-sctools'
const FROM_EXTENSION = 'guildswarm-hangar-extension'
const PROTOCOL = 1

const post = (message) => window.postMessage({ source: FROM_EXTENSION, protocol: PROTOCOL, ...message }, window.location.origin)

const handlers = {
  ping: async () => ({ version: chrome.runtime.getManifest().version, autoSync: await getAutoSync() }),
  getAutoSync: async () => ({ autoSync: await getAutoSync() }),
  setAutoSync: async ({ enabled }) => {
    if (typeof enabled !== 'boolean') throw new Error('invalid')
    await setAutoSync(enabled)
    return { autoSync: enabled }
  },
  getHangar: async () => {
    const autoSync = await getAutoSync()
    return { autoSync, snapshot: autoSync ? await getSnapshot() : null }
  }
}

const onMessage = async (event) => {
  // Solo mensajes de esta misma ventana: nada de iframes ni de otros orígenes
  if (event.source !== window || event.origin !== window.location.origin) return

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
}

// El background inyecta este script en las pestañas de SC Tools que ya estaban abiertas al instalar o actualizar la extensión
// (ver background/index.js). Si ya había una copia en la página, se quita antes de poner esta: nunca responden dos a la vez.
try { globalThis.__guildswarmBridgeStop?.() } catch (error) { /* la copia anterior era de una versión que ya no existe */ }
window.addEventListener('message', onMessage)
chrome.storage.onChanged.addListener(onStorageChanged)
globalThis.__guildswarmBridgeStop = () => {
  window.removeEventListener('message', onMessage)
  chrome.storage.onChanged.removeListener(onStorageChanged)
}
