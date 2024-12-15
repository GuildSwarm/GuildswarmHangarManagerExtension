import ky from 'ky'
import * as cheerio from 'cheerio'
import { hash, retryLimit, statusCodesRetry, categories } from './shared.js'

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
        image = match ? match[1] : null
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
        const textContent = labelData.text().trim()
        arrayUpgradedData.push({
          date: textContent.split('     ')[0],
          name: textContent.split('     ')[1]?.split(', ')[0] || null,
          newValue: textContent.split('     ')[1]?.split(', ')[1] || null
        })
      }
    })
  } catch (error) {
    console.error(`Error fetching upgrade log for pledgeId ${pledgeId}:`, error)
  }
  return arrayUpgradedData
}

const removeCodesOfCouponsName = (couponName) => {
  const regexCoupon = /Coupon:\s([\w\W]*)/gm
  return couponName?.replace(regexCoupon, 'Coupon') || 'Unknown'
}

export const getHangarPage = async (rsiToken, page) => {
  const hangarData = await fetchHangarPage(page)
  const $ = cheerio.load(hangarData)
  if (isEmptyList($)) return []

  const arrayLi = $('ul.list-items li')
  const results = []
  for (const li of arrayLi.toArray()) {
    const itemsData = parseItemsData($, li)

    const principalImageValue = $(li)
      .find('div.item-image-wrapper > div.image')
      .css('background-image')
    const principalImage = principalImageValue?.match(/^url\(['"](.+)['"]\)/)?.[1] || null

    let upgradeData = $(li).find('input.js-upgrade-data').val()
    if (upgradeData) {
      try {
        upgradeData = JSON.parse(upgradeData)
      } catch (error) {
        console.error('Error parsing upgrade data for an item:', error)
      }
    }

    const gifteable = $(li).find('a.gift').length > 0
    const exchangeable = $(li).find('a.reclaim').length > 0
    const pledgeId = $(li).find('input.js-pledge-id').val()
    const arrayUpgradedData = await parseUpgradesApplied(rsiToken, pledgeId)
    const name = removeCodesOfCouponsName($(li).find('input.js-pledge-name').val())

    const newElement = {
      id: hash(pledgeId),
      name,
      value: $(li).find('input.js-pledge-value').val()?.split(' ')[0]?.substring(1) || '0',
      createdDate: $(li).find('div.date-col').text().trim() || null,
      containsInfo: $(li).find('div.items-col').text().trim() || null,
      availability: $(li).find('span.availability').text().trim() || null,
      principalImage,
      itemsData,
      upgradeData,
      gifteable,
      exchangeable,
      category: null,
      urlHangar:
        'https://robertsspaceindustries.com/account/pledges?page=' +
        ((page - 1) * 10 + $(li).index()) +
        '&pagesize=1',
      upgradesApplied: arrayUpgradedData
    }

    results.push(newElement)
  }

  return results
}

export const fetchHangarPage = async (page) => {
  try {
    const response = await ky.get('https://robertsspaceindustries.com/account/pledges?page=' + page + '&pagesize=10', {
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
          hangarElementsCategory.push({ pledgeId: hash(pledgeId), category })
        }
      }
      page++
    }
  }

  return hangarElementsCategory
}

const isEmptyList = ($) => {
  return $('ul.list-items li h4.empy-list').length > 0
}

const fetchCategory = async (category, page) => {
  try {
    const response = await ky.get('https://robertsspaceindustries.com/account/pledges?page=' + page + '&pagesize=10' + category.urlParameter, {
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
      .post('https://robertsspaceindustries.com/api/account/upgradeLog', {
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
