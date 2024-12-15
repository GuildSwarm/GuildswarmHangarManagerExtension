import ky from 'ky'
import * as cheerio from 'cheerio'
import { hash, retryLimit, statusCodesRetry, categories } from './shared.js'

const fetchBuyBackCategory = async (category, actualPage) => {
  try {
    const response = await ky.get('https://robertsspaceindustries.com/account/buy-back-pledges?page=' +
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
