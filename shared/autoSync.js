// Auto sync: el hangar exportado se guarda en la propia extensión (chrome.storage.local, solo en este navegador)
// y SC Tools lo lee desde ahí en vez de pedir un archivo. Lo usan el script de RSI y el puente de SC Tools.
//
// Claves: `autoSync` (boolean, desactivado por defecto) y `hangarSnapshot` ({ exportedAt, file }), donde `file` es
// exactamente el objeto que se descargaría como JSON ({ version, myHangar, myBuyBack }). `exportedAt` va aparte para
// no cambiar el formato del fichero.

export const STORAGE_KEYS = { autoSync: 'autoSync', snapshot: 'hangarSnapshot' }

export const getAutoSync = async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.autoSync)
  return stored[STORAGE_KEYS.autoSync] === true
}

// Desactivarlo borra lo guardado: nada se queda en la extensión si el usuario no quiere auto sync
export const setAutoSync = async (enabled) => {
  await chrome.storage.local.set({ [STORAGE_KEYS.autoSync]: enabled })
  if (!enabled) {
    await chrome.storage.local.remove(STORAGE_KEYS.snapshot)
  }
}

export const saveSnapshot = async (file) => {
  await chrome.storage.local.set({ [STORAGE_KEYS.snapshot]: { exportedAt: new Date().toISOString(), file } })
}

export const getSnapshot = async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.snapshot)
  return stored[STORAGE_KEYS.snapshot] ?? null
}
