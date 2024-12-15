import { getHangarPage, getHangarElementsCategory } from './hangar.js'
import { getBuyBackElementsCategory } from './buyback.js'

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

const handleGetHangarPage = async (page) => {
  const url = 'https://robertsspaceindustries.com'
  try {
    const rsiToken = await getCookie('Rsi-Token', url)
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

const handleGetBuyBackCategories = async () => {
  try {
    const buyBackElementsCategory = await getBuyBackElementsCategory()
    return { buyBackElementsCategory }
  } catch (error) {
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getHangarPage') {
    const page = message.page || 1
    handleGetHangarPage(page)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage:', error)
        sendResponse({ error: error.message })
      })

    return true
  }

  if (message.type === 'getHangarCategories') {
    handleGetHangarCategories()
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage:', error)
        sendResponse({ error: error.message })
      })

    return true
  }

  if (message.type === 'getBuyBackCategories') {
    handleGetBuyBackCategories()
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage:', error)
        sendResponse({ error: error.message })
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
        console.error('Error en onMessageExternal:', error)
        sendResponse({ error: error.message })
      })

    return true
  }

  sendResponse({ error: 'Tipo de mensaje no soportado en onMessageExternal.' })
})
