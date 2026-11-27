// La guía para cerrar una escalera (background/closeChain.js), compartida por el background, el script de RSI (content/chainGuide.js) y el
// puente de SC Tools (content/sctoolsBridge.js). Se guarda en chrome.storage.local mientras dura y se borra al terminar o al salir.

export const GUIDE_KEY = 'chainGuide'
// La marca en la URL con la que la guía abre una página del hangar de RSI
export const GUIDE_MARK = '#gs-guide'

// Lo que sabe SC Tools de la guía: en qué paso va y cómo acabó, con los CCU y la base por su hash (el `id` del fichero), nunca un pledge id
export const guideSummary = (guide) => guide && {
  state: guide.state,
  current: guide.current,
  total: guide.steps.length,
  done: guide.steps.map((step) => step.done),
  steps: guide.steps.map((step) => step.hash),
  base: guide.base.hash,
  warning: guide.warning ?? null
}
