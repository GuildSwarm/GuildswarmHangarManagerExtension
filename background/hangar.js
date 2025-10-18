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

export const getNumberOfPagesInHangar = async () => {
  const hangarData = await fetchHangarPage(1)
  const $ = cheerio.load(hangarData)
  if (isEmptyList($)) return 0

  const linkElementMaxPagesOfHangar = $('div.pager div.right a.raquo')
  if (linkElementMaxPagesOfHangar.length === 0) return 0

  const hrefLinkElementMaxPagesOfHangar = linkElementMaxPagesOfHangar.attr('href')
  const regex = /page=(.*?)&/g
  const maxPagesOfHangar = regex.exec(hrefLinkElementMaxPagesOfHangar)
  return maxPagesOfHangar === null ? 0 : maxPagesOfHangar[1]
}

export const getHangarElementsCategory = async () => {
  const hangarElementsCategory = []
  for (const category of categories) {
    let page = 1
    while (true) {
      const categoryData = await fetchCategory(category, page)
      const $ = cheerio.load(categoryData)
      if (isEmptyList($)) break
      const pledgeIdElements = $('input.js-pledge-id')
      if (!pledgeIdElements.length) break
      for (const pledgeIdElement of pledgeIdElements.toArray()) {
        const pledgeId = $(pledgeIdElement).val()
        if (pledgeId) {
          hangarElementsCategory.push({ pledgeId: hash(pledgeId), categoryId: category.id })
        }
      }
      page++
    }
  }

  return hangarElementsCategory
}

const fetchCategory = async (category, page) => {
  const response = await ky.get(`${baseUrlRsi}/en/account/pledges?page=${page}&pagesize=10${category.urlParameter}`, {
    retry: {
      limit: retryLimit,
      methods: ['get'],
      statusCodes: statusCodesRetry
    }
  })

  return response.text()
}

const fetchUpgradeLog = async (rsiToken, pledgeId) => {
  if (!rsiToken) {
    throw new Error('No se pudo obtener la cookie Rsi-Token.')
  }

  const myHeaders = new Headers()
  myHeaders.append('content-type', 'application/json')
  myHeaders.append('x-rsi-token', rsiToken)

  const raw = JSON.stringify({
    pledge_id: pledgeId
  })

  try {
    const response = await ky
      .post(`${baseUrlRsi}/api/account/upgradeLog`, {
        headers: myHeaders,
        body: raw,
        retry: {
          limit: retryLimit,
          methods: ['post'],
          statusCodes: statusCodesRetry
        }
      })
      .json()

    return response.data.rendered
  } catch (error) {
    throw new Error(`Error on request: ${error.message}`)
  }
}

export const fetchHangarPage = async (page) => {
  const response = await ky.get(`${baseUrlRsi}/en/account/pledges?page=${page}&pagesize=10`, {
    retry: {
      limit: retryLimit,
      methods: ['get'],
      statusCodes: statusCodesRetry
    }
  })

  return response.text()
}

export const fetchHangarElement = async (pageElement) => {
  const response = await ky.get(`${baseUrlRsi}/en/account/pledges?page=${pageElement}&pagesize=1`, {
    retry: {
      limit: retryLimit,
      methods: ['get'],
      statusCodes: statusCodesRetry
    }
  })

  return response.text()
}

export const getHangarPage = async (rsiToken, page) => {
  const hangarData = await fetchHangarPage(page)
  return extractDataFromHangarData(rsiToken, page, hangarData)
}

export const getHangarElement = async (rsiToken, page, elementPositionInPage) => {
  const pageElement = calculateElementPosition(page, elementPositionInPage)
  const hangarData = await fetchHangarElement(pageElement)
  return extractDataFromHangarData(rsiToken, page, hangarData, pageElement)
}

const extractDataFromHangarData = async (rsiToken, page, hangarData, pageElement = null) => {
  const $ = cheerio.load(hangarData)
  if (isEmptyList($)) return []

  const arrayLi = $('ul.list-items li')
  const results = []
  let index = 0
  for (const li of arrayLi.toArray()) {
    const itemsData = parseItemsData($, li)

    const imageValue = $(li)
      .find('div.item-image-wrapper > div.image')
      .css('background-image')
    const match = imageValue.match(/^url\(['"](.+)['"]\)/)
    const image = match ? normalizeImageSrc(match[1]) : null

    let upgradeData = $(li).find('input.js-upgrade-data').val()
    if (upgradeData) {
      try {
        const upgradeRawData = JSON.parse(upgradeData)
        const matchItems = upgradeRawData.match_items.map((item) => {
          return { name: item.name }
        })
        const targetItems = upgradeRawData.target_items.map((item) => {
          return { name: item.name }
        })

        upgradeData = {
          matchItems,
          targetItems
        }
      } catch (error) {
        console.error('Error parsing upgrade data for an item:', error)
      }
    }

    const gifteable = $(li).find('a.gift').length > 0
    const exchangeable = $(li).find('a.reclaim').length > 0
    const pledgeId = $(li).find('input.js-pledge-id').val()

    const hasUpgradeLog = $(li).find('a.js-upgrade-log').length > 0
    let upgradesApplied
    if (hasUpgradeLog) {
      upgradesApplied = await parseUpgradesApplied(rsiToken, pledgeId)
    }

    const name = removeCodesOfCouponsName($(li).find('input.js-pledge-name').val())
    const urlHangar = `${baseUrlRsi}/en/account/pledges?page=${pageElement ?? calculateElementPosition(page, index)}&pagesize=1`
    let value = $(li).find('input.js-pledge-value').val()?.split(' ')[0]?.substring(1) || 0
    value = parseFloat(value)
    const createDateRaw = $(li).find('div.date-col').text().trim() || null
    const matchCreateDate = createDateRaw.match(/([A-Za-z]+ \d{2}, \d{4})/)
    const createdDate = matchCreateDate ? matchCreateDate[1] : null
    const containsRaw = $(li).find('div.items-col').text().trim() || null
    const containsInfo = containsRaw.replace(/\s+/g, ' ').trim().replace(/^[Cc]ontains:\s+/, '')
    const category = idNoCategory
    const id = hash(pledgeId)

    const newElement = {
      id,
      name,
      value,
      createdDate,
      containsInfo,
      image,
      itemsData,
      upgradeData,
      gifteable,
      exchangeable,
      category,
      urlHangar,
      upgradesApplied
    }

    results.push(newElement)
    index++
  }

  return results
}

const parseItemsData = ($, li) => {
  const itemsData = []
  $(li)
    .find('div.item')
    .each((_, item) => {
      const imageWrapper = $(item).find('div.image')
      let image = null
      if (imageWrapper.length) {
        const backgroundImageValue = imageWrapper.css('background-image')
        const match = backgroundImageValue.match(/^url\(['"](.+)['"]\)/)
        image = match ? normalizeImageSrc(match[1]) : null
      }

      const title = $(item).find('div.title').text().trim()
      let kind = $(item).find('div.kind').text().trim()
      if (!kind) kind = null

      itemsData.push({ image, title, kind })
    })
  return itemsData
}

const parseUpgradesApplied = async (rsiToken, pledgeId) => {
  const arrayUpgradedData = []
  try {
    const upgradeLogDataArray = await fetchUpgradeLog(rsiToken, pledgeId)
    const upgradedLog$ = cheerio.load(upgradeLogDataArray)
    upgradedLog$('div.row').each((_, item) => {
      const labelData = upgradedLog$(item).find('label')
      if (labelData.length) {
        // Extraer la fecha (antes del <br/>)
        const dateNode = labelData.contents().first()
        const date = dateNode.text().trim()

        // Extraer el span que contiene la descripción del upgrade
        const spanContent = labelData.find('span').text().trim()

        if (spanContent) {
          // Formato: "Upgrade applied: #ID Upgrade - Name, new value: $X.XX USD"
          // Extraer el nombre (después de "Upgrade applied: #ID " y antes de ", new value:")
          const nameMatch = spanContent.match(/Upgrade applied:\s*#\d+\s+(.+?),\s*new value:/)
          const name = nameMatch ? nameMatch[1].trim() : null

          // Extraer el nuevo valor
          const valueMatch = spanContent.match(/new value:\s*\$?([\d,]+\.?\d*)/i)
          let newValue = null
          if (valueMatch) {
            const valueStr = removeCommas(valueMatch[1])
            newValue = parseFloat(valueStr)
          }

          arrayUpgradedData.push({
            date,
            name,
            newValue
          })
        }
      }
    })
  } catch (error) {
    console.error(`Error fetching upgrade log for pledgeId ${pledgeId}:`, error)
  }
  return arrayUpgradedData
}

const removeCommas = (value) => {
  return value.replace(/,/g, '')
}

const removeCodesOfCouponsName = (couponName) => {
  const regexCoupon = /Coupon:\s([\w\W]*)/gm
  return couponName?.replace(regexCoupon, 'Coupon') || 'Unknown'
}

const isEmptyList = ($) => {
  return $('ul.list-items li h4.empy-list').length > 0
}
