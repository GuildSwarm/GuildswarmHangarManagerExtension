import CryptoJS from 'crypto-js'
import ky from 'ky'

export const baseUrlRsi = 'https://robertsspaceindustries.com'
export const retryLimit = 5
export const statusCodesRetry = [404, 408, 413, 429, 500, 502, 503, 504]
export const categories = [
  {
    id: 'game_package',
    name: 'Game Packages',
    urlParameter: '&product-type=game_package'
  },
  {
    id: 'standalone_ship',
    name: 'Standalone Ships',
    urlParameter: '&product-type=standalone_ship'
  },
  {
    id: 'upgrade',
    name: 'Upgrades',
    urlParameter: '&product-type=upgrade'
  },
  {
    id: 'hangar_decoration',
    name: 'Hangar Decorations',
    urlParameter: '&product-type=hangar_decoration'
  },
  {
    id: 'components',
    name: 'Component',
    urlParameter: '&product-type=components'
  },
  {
    id: 'weapon',
    name: 'Weapon',
    urlParameter: '&product-type=weapon'
  },
  {
    id: 'flair',
    name: 'Subscriber Flair',
    urlParameter: '&product-type=flair'
  }
]

export const hash = (string) => {
  return CryptoJS.SHA256(string).toString(CryptoJS.enc.Hex)
}

export const setAuthToken = async (authToken) => {
  if (!authToken) {
    throw new Error('No se pudo obtener el authToken.')
  }

  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'text/plain')
  myHeaders.append('x-rsi-token', authToken)
  myHeaders.append('accept', 'application/json')

  const raw = '{}'

  try {
    const response = await ky.post(baseUrlRsi + '/api/account/v2/setAuthToken', {
      headers: myHeaders,
      body: raw,
      retry: {
        limit: retryLimit,
        methods: ['post'],
        statusCodes: statusCodesRetry
      }
    }).json()

    return response.data
  } catch (error) {
    throw new Error(`Error on request: ${error.message}`)
  }
}

export const calculateElementPosition = (page, index) => {
  return ((page - 1) * 10 + (index + 1))
}
