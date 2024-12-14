import { getHangarPage } from './hangar.js'

const getCookie = async (cookieName, url) => {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url, name: cookieName }, (cookie) => {
      if (chrome.runtime.lastError) {
        console.error('Error al obtener cookie:', chrome.runtime.lastError.message)
        reject(chrome.runtime.lastError.message)
      } else {
        console.log('Cookie obtenida:', cookie?.value)
        resolve(cookie?.value || null)
      }
    })
  })
}

const handleGetHangarData = async (page) => {
  const url = 'https://robertsspaceindustries.com'

  try {
    // Obtener la cookie
    const rsiToken = await getCookie('Rsi-Token', url)
    if (!rsiToken) {
      throw new Error('No se pudo obtener la cookie Rsi-Token.')
    }

    // Obtener los datos del hangar
    const hangarData = await getHangarPage(rsiToken, page)

    // Devolver los datos obtenidos
    return { page, hangarData }
  } catch (error) {
    // Lanza el error para manejarlo en los listeners
    throw new Error(error.message || 'Error desconocido al obtener datos del hangar.')
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getHangarData') {
    const page = message.page || 1

    handleGetHangarData(page)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessage:', error)
        sendResponse({ error: error.message })
      })

    return true // Indica que se enviará la respuesta de forma asincrónica
  }

  sendResponse({ error: 'Tipo de mensaje no soportado en onMessage.' })
})

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'getHangarData') {
    const page = message.page || 1

    handleGetHangarData(page)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Error en onMessageExternal:', error)
        sendResponse({ error: error.message })
      })

    return true // Indica que se enviará la respuesta de forma asincrónica
  }

  sendResponse({ error: 'Tipo de mensaje no soportado en onMessageExternal.' })
})
