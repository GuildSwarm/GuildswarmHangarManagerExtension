import { getNumberOfPagesInHangar, getHangarPage, getHangarElement, getHangarElementsCategory } from './hangar.js'
import { getNumberOfPagesInBuyBack, getBuyBackPage, getBuyBackElement, getBuyBackElementsCategory } from './buyback.js'
import { setCurrency, getCurrency } from './currency'
import { findPledge, isPledgeHash, isProductType, resetHangarView } from './findPledge.js'
import { baseUrlRsi, globalCurrency, setAuthToken, t } from './shared'
import { addCcusToCart, parseCartItems } from './cart.js'
import { CART_PORT } from '../shared/cart.js'
import { checkGuide, clearGuide, getGuide, readRequest, startGuide, stepUrl } from './closeChain.js'
import { guideSummary } from '../shared/chainGuide.js'

const getCookie = async (cookieName, url) => {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url, name: cookieName }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('Error al obtener cookie:', chrome.runtime.lastError.message)
        reject(chrome.runtime.lastError.message)
      } else {
        resolve(cookie?.value || null)
      }
    })
  })
}

const handleGetCurrency = async () => {
  try {
    const currency = await getCurrency()
    return { currency }
  } catch (error) {
    throw new Error(error.message || t('errorUnknown'))
  }
}

const handleSetCurrency = async (currency) => {
  try {
    const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
    if (!rsiToken) {
      throw new Error(t('errorRsiTokenCookie'))
    }
    await setCurrency(rsiToken, currency)
    return { currency }
  } catch (error) {
    throw new Error(error.message || t('errorUnknown'))
  }
}

const handleGetNumberOfPagesInHangar = async () => {
  try {
    const numberOfPagesInHangar = await getNumberOfPagesInHangar()
    return { numberOfPagesInHangar }
  } catch (error) {
    throw new Error(error.message || t('errorUnknown'))
  }
}

const handleGetHangarPage = async (page) => {
  try {
    const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
    if (!rsiToken) {
      throw new Error(t('errorRsiTokenCookie'))
    }
    const hangarData = await getHangarPage(rsiToken, page)
    return { page, hangarData }
  } catch (error) {
    throw new Error(error.message || t('errorUnknown'))
  }
}

const handleGetHangarElement = async (page, elementPositionInPage) => {
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) {
    throw new Error(t('errorRsiTokenCookie'))
  }
  const hangarData = await getHangarElement(rsiToken, page, elementPositionInPage)
  return { page, hangarData }
}

const handleGetHangarCategories = async () => {
  try {
    const hangarElementsCategory = await getHangarElementsCategory()
    return { hangarElementsCategory }
  } catch (error) {
    throw new Error(error.message || t('errorUnknown'))
  }
}

const handleGetNumberOfPagesInBuyBack = async () => {
  try {
    const numberOfPagesInBuyBack = await getNumberOfPagesInBuyBack()
    return { numberOfPagesInBuyBack }
  } catch (error) {
    throw new Error(error.message || t('errorUnknown'))
  }
}

const handleGetBuyBackPage = async (page) => {
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) {
    throw new Error(t('errorRsiTokenCookie'))
  }
  const authToken = await setAuthToken(rsiToken)
  if (!authToken) {
    throw new Error(t('errorRsiAuthToken'))
  }
  const buyBackData = await getBuyBackPage(rsiToken, authToken, page)
  return { page, buyBackData }
}

const handleGetBuyBackElement = async (page, elementPositionInPage) => {
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) {
    throw new Error(t('errorRsiTokenCookie'))
  }
  const authToken = await setAuthToken(rsiToken)
  if (!authToken) {
    throw new Error(t('errorRsiAuthToken'))
  }
  const buyBackData = await getBuyBackElement(rsiToken, authToken, page, elementPositionInPage)
  return { page, buyBackData }
}

const handleGetBuyBackCategories = async () => {
  try {
    const buyBackElementsCategory = await getBuyBackElementsCategory()
    return { buyBackElementsCategory }
  } catch (error) {
    throw new Error(error.message || t('errorUnknown'))
  }
}

// SC Tools pide "búscame este artículo" (por el puente, content/sctoolsBridge.js). Si está, se abre su página de RSI en una
// pestaña nueva y el script de RSI (content/pledgeFocus.js) baja hasta él. A la web solo vuelve si se ha encontrado o no.
const handleFindPledge = async (pledgeHash, productType) => {
  if (!isPledgeHash(pledgeHash)) throw new Error('invalid')
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) return { found: false, reason: 'signed-out' }

  try {
    const where = await findPledge(pledgeHash, isProductType(productType) ? productType : null)
    if (!where) return { found: false, reason: 'not-found' }
    await chrome.tabs.create({ url: `${where.url}#gs-pledge=${pledgeHash}` })
    return { found: true }
  } finally {
    await resetHangarView().catch((error) => console.warn('No se pudo dejar la vista normal del hangar:', error))
  }
}

const handleResetHangarView = async () => {
  await resetHangarView()
  return { reset: true }
}

// Cerrar una escalera (background/closeChain.js). SC Tools la pide por el puente; si todo sigue en el hangar, se abre RSI en el CCU del primer
// paso, junto a la pestaña de SC Tools, y a partir de ahí guía el script de RSI (content/chainGuide.js). A SC Tools solo vuelve si empezó o qué falta.
const handleCloseChain = async (message, sender) => {
  const request = readRequest(message.chain)
  if (!request) return { error: 'invalid' }
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) return { error: 'signed-out' }
  try {
    const outcome = await startGuide(request)
    if (outcome.error) return { error: outcome.error, missing: outcome.missing, base: outcome.base }
    const from = sender?.tab
    await chrome.tabs.create({ url: outcome.url, ...(from ? { windowId: from.windowId, index: from.index + 1, openerTabId: from.id } : {}) })
    return { started: true, guide: guideSummary(outcome.guide) }
  } catch (error) {
    console.error('Error al empezar a cerrar la escalera:', error)
    return { error: 'failed' }
  } finally {
    await resetHangarView().catch((error) => console.warn('No se pudo dejar la vista normal del hangar:', error))
  }
}

// El script de RSI pregunta cómo va el paso actual (al cargar la página, al cerrarse la ventana de RSI o al pulsar «Ya lo he aplicado»)
const handleGuideCheck = async () => {
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) return { error: 'signed-out', guide: await getGuide() }
  return { guide: await checkGuide(rsiToken) }
}

// La página del hangar donde está ahora el CCU del paso actual
const handleGuideLocate = async () => {
  const guide = await getGuide()
  if (!guide || guide.state !== 'guiding') return { url: null }
  try {
    return { url: await stepUrl(guide.steps[guide.current]) }
  } finally {
    await resetHangarView().catch((error) => console.warn('No se pudo dejar la vista normal del hangar:', error))
  }
}

const handlers = {
  handleCloseChain,
  handleGuideCheck,
  handleGuideLocate,
  handleGuideSummary: async () => ({ guide: guideSummary(await getGuide()) }),
  handleGuideEnd: async () => { await clearGuide(); return { ended: true } },
  handleGetCurrency,
  handleSetCurrency: (message) => handleSetCurrency(message.currency || globalCurrency),
  handleGetNumberOfPagesInHangar,
  handleGetHangarPage: (message) => handleGetHangarPage(message.page || 1),
  handleGetHangarElement: (message) => handleGetHangarElement(message.page || 1, message.elementPositionInPage || 0),
  handleGetHangarCategories,
  handleGetNumberOfPagesInBuyBack,
  handleGetBuyBackPage: (message) => handleGetBuyBackPage(message.page || 1),
  handleGetBuyBackElement: (message) => handleGetBuyBackElement(message.page || 1, message.elementPositionInPage || 0),
  handleGetBuyBackCategories,
  handleFindPledge: (message) => handleFindPledge(message.pledgeHash, message.productType),
  handleResetHangarView
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (typeof message.type !== 'string') {
    console.warn(`Tipo de mensaje inválido: ${message.type}`)
    sendResponse({ error: `Tipo de mensaje inválido: ${message.type}` })
    return
  }

  const handler = handlers[message.type]

  if (handler) {
    Promise.resolve(handler(message, sender))
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error(`Error en onMessage ${message.type}:`, error)
        sendResponse({ error: true, message: error.message })
      })

    return true
  }

  console.warn(`Tipo de mensaje no soportado: ${message.type}`, { message, sender })
  sendResponse({ error: `Tipo de mensaje no soportado: ${message.type}` })
})

// SC Tools pide meter en la cesta de RSI los CCU que le faltan a una escalera (content/sctoolsBridge.js, ver background/cart.js).
// Solo se acepta el puerto de un script de esta misma extensión en una pestaña (el puente): una página no puede abrirlo.
// A la página solo vuelve si cada CCU ha entrado o por qué no, y si se le abrió la cesta.
// Con lo pedido ya en la cesta, se abre la cesta de RSI en una pestaña junto a la de SC Tools; si ya hay una abierta, se trae delante y
// se recarga para que enseñe lo nuevo (no se amontonan pestañas). La abre la extensión porque la página no puede: Chrome solo deja abrir
// pestañas en el momento del clic, y añadir tarda unos segundos. La dirección es siempre esta: la página solo pide que se abra.
const RSI_CART_URL = `${baseUrlRsi}/en/store/pledge/cart`

const openRsiCart = async (fromTab) => {
  try {
    const [open] = await chrome.tabs.query({ url: `${baseUrlRsi}/*store/pledge/cart*` })
    if (open) {
      await chrome.tabs.update(open.id, { active: true })
      await chrome.windows.update(open.windowId, { focused: true })
      await chrome.tabs.reload(open.id)
    } else {
      await chrome.tabs.create({ url: RSI_CART_URL, windowId: fromTab.windowId, index: fromTab.index + 1, openerTabId: fromTab.id })
    }
    return true
  } catch (error) {
    console.warn('No se pudo abrir la cesta de RSI:', error)
    return false
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== CART_PORT || port.sender?.id !== chrome.runtime.id || !port.sender?.tab) return
  let gone = false
  port.onDisconnect.addListener(() => { gone = true })
  const tell = (message) => { if (!gone) port.postMessage(message) }

  port.onMessage.addListener(async (message) => {
    if (message?.type !== 'addToCart') return
    const items = parseCartItems(message.items)
    if (!items) {
      tell({ type: 'done', error: 'invalid' })
      return
    }
    try {
      const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
      const outcome = await addCcusToCart(rsiToken, items, (result) => tell({ type: 'item', result }), () => gone)
      const cartOpened = message.openCart === true && !gone && !!outcome.results?.some((result) => result.ok) && await openRsiCart(port.sender.tab)
      tell({ type: 'done', ...outcome, cartOpened })
    } catch (error) {
      console.error('Error al añadir CCU a la cesta de RSI:', error)
      tell({ type: 'done', error: 'failed' })
    }
  })
})

// Chrome solo inyecta los content scripts en las pestañas que se abren después de instalar la extensión. Para que SC Tools
// la detecte sin recargar, se inyecta el puente en las pestañas de SC Tools que ya estaban abiertas (al instalar y al actualizar).
const BRIDGE_FILE = 'content/sctoolsBridge.js'

const injectBridgeInOpenTabs = async () => {
  const bridge = chrome.runtime.getManifest().content_scripts.find((script) => script.js.includes(BRIDGE_FILE))
  const tabs = await chrome.tabs.query({ url: bridge.matches })
  await Promise.allSettled(tabs.map((tab) => chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [BRIDGE_FILE] })))
}

chrome.runtime.onInstalled.addListener(() => {
  injectBridgeInOpenTabs().catch((error) => console.warn('No se pudo inyectar el puente en las pestañas abiertas:', error))
})
