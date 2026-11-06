import { getNumberOfPagesInHangar, getHangarPage, getHangarElement, getHangarElementsCategory } from './hangar.js'
import { getNumberOfPagesInBuyBack, getBuyBackPage, getBuyBackElement, getBuyBackElementsCategory } from './buyback.js'
import { setCurrency, getCurrency } from './currency'
import { findPledge, isPledgeHash, isProductType, resetHangarView } from './findPledge.js'
import { baseUrlRsi, globalCurrency, setAuthToken, t } from './shared'

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

const handlers = {
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
    Promise.resolve(handler(message))
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
