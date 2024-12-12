import ky from 'ky'
import * as cheerio from 'cheerio'
import { hash } from './utils.js'

const retryLimit = 5
const statusCodesRetry = [404, 408, 413, 429, 500, 502, 503, 504]
const categories = [
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

export const getHangarPage = async (page) => {
  const hangarData = await fetchHangarPage(page) // Suponiendo que ya tienes esta función para obtener HTML
  const $ = cheerio.load(hangarData) // Carga el HTML en cheerio

  const ulElement = $('ul.list-items')
  if (!ulElement.length) {
    throw new Error('No se encontraron elementos en la lista del hangar.')
  }

  const arrayLi = ulElement.find('li')
  const results = []

  arrayLi.each(async (index, li) => {
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

        itemsData.push({
          image,
          title,
          kind
        })
      })

    const principalImageValue = $(li)
      .find('div.item-image-wrapper > div.image')
      .css('background-image')
    const principalImage = principalImageValue.match(/^url\(['"](.+)['"]\)/)[1]

    let upgradeData = $(li).find('input.js-upgrade-data').val()
    if (upgradeData) {
      upgradeData = JSON.parse(upgradeData)
    }

    const gifteable = $(li).find('a.gift').length > 0
    const exchangeable = $(li).find('a.reclaim').length > 0

    const pledgeId = $(li).find('input.js-pledge-id').val()

    const arrayUpgradedData = []
    const itemsUpgraded = $(li).find('h3.upgraded')
    if (itemsUpgraded.length) {
      const upgradeLogDataArray = await fetchUpgradeLog(pledgeId)

      const upgradedLog$ = cheerio.load(upgradeLogDataArray)
      upgradedLog$('div.row').each((_, item) => {
        const labelData = upgradedLog$(item).find('label')
        if (labelData.length) {
          const textContent = labelData.text().trim()
          arrayUpgradedData.push({
            date: textContent.split('     ')[0],
            name: textContent.split('     ')[1].split(', ')[0],
            newValue: textContent.split('     ')[1].split(', ')[1]
          })
        }
      })
    }

    const regexCoupon = /Coupon:\s([\w\W]*)/gm
    let name = $(li).find('input.js-pledge-name').val()
    name = name.replace(regexCoupon, 'Coupon')

    const newElement = {
      id: hash(pledgeId),
      name,
      value: $(li).find('input.js-pledge-value').val().split(' ')[0].substring(1),
      createdDate: $(li).find('div.date-col').text().trim(),
      containsInfo: $(li).find('div.items-col').text().trim(),
      availability: $(li).find('span.availability').text().trim(),
      principalImage,
      itemsData,
      upgradeData,
      gifteable,
      exchangeable,
      category: null,
      urlHangar:
        'https://robertsspaceindustries.com/account/pledges?page=' +
        (page * 10 + index) +
        '&pagesize=1',
      upgradesApplied: arrayUpgradedData
    }

    results.push(newElement)
  })

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

export const getCategoryHangarElements = async (myHangarCategory) => {
  await Promise.all(
    categories.map(async (category) => {
      let actualPage = 1
      let totalPages = 1

      while (actualPage <= totalPages) {
        const categoryData = await fetchCategory(category, actualPage)
        const regex = /<a class="raquo btn" href=.*page=(.*?)&.*">/g
        const pageFiltered = regex.exec(categoryData)
        totalPages = pageFiltered === null ? 1 : pageFiltered[1]

        const regexLi = /<ul class="list-items">[\s\S]*?<\/ul>/g
        const ulData = regexLi.exec(categoryData)
        const ulValue = ulData[0]
        if (ulData === null) return

        const temporal = document.createElement('temporal')
        temporal.innerHTML = ulValue

        const arrayLi = temporal.querySelectorAll('ul.list-items > li')
        arrayLi.forEach((li) => {
          const id = li.querySelector('input.js-pledge-id')
          if (id === null) return
          myHangarCategory.push({ pledgeId: id.value, category })
        })

        actualPage++
      }
    })
  )
}

const fetchCategory = async (category, actualPage) => {
  try {
    const response = await ky.get('https://robertsspaceindustries.com/account/pledges?page=' + actualPage + '&pagesize=10' + category.urlParameter, {
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

const fetchUpgradeLog = async (pledgeId) => {
  const myHeaders = new Headers()
  myHeaders.append('content-type', 'application/json')
  myHeaders.append(
    'x-rsi-token',
    document.cookie.match('(^|;)\\s*' + 'Rsi-Token' + '\\s*=\\s*([^;]+)')?.pop()
  )

  const raw = JSON.stringify({
    pledge_id: pledgeId
  })

  try {
    const response = await ky.post('https://robertsspaceindustries.com/api/account/upgradeLog', {
      headers: myHeaders,
      body: raw,
      retry: {
        limit: retryLimit,
        methods: ['post'],
        statusCodes: statusCodesRetry
      }
    }).json()

    return response.data.rendered
  } catch (error) {
    throw new Error(`Error on request: ${error.message}`)
  }
}
