import ky from 'ky'
import * as cheerio from 'cheerio'
import {
  hash,
  calculateElementPosition,
  normalizeImageSrc,
  baseUrlRsi,
  retryLimit,
  statusCodesRetry,
  categories,
  idNoCategory
} from './shared.js'

const fetchBuyBackCategory = async (category, actualPage) => {
  try {
    const response = await ky.get(baseUrlRsi + '/account/buy-back-pledges?page=' +
      actualPage +
      '&pagesize=100' +
      category.urlParameter,
    {
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

export const getBuyBackElementsCategory = async () => {
  const buyBackElementsCategory = []
  for (const category of categories) {
    let page = 1
    while (true) {
      const categoryData = await fetchBuyBackCategory(category, page)
      const $ = cheerio.load(categoryData)
      if (isEmptyList($)) break
      const linkElements = $('ul.pledges li article.pledge div.information a.holosmallbtn')
      if (!linkElements.length) break
      for (const linkElement of linkElements.toArray()) {
        const pledgeId = hash(parsePledgeId(linkElement))
        if (pledgeId) {
          buyBackElementsCategory.push({ pledgeId, categoryId: category.id })
        }
      }
      page++
    }
  }

  return buyBackElementsCategory
}

const isEmptyList = ($) => {
  return $('ul.pledges li.no-buy-backs').length > 0
}

export const getNumberOfPagesInBuyBack = async () => {
  const buyBackData = await fetchBuyBackPage(1)
  const $ = cheerio.load(buyBackData)
  if (isEmptyList($)) return 0

  const linkElementMaxPagesOfBuyBack = $('div.pager div.right a.raquo')
  if (linkElementMaxPagesOfBuyBack.length === 0) return 0

  const hrefLinkElementMaxPagesOfBuyBack = linkElementMaxPagesOfBuyBack.attr('href')
  const regex = /page=(.*?)&/g
  const maxPagesOfBuyBack = regex.exec(hrefLinkElementMaxPagesOfBuyBack)
  return maxPagesOfBuyBack === null ? 0 : maxPagesOfBuyBack[1]
}

export const fetchBuyBackPage = async (page) => {
  let response
  // if (page === 3 || page === 10 || page === 16) {
  //   response = await ky.get('https://httpstat.us/403', {
  //     retry: {
  //       limit: retryLimit,
  //       methods: ['get'],
  //       statusCodes: statusCodesRetry
  //     }
  //   })
  //   return response.text()
  // }
  //
  // if (page === 4) {
  //   response = await ky.get('https://httpstat.us/503', {
  //     retry: {
  //       limit: retryLimit,
  //       methods: ['get'],
  //       statusCodes: statusCodesRetry
  //     }
  //   })
  //   return response.text()
  // }
  //
  // if (page === 12) {
  //   response = await ky.get('https://httpstat.us/505', {
  //     retry: {
  //       limit: retryLimit,
  //       methods: ['get'],
  //       statusCodes: statusCodesRetry
  //     }
  //   })
  //   return response.text()
  // }

  response = await ky.get(`${baseUrlRsi}/account/buy-back-pledges?page=${page}&pagesize=10`, {
    retry: {
      limit: retryLimit,
      methods: ['get'],
      statusCodes: statusCodesRetry
    }
  })

  return response.text()
}

export const fetchBuyBackElement = async (pageElement) => {
  let response
  // if (pageElement === 156 || pageElement === 93 || pageElement === 24) {
  //   response = await ky.get('https://httpstat.us/403', {
  //     retry: {
  //       limit: retryLimit,
  //       methods: ['get'],
  //       statusCodes: statusCodesRetry
  //     }
  //   })
  //   return response.text()
  // }
  //
  // if (pageElement === 158) {
  //   response = await ky.get('https://httpstat.us/503', {
  //     retry: {
  //       limit: retryLimit,
  //       methods: ['get'],
  //       statusCodes: statusCodesRetry
  //     }
  //   })
  //   return response.text()
  // }
  //
  // if (pageElement === 25) {
  //   response = await ky.get('https://httpstat.us/505', {
  //     retry: {
  //       limit: retryLimit,
  //       methods: ['get'],
  //       statusCodes: statusCodesRetry
  //     }
  //   })
  //   return response.text()
  // }

  response = await ky.get(`${baseUrlRsi}/account/buy-back-pledges?page=${pageElement}&pagesize=1`, {
    retry: {
      limit: retryLimit,
      methods: ['get'],
      statusCodes: statusCodesRetry
    }
  })

  return response.text()
}

const fetchBuyBackPledge = async (buyBackLink) => {
  try {
    const response = await ky.get(buyBackLink,
      {
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

const normalizeBuyBackPrice = (price) => {
  return price / 100
}

export const getBuyBackPage = async (rsiToken, authToken, page) => {
  const buyBackData = await fetchBuyBackPage(page)
  return extractDataFromBuyBackData(rsiToken, authToken, page, buyBackData)
}

export const getBuyBackElement = async (rsiToken, authToken, page, elementPositionInPage) => {
  const pageElement = calculateElementPosition(page, elementPositionInPage)
  const buyBackData = await fetchBuyBackElement(pageElement)
  return extractDataFromBuyBackData(rsiToken, authToken, page, buyBackData, pageElement)
}

const extractDataFromBuyBackData = async (rsiToken, authToken, page, buyBackData, pageElement = null) => {
  const $ = cheerio.load(buyBackData)
  if (isEmptyList($)) return []

  const arrayLi = $('ul.pledges li article.pledge div.information')
  const results = []
  let index = 0
  for (const li of arrayLi.toArray()) {
    const name = $(li).find('div > h1').text()
    const image = normalizeImageSrc($(li).find('figure > img').attr('src'))
    const temporalData = $(li).find('div > dl > dd')
    const lastModification = temporalData[0]?.children[0]?.data?.trim()
    const contained = temporalData[2]?.children[0]?.data?.trim()

    let ccuInfo
    const ccuElement = $(li).find('a.holosmallbtn.js-open-ship-upgrades')
    if (ccuElement.length > 0) {
      ccuInfo = await parseCcuInfo(rsiToken, authToken, ccuElement)
    }

    const linkElement = $(li).find('div > a.holosmallbtn')
    const hrefElement = linkElement.attr('href')
    let elementData
    const available = $(li).parent().attr('data-disabled') === undefined
    if (ccuElement.length === 0 && available) {
      const buyBackLink = `${baseUrlRsi}${hrefElement}`
      elementData = await parseElementData(buyBackLink)
    }

    let category = idNoCategory
    if (ccuInfo) {
      category = 'upgrade'
    }

    const link = `${baseUrlRsi}/account/buy-back-pledges?page=${pageElement ?? calculateElementPosition(page, index)}&pagesize=1`
    const id = hash(parsePledgeId(linkElement[0]))

    const newElement = {
      id,
      name,
      image,
      lastModification,
      contained,
      ccuInfo,
      elementData,
      link,
      available,
      category
    }

    results.push(newElement)
    index++
  }

  return results
}

const parsePledgeId = (buyBackLinkElement) => {
  const dataPledgeId = buyBackLinkElement?.attribs['data-pledgeid']
  const href = buyBackLinkElement?.attribs?.href ?? ''
  return dataPledgeId ?? getPledgeIdFromElementData(href)
}

const parseCcuInfo = async (rsiToken, authToken, ccuElement) => {
  const ccuInfoPledgeId = ccuElement.attr('data-pledgeid')
  await fetchSetContextToken(rsiToken, ccuInfoPledgeId)
  const ccuInfoFromShipId = ccuElement.attr('data-fromshipid')
  const ccuInfoToSkuId = ccuElement.attr('data-toskuid')
  const shipUpgradeData = await getInitShipUpgrade(
    authToken,
    ccuInfoFromShipId,
    ccuInfoToSkuId
  )

  if ((shipUpgradeData[0].errors && shipUpgradeData[0].errors[0].extensions.code === 'INTERNAL_SERVER_ERROR') ||
    (shipUpgradeData[1].errors && shipUpgradeData[1].errors[0].extensions.code === 'INTERNAL_SERVER_ERROR')
  ) {
    return
  }

  const fromShipData = {
    id: shipUpgradeData[0].data.ships[0].id,
    name: shipUpgradeData[0].data.ships[0].name
  }
  const toShipData = {
    id: shipUpgradeData[0].data.ships[1].id,
    name: shipUpgradeData[0].data.ships[1].name
  }
  const price = normalizeBuyBackPrice(shipUpgradeData[1].data.price.nativeAmount)

  return {
    toSkuId: ccuInfoToSkuId,
    fromShipData,
    toShipData,
    price
  }
}

const parseElementData = async (buyBackLink) => {
  const buyBackPledgePage = await fetchBuyBackPledge(buyBackLink)
  const $ = cheerio.load(buyBackPledgePage)

  const shipInThisPackData = []
  const shipElements = $('div.package-listing.ship ul li.js-select-carousel-item').toArray()

  for (const shipElement of shipElements) {
    const image = normalizeImageSrc($(shipElement).find('img').attr('src'))
    const infoElements = $(shipElement).find('div')
    const name = $(infoElements[0]).find('span').text().trim()

    shipInThisPackData.push({
      image,
      name
    })
  }

  const alsoContainData = []
  const alsoContainElements = $('div.package-listing.item ul li.trans-02s').toArray()
  for (const shipElement of alsoContainElements) {
    alsoContainData.push($(shipElement).text().trim())
  }

  const priceInfo = $('div.wcontent div.lcol div.price strong.final-price')
  const price = normalizeBuyBackPrice(priceInfo.attr('data-value'))

  return {
    price,
    shipInThisPackData,
    alsoContainData
  }
}

const getPledgeIdFromElementData = (link) => {
  return link.split('/').slice(-1)[0]
}

const fetchSetContextToken = async (rsiToken, pledgeId) => {
  if (!rsiToken) {
    throw new Error('No se pudo obtener la cookie Rsi-Token.')
  }

  const myHeaders = new Headers()
  myHeaders.append('content-type', 'application/json')
  myHeaders.append('x-rsi-token', rsiToken)

  const raw = JSON.stringify({
    pledgeId
  })

  try {
    const response = await ky.post(baseUrlRsi + '/api/ship-upgrades/setContextToken', {
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

const getInitShipUpgrade = async (authToken, fromId, toId) => {
  const myHeaders = new Headers()
  myHeaders.append('content-type', 'application/json')
  myHeaders.append('x-csrf-token', authToken)

  const raw = JSON.stringify([
    {
      operationName: 'initShipUpgrade',
      variables: {},
      query:
        'query initShipUpgrade {\n ships {\n id\n name\n }\n }\n'
    },
    {
      operationName: 'getPrice',
      variables: { from: parseInt(fromId), to: parseInt(toId) },
      query:
        'query getPrice($from: Int!, $to: Int!) {\n price(from: $from, to: $to) {\n nativeAmount\n }\n}\n'
    }
  ])

  try {
    const response = await ky.post(baseUrlRsi + '/pledge-store/api/upgrade/graphql', {
      headers: myHeaders,
      body: raw,
      retry: {
        limit: retryLimit,
        methods: ['post'],
        statusCodes: statusCodesRetry
      }
    }).json()

    return response
  } catch (error) {
    throw new Error(`Error on request: ${error.message}`)
  }
}
