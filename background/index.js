import { getNumberOfPagesInHangar, getHangarPage, getHangarElementsCategory } from './hangar.js'
import { getNumberOfPagesInBuyBack, getBuyBackPage, getBuyBackElement, getBuyBackElementsCategory } from './buyback.js'
import { baseUrlRsi, globalCurrency, setAuthToken } from './shared'
import { setCurrency, getCurrency } from './currency'

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
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

const handleSetCurrency = async (currency) => {
  try {
    const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
    if (!rsiToken) {
      throw new Error('No se pudo obtener la cookie Rsi-Token.')
    }
    await setCurrency(rsiToken, currency)
    return { currency }
  } catch (error) {
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

const handleGetNumberOfPagesInHangar = async () => {
  try {
    const numberOfPagesInHangar = await getNumberOfPagesInHangar()
    return { numberOfPagesInHangar }
  } catch (error) {
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

const handleGetHangarPage = async (page) => {
  try {
    const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
    if (!rsiToken) {
      throw new Error('No se pudo obtener la cookie Rsi-Token.')
    }
    const hangarData = await getHangarPage(rsiToken, page)
    return { page, hangarData }
  } catch (error) {
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

const handleGetHangarCategories = async () => {
  try {
    const hangarElementsCategory = await getHangarElementsCategory()
    return { hangarElementsCategory }
  } catch (error) {
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

const handleGetNumberOfPagesInBuyBack = async () => {
  try {
    const numberOfPagesInBuyBack = await getNumberOfPagesInBuyBack()
    return { numberOfPagesInBuyBack }
  } catch (error) {
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

const handleGetBuyBackPage = async (page) => {
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) {
    throw new Error('No se pudo obtener la cookie Rsi-Token.')
  }
  const authToken = await setAuthToken(rsiToken)
  if (!authToken) {
    throw new Error('No se pudo obtener la authToken de RSI.')
  }
  const buyBackData = await getBuyBackPage(rsiToken, authToken, page)
  return { page, buyBackData }
}

const handleGetBuyBackElement = async (page, elementPositionInPage) => {
  const rsiToken = await getCookie('Rsi-Token', baseUrlRsi)
  if (!rsiToken) {
    throw new Error('No se pudo obtener la cookie Rsi-Token.')
  }
  const authToken = await setAuthToken(rsiToken)
  if (!authToken) {
    throw new Error('No se pudo obtener la authToken de RSI.')
  }
  const buyBackData = await getBuyBackElement(rsiToken, authToken, page, elementPositionInPage)
  return { page, buyBackData }
}

const handleGetBuyBackCategories = async () => {
  try {
    const buyBackElementsCategory = await getBuyBackElementsCategory()
    return { buyBackElementsCategory }
  } catch (error) {
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getNumberOfPagesInHangar') {
    handleGetNumberOfPagesInHangar()
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage getNumberOfPagesInHangar:', error)
        sendResponse(error.message)
      })

    return true
  }

  if (message.type === 'getHangarPage') {
    const page = message.page || 1
    handleGetHangarPage(page)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage getHangarPage:', error)
        sendResponse({ error: true, message: error.message })
      })

    return true
  }

  if (message.type === 'getHangarCategories') {
    handleGetHangarCategories()
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage getHangarCategories:', error)
        sendResponse(error.message)
      })

    return true
  }

  if (message.type === 'getNumberOfPagesInBuyBack') {
    handleGetNumberOfPagesInBuyBack()
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage getNumberOfPagesInBuyBack:', error)
        sendResponse(error.message)
      })

    return true
  }

  if (message.type === 'getBuyBackPage') {
    const page = message.page || 1
    handleGetBuyBackPage(page)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        if (error.message.toLowerCase().startsWith('request failed with status code 403')) {
          sendResponse({ error: true, status: 403, message: error.message })
        }

        sendResponse({ error: true, message: error.message })
      })

    return true
  }

  if (message.type === 'getBuyBackElement') {
    const page = message.page || 1
    const elementPositionInPage = message.elementPositionInPage || 0
    handleGetBuyBackElement(page, elementPositionInPage)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        if (error.message.toLowerCase().startsWith('request failed with status code 403')) {
          sendResponse({ error: true, status: 403, message: error.message })
        }

        sendResponse({ error: true, message: error.message })
      })

    return true
  }

  if (message.type === 'getBuyBackCategories') {
    handleGetBuyBackCategories()
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage getBuyBackCategories:', error)
        sendResponse(error.message)
      })

    return true
  }

  if (message.type === 'getCurrency') {
    handleGetCurrency()
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage getCurrency:', error)
        sendResponse(error.message)
      })

    return true
  }

  if (message.type === 'setCurrency') {
    const currency = message.currency || globalCurrency
    handleSetCurrency(currency)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage setCurrency:', error)
        sendResponse(error.message)
      })

    return true
  }

  sendResponse({ error: 'Tipo de mensaje no soportado en onMessage.' })
})

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'getHangarData') {
    const page = message.page || 1

    handleGetHangarPage(page)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessageExternal getHangarData:', error)
        sendResponse(error.message)
      })

    return true
  }

  sendResponse({ error: 'Tipo de mensaje no soportado en onMessageExternal.' })
})
