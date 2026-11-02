import { getNumberOfPagesInHangar, getHangarPage, getHangarElement, getHangarElementsCategory } from './hangar.js'
import { getNumberOfPagesInBuyBack, getBuyBackPage, getBuyBackElement, getBuyBackElementsCategory } from './buyback.js'
import { setCurrency, getCurrency } from './currency'
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
  handleGetBuyBackCategories
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

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
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
