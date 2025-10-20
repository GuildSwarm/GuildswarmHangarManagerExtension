import ky from 'ky'
import { retryLimit, statusCodesRetry, baseUrlRsi } from './shared'

export const getCurrency = async () => {
  const pledgePage = await getPledgePage()
  const regex = /'currency':\s"(\w*)"/g
  const pledgePageData = regex.exec(pledgePage)
  return pledgePageData[1]
}

const getPledgePage = async () => {
  try {
    const response = await ky.get(`${baseUrlRsi}/en/pledge`, {
      retry: {
        limit: retryLimit,
        methods: ['get'],
        statusCodes: statusCodesRetry
      }
    })

    return response.text()
  } catch (error) {
    throw new Error(`Error on request: ${error.message}`)
  }
}

export const setCurrency = async (rsiToken, currency) => {
  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append('x-rsi-token', rsiToken)
  myHeaders.append('accept', 'application/json')

  const raw = JSON.stringify({ currency })

  try {
    const response = await ky.post(`${baseUrlRsi}/api/store/setCurrency`, {
      headers: myHeaders,
      body: raw,
      retry: {
        limit: retryLimit,
        methods: ['post'],
        statusCodes: statusCodesRetry
      }
    }).json()

    return response.success
  } catch (error) {
    throw new Error(`Error on request: ${error.message}`)
  }
}
