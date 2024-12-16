import ky from 'ky'
import * as cheerio from 'cheerio'
import { hash, calculateElementPosition, baseUrlRsi, retryLimit, statusCodesRetry, categories } from './shared.js'

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
      const pledgeIdElements = $('ul.pledges li article.pledge div.information a.holosmallbtn')
      if (!pledgeIdElements.length) break
      for (const pledgeIdElement of pledgeIdElements.toArray()) {
        const href = pledgeIdElement.attribs.href || ''
        const dataPledgeId = pledgeIdElement.attribs['data-pledgeid']
        const pledgeId = dataPledgeId || href.split('/').slice(-1)[0]
        if (pledgeId) {
          buyBackElementsCategory.push({ pledgeId: hash(pledgeId), category })
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

export const fetchBuyBackPage = async (page) => {
  try {
    const response = await ky.get(baseUrlRsi + '/account/buy-back-pledges?page=' + page + '&pagesize=10', {
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

const normalizeImageSrc = (src) => {
  return src.startsWith('/media') ? baseUrlRsi + src : src
}

const normalizeBuyBackPrice = (price) => {
  return price / 100
}

export const getBuyBackPage = async (rsiToken, authToken, page) => {
  const buyBackData = await fetchBuyBackPage(page)
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
    const link = `${baseUrlRsi}/account/buy-back-pledges?page=${calculateElementPosition(page, index)}&pagesize=1`

    let elementData
    const available = $(li).parent().attr('data-disabled') === undefined
    if (ccuElement.length === 0 && available) {
      const buyBackLink = `${baseUrlRsi}${hrefElement}`
      elementData = await parseElementData(buyBackLink)
    }

    let category
    if (linkElement.attr('data-pledgeid')) {
      category = {
        id: 'upgrade',
        name: 'Upgrades'
      }
    }

    const newElement = {
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

const parseCcuInfo = async (rsiToken, authToken, ccuElement) => {
  const ccuInfoPledgeId = ccuElement.attr('data-pledgeid')
  await fetchSetContextToken(rsiToken, ccuInfoPledgeId)
  const ccuInfoFromShipId = ccuElement.attr('data-fromshipid')
  const ccuInfoToShipId = ccuElement.attr('data-toshipid')
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

  return {
    pledgeId: hash(ccuInfoPledgeId),
    fromShipId: ccuInfoFromShipId,
    toShipId: ccuInfoToShipId,
    toSkuId: ccuInfoToSkuId,
    fromShipData: shipUpgradeData[0].data.ships[0],
    toShipData: shipUpgradeData[0].data.ships[1],
    price: shipUpgradeData[1]
  }
}

const parseElementData = async (buyBackLink) => {
  const buyBackPledgePage = await fetchBuyBackPledge(buyBackLink)
  const $ = cheerio.load(buyBackPledgePage)

  const shipInThisPackData = []
  const shipElements = $('div.package-listing.ship ul li.js-select-carousel-item').toArray()

  for (const shipElement of shipElements) {
    const image = normalizeImageSrc($(shipElement).find('img').attr('src'))
    const link = baseUrlRsi + $(shipElement).find('a').attr('href')

    const infoElements = $(shipElement).find('div')
    const name = $(infoElements[0]).find('span').text().trim()
    const manufacturer = $(infoElements[1]).find('span').text().trim()
    const focus = $(infoElements[2]).find('span').text().trim()

    shipInThisPackData.push({
      image,
      name,
      manufacturer,
      focus,
      link
    })
  }

  const alsoContainData = []
  const alsoContainElements = $('div.package-listing.item ul li.trans-02s').toArray()
  for (const shipElement of alsoContainElements) {
    alsoContainData.push($(shipElement).text().trim())
  }

  const pledgeId = hash(buyBackLink.replace(/[a-zA-Z/]/g, ''))
  const image = $('div.wcontent div.lcol img').attr('src')
  const title = $('h2.buy-back-title').text().trim()

  const priceInfo = $('div.wcontent div.lcol div.price strong.final-price')
  const price = normalizeBuyBackPrice(priceInfo.attr('data-value'))
  const currency = priceInfo.attr('data-currency')

  return {
    pledgeId,
    image,
    title,
    price,
    currency,
    shipInThisPackData,
    alsoContainData
  }
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
        'query initShipUpgrade {\n ships {\n id\n name\n medias {\n productThumbMediumAndSmall\n slideShow\n }\n manufacturer {\n id\n name\n }\n focus\n type\n flyableStatus\n msrp\n link\n skus {\n id\n title\n price\n items {\n id\n title\n}\n }\n }\n }\n'
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
