import ky from 'ky'

const customCss = `
<style type="text/css">
  .gs-wrapper {
    display:flex;
    justify-content: space-between;
  }
  .gs-wrapper p {
    margin: 0px;
  }
  .gs-title{
    margin: 0;
    padding: 0;
    font-size: 22px;
    color: #4ee0ff;
    text-transform: uppercase;
  }
  .gs-section {
    position: relative;
    z-index: 99;
  }
  #guildswarm-download {
    z-index: 99;
    position: relative;
    width: 196px;
  }
  .gs-subwrapper {
    display:none;
    align-items: flex-start;
    flex-direction: column;
    padding-bottom: 10px;
    clip-path: polygon(50% 0%, 100% 0, 100% 50%, 100% 90%, 55% 90%, 50% 100%, 45% 90%, 0 90%, 0 50%, 0 0);
    position: absolute;
    top: -165px;
    left:0px;
    height: 150px;
    line-height: normal;
    color: white;
  }
  #guildswarm-error-wrapper {
    background-color: #792020;
  }
  #guildswarm-success-wrapper {
    background-color: #457913;
  }
  #guildswarm-success-body {
    padding: 5px;
    overflow-y: scroll;
    height: 100px;
  }
  #guildswarm-success-body p {
    text-wrap: pretty;
  }
  div.with-warning p {
    font-size: .8em;
  }
  #guildswarm-progressbar {
    transition: width 0.2s ease;
    box-shadow: 0px -2px 0px 0px #00E0FF;
    display: block;
    max-width:185px;
    width: 0%;
    height: 2px;
  }
  .gs-scroll-section::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    background-color: #172554;
  }
  .gs-scroll-section::-webkit-scrollbar {
    width: 8px;
    background-color: #172554;
  }
  .gs-scroll-section::-webkit-scrollbar-thumb {
    background-color: white;
  }
  .gs-close-button {
    width: 100%;
    padding: 5px 0px;
    text-align: center;
    background-color: black;
    color: white;
    font-weight: 700;
    cursor: pointer;
  }
  .gs-close-button:hover {
    background-color: #232323;
  }
  .gs-error-content,
  .gs-success-content {
    padding: 5px;
    text-wrap: pretty;
  }
</style>
`
const h2Title = document.querySelector('h2.title')
if (h2Title !== null) {
  const newSection = document.createElement('div')
  newSection.innerHTML = customCss +
    `
    <diV class="gs-wrapper">
      <h2 class="title gs-title">MY HANGAR</h2>
      <div class="gs-section">
        <div id="guildswarm-error-wrapper" class="gs-subwrapper">
          <div id="guildswarm-error-wrapper-close" class="gs-close-button">&#10006; Close window</div>
          <p class="gs-error-content">Lost connection with RSI. Please Refresh this page and check if you are logged or try again after a few minutes.</p>
        </div>
        <div id="guildswarm-success-wrapper" class="gs-subwrapper">
          <div id="guildswarm-success-wrapper-close" class="gs-close-button">&#10006; Close window</div>
          <div id="guildswarm-success-body" class="gs-scroll-section">
            <div id="guildswarm-success-title"></div>
            <div id="guildswarm-success-content"></div>
          </div>
        </div>
        <a id="guildswarm-download" class="shadow-button trans-02s trans-color">
        <span class="label trans-02s">Guildswarm - Download Hangar data</span>
        <span style="background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAMAAAAVQ1dNAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAU1QTFRFAAAAIyMjOzs7YmJij4+Pp6enq6urqampmpqab29vR0dHIyMjIyMjX19fq6ur1NTU2dnZ2NjYvLy8enp6KCgoQEBAfn5+1dXVubm5i4uLoqKinJycUVFRfn5+1tbWu7u7PDw8VlZWOjo6goKCoqKiMDAwjo6OVFRUkpKSUlJS0tLSiYmJLCwsqqqqzs7OWVlZNTU1hoaGNzc3uLi4ysrKVVVVmpqaV1dXlpaWW1tbeHh4d3d3aGhokZGRhYWFj4+PyMjITExMtLS0hISESUlJtbW1pKSkzc3NqampvLy8bm5u0dHRWlpaoKCgSEhIvb29kJCQZ2dn19fXZWVlIyMjPT09nJycREREmZmZoqKiOTk5JycnqKioJycnNjY2Ozs7wcHBSUlJxcXFtra2vr6+wsLCYmJiIiIiMTExiIiISEhIVFRUkZGRZmZmOjo6p3ZurAAAAG90Uk5TAAEdhcrv/vbYoTUFBn/t////968ZFbv/////5zW6////////7CT//////8gL7P////////1d/////////9L//////P//////9f+h///lNff///+DBP/////oGxn//////FL/////awEjyVJd0YMan/K6cgAAAPxJREFUeJxjYMABGJmYWVjZ2Dk4ubhhQjy8fPwCICAoJCwCERIVEwfyJSSlQBLSMmBVsnJAtryCopIySK2KKtAsXpAqATV1AQ1NLRBLW4eBSRfE0NM3MFQ3MgYxTUwZmMHGm5lbWFpZ24BtsmVgAdN21uL2DlKOYLYTAyuYdrbSc3F1g4i5M7BhiAkyeGCIaTFwYIh5MngJQsS8feShYr4Mfv4gOiAwSEBAwwesNZghRBjEkA8NE5AIjwAxI6MYGKKlgYyY2Ni4eEmQxxMSQYEgoyIgkJSckuoOUpWQlg4OrIxMEwEI0IrMYoQGqk52jpO7oJanb24erqjABgCbVS2d5pjPlgAAAABJRU5ErkJggg==')") class="icon trans-02s"></span>
        <span class="left-section"></span>
        <span class="right-section"></span>
        <span id="guildswarm-progressbar"></span>
      </a>
      </div>
    </div>`
  const h2TitleParent = h2Title.parentNode
  h2TitleParent.replaceChild(newSection, h2Title)
}

let progressBarValue = 0
const progressBarElement = document.querySelector('#guildswarm-progressbar')
const guildswarmMoveProgressBar = (value) => {
  progressBarElement.style.width = value + '%'
}
const guildswarmResetProgressBar = () => {
  progressBarValue = 0
  progressBarElement.style.width = progressBarValue + '%'
  progressBarElement.style.boxShadow = '0px -2px 0px 0px #00E0FF'
}
const guildswarmFinishProgressBar = () => {
  progressBarValue = 100
  guildswarmMoveProgressBar(progressBarValue)
  progressBarElement.style.boxShadow = '0px -2px 0px 0px #00ff00'
}
const guildswarmErrorProgressBar = () => {
  progressBarValue = 100
  guildswarmMoveProgressBar(progressBarValue)
  progressBarElement.style.boxShadow = '0px -2px 0px 0px #ff0000'
}

const errorWrapperElement = document.querySelector('#guildswarm-error-wrapper')
const successWrapperElement = document.querySelector('#guildswarm-success-wrapper')
const successTitleElement = document.querySelector('#guildswarm-success-title')
const successContentElement = document.querySelector('#guildswarm-success-content')
const successBodyElement = document.querySelector('#guildswarm-success-body')

const guildswarmDisplayError = () => {
  hideSuccess()
  showError()
}

const guildswarmResetUi = () => {
  guildswarmResetProgressBar()
  hideError()
  hideSuccess()
  const newElement = document.createElement('p')
  newElement.innerHTML = '&#10003; Process has completed successfully.'
  successTitleElement.replaceChildren(newElement)
  successContentElement.replaceChildren()
  successBodyElement.classList.remove('with-warning')
}

const addWarning = (elementName) => {
  const newElement = document.createElement('p')
  newElement.innerHTML = '&#x2022; ' + elementName
  successContentElement.append(newElement)
}

const showSuccess = () => {
  successWrapperElement.style.display = 'block'
}

const showError = () => {
  errorWrapperElement.style.display = 'block'
}

const hideSuccess = () => {
  successWrapperElement.style.display = 'none'
}

const hideError = () => {
  errorWrapperElement.style.display = 'none'
}

const finishProcessSuccess = () => {
  if (successContentElement.hasChildNodes()) {
    const newElement = document.createElement('p')
    newElement.innerHTML = '&#10003; Process has completed successfully with warnings. Next BuyBack element/s are not included in file because error in RSI web:'
    successTitleElement.replaceChildren(newElement)
    successBodyElement.classList.add('with-warning')
  }
  guildswarmFinishProgressBar()
  hideError()
  showSuccess()
}

document.addEventListener('click', function (e) {
  const target = e.target.closest('#guildswarm-download')
  if (target) {
    downloadHangar()
  }
})

document.addEventListener('click', function (e) {
  const target = e.target.closest('#guildswarm-error-wrapper-close')
  if (target) {
    hideError()
  }
})

document.addEventListener('click', function (e) {
  const target = e.target.closest('#guildswarm-success-wrapper-close')
  if (target) {
    hideSuccess()
  }
})

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

const getCategoryHangarElements = async (myHangarCategory) => {
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

      progressBarValue += 10 / categories.length
      progressBarValue = Math.min(progressBarValue, 15)
      guildswarmMoveProgressBar(progressBarValue)
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

const getHangarElements = async (myHangarCategory, myHangar) => {
  let actualPage = 1
  let totalPages = 1
  let hangarPosition = 1
  let progressTotalPages = 1

  while (actualPage <= totalPages) {
    const hangarData = await fetchHangar(actualPage)
    const regex = /<a class="raquo btn" href=.*page=(.*?)&.*">/g
    const pageFiltered = regex.exec(hangarData)
    totalPages = pageFiltered === null ? 1 : pageFiltered[1]
    if (actualPage === 1) progressTotalPages = totalPages

    const regexLi = /<ul class="list-items">[\s\S]*?<\/ul>/g
    const ulData = regexLi.exec(hangarData)
    const ulValue = ulData[0]

    const temporal = document.createElement('temporal')
    temporal.innerHTML = ulValue

    const arrayLi = temporal.querySelectorAll('ul.list-items > li')
    for (let i = 0; i < arrayLi.length; i++) {
      const li = arrayLi[i]
      const itemsData = []

      const items = li.querySelectorAll('div.item')
      items.forEach((item) => {
        const imageWrapper = item.querySelector('div.image')
        let image = null
        if (imageWrapper !== null) {
          const backgroundImageValue = imageWrapper.style.backgroundImage
          image = backgroundImageValue.match(/^url\(['"](.+)['"]\)/)[1]
        }
        const title = item.querySelector('div.title').innerHTML
        let kind = item.querySelector('div.kind')
        if (kind !== null) {
          kind = kind.innerHTML
        }
        itemsData.push({
          image,
          title,
          kind
        })
      })

      const principalImageValue = li.querySelector('div.item-image-wrapper > div.image').style.backgroundImage
      const principalImage = principalImageValue.match(/^url\(['"](.+)['"]\)/)[1]

      let upgradeData = li.querySelector('input.js-upgrade-data')
      if (upgradeData !== null) {
        upgradeData = JSON.parse(upgradeData.value)
      }

      const gifteable = li.querySelector('a.gift') !== null
      const exchangeable =
          li.querySelector('a.reclaim') !== null
      const pledgeId = li.querySelector('input.js-pledge-id').value
      const findCategory = myHangarCategory.find((hangarCategory) => {
        return pledgeId === hangarCategory.pledgeId
      })
      const category =
          findCategory === undefined
            ? { id: 'undefined', name: 'Whithout Category' }
            : {
                id: findCategory.category.id,
                name: findCategory.category.name
              }

      const arrayUpgradedData = []
      const itemsUpgraded = li.querySelector('h3.upgraded')
      if (itemsUpgraded !== null) {
        const upgradeLogDataArray = await fetchUpgradeLog(pledgeId)

        const temporalUpgradedLog = document.createElement(
          'temporalUpgradedLog'
        )
        temporalUpgradedLog.innerHTML = upgradeLogDataArray

        const rowsUpgradeLog = temporalUpgradedLog.querySelectorAll('div.row')
        rowsUpgradeLog.forEach((item) => {
          const labelData = item.querySelector('label')
          if (labelData !== null) {
            arrayUpgradedData.push({
              date: labelData.textContent
                .replace(/\n/g, '')
                .trim()
                .split('     ')[0],
              name: labelData.textContent
                .replace(/\n/g, '')
                .trim()
                .split('     ')[1]
                .split(', ')[0],
              newValue: labelData.textContent
                .replace(/\n/g, '')
                .trim()
                .split('     ')[1]
                .split(', ')[1]
            })
          }
        })
        temporalUpgradedLog.remove()
      }

      const regexCoupon = /Coupon:\s([\w\W]*)/gm
      let name = li.querySelector('input.js-pledge-name').value
      name = name.replace(regexCoupon, 'Coupon')

      const newElement = {
        id: pledgeId,
        name,
        value: li
          .querySelector('input.js-pledge-value')
          .value.split(' ')[0]
          .substring(1),
        createdDate: li
          .querySelector('div.date-col')
          .innerHTML.split('\n')[2]
          .trim(),
        containsInfo: li
          .querySelector('div.items-col')
          .innerHTML.split('\n')[2]
          .trim(),
        availability: li.querySelector('span.availability').innerHTML,
        principalImage,
        itemsData,
        upgradeData,
        gifteable,
        exchangeable,
        category,
        urlHangar:
            'https://robertsspaceindustries.com/account/pledges?page=' +
            hangarPosition +
            '&pagesize=1',
        upgradesApplied: arrayUpgradedData
      }

      myHangar.push(newElement)
      hangarPosition++
    }

    temporal.remove()

    progressBarValue += 20 / progressTotalPages
    progressBarValue = Math.min(progressBarValue, 35)
    guildswarmMoveProgressBar(progressBarValue)
    actualPage++
  }
}

const fetchHangar = async (actualPage) => {
  try {
    const response = await ky.get('https://robertsspaceindustries.com/account/pledges?page=' + actualPage + '&pagesize=10', {
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

const fetchHangarLog = async (actualPage) => {
  const myHeaders = new Headers()
  myHeaders.append('content-type', 'application/json')
  myHeaders.append(
    'x-rsi-token',
    document.cookie.match('(^|;)\\s*' + 'Rsi-Token' + '\\s*=\\s*([^;]+)')?.pop()
  )

  const raw = JSON.stringify({
    page: actualPage
  })

  try {
    const response = await ky.post('https://robertsspaceindustries.com/api/account/pledgeLog', {
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

const getHangarLogElements = async (myHangarLog) => {
  let actualPage = 1
  let totalPages = 1

  while (actualPage <= totalPages) {
    const hangarLogData = await fetchHangarLog(actualPage)
    totalPages = hangarLogData.pagecount
    const temporalHangarLog = document.createElement('temporalHangarLog')
    temporalHangarLog.innerHTML = hangarLogData.rendered

    temporalHangarLog
      .querySelector('div.pledge-log-entry')
      .textContent.split(
        temporalHangarLog.querySelector('div.pledge-log-entry span.important')
          .textContent
      )

    const arrayDiv = temporalHangarLog.querySelectorAll(
      'div.pledge-log-entry'
    )
    arrayDiv.forEach((div) => {
      myHangarLog.push({
        date: div.textContent
          .split(div.querySelector('span.important').textContent)[0]
          .replace('\n \n ', '')
          .replace(' - ', '')
          .trim(),
        name: div.querySelector('span.important').textContent,
        extra: div.textContent
          .split(div.querySelector('span.important').textContent)[1]
          .replace('\n \n', '')
          .trim()
          .replace(/by .*?[,\s]/, 'by ')
          .replace(/Gifted to .*?[,\s]/, 'Gifted to ')
      })
    })

    temporalHangarLog.remove()

    progressBarValue += 10 / totalPages
    progressBarValue = Math.min(progressBarValue, 45)
    guildswarmMoveProgressBar(progressBarValue)
    actualPage++
  }
}

const getBuyBackElements = async (authToken, quantityBuyBackToken, myBuyBackCategory, myBuyBack) => {
  let actualPage = 1
  let totalPages = 1
  let hangarPosition = 1
  let progressTotalPages = 1

  while (actualPage <= totalPages) {
    const buyBackData = await fetchBuyBack(actualPage)
    const regex = /<a class="raquo btn" href=.*page=(.*?)&.*">/g
    const pageFiltered = regex.exec(buyBackData)
    totalPages = pageFiltered === null ? 1 : pageFiltered[1]
    if (actualPage === 1) progressTotalPages = totalPages

    const regexBuyBackToken = /<p class="buy-back-warning">[\s\S]*<strong>(\d*)<\/strong>/g
    const buyBackTokenValue = regexBuyBackToken.exec(buyBackData)
    if (buyBackTokenValue !== null && !isNaN(buyBackTokenValue[1])) {
      quantityBuyBackToken = buyBackTokenValue[1]
    }

    const regexLi = /(<ul class="pledges">[\s\S]*?<\/ul>)\s*?<\/section>/g
    const ulData = regexLi.exec(buyBackData)
    const ulValue = ulData[1]

    const temporal = document.createElement('temporal')
    temporal.innerHTML = ulValue

    const arrayDivInformation = temporal.querySelectorAll(
      'ul.pledges li article.pledge div.information'
    )

    for (let i = 0; i < arrayDivInformation.length; i++) {
      const element = arrayDivInformation[i]
      const name = element.querySelector('div > h1').textContent
      const image = element.querySelector('figure > img').src
      const ddElements = element.querySelectorAll('div > dl > dd')
      const lastModification = ddElements[0].textContent
      const contained = ddElements[2].textContent

      let ccuInfo
      const ccuElement = element.querySelector(
        'a.holosmallbtn.js-open-ship-upgrades'
      )
      if (ccuElement !== null) {
        await fetchSetContextToken(ccuElement.dataset.pledgeid)
        const shipUpgradeData = await getInitShipUpgrade(
          authToken,
          ccuElement.dataset.fromshipid,
          ccuElement.dataset.toskuid
        )
        if ((shipUpgradeData[0].errors &&
          shipUpgradeData[0].errors[0].extensions.code === 'INTERNAL_SERVER_ERROR' &&
          shipUpgradeData[0].errors[0].extensions.exception.name === 'ShipNotFound') ||
          (shipUpgradeData[1].errors &&
            shipUpgradeData[1].errors[0].extensions.code === 'INTERNAL_SERVER_ERROR' &&
            shipUpgradeData[1].errors[0].extensions.exception.name === 'ShipNotFound')
        ) {
          addWarning(name)
        } else {
          ccuInfo = {
            pledgeId: ccuElement.dataset.pledgeid,
            fromShipId: ccuElement.dataset.fromshipid,
            toShipId: ccuElement.dataset.toshipid,
            toSkuId: ccuElement.dataset.toskuid,
            fromShipData: shipUpgradeData[0].data.ships[0],
            toShipData: shipUpgradeData[0].data.ships[1],
            price: shipUpgradeData[1]
          }
        }
      }

      const available = element.parentElement.dataset.disabled === undefined
      let link = null
      let elementData = null
      if (ccuElement === null) {
        link = element.querySelector('a.holosmallbtn').href
        if (available) {
          const buyBackPledge = await fetchBuyBackPledge(link)
          const regex = /(<div class="wcontent clearfix">[\s\S]*?)<\/div>\s*<\/div>\s*<div class="store-country-selector international-bottom">/gm
          const buyBackDataData = regex.exec(buyBackPledge)[0]
          const temporalBuyBack = document.createElement('temporalBuyBack')
          temporalBuyBack.innerHTML = buyBackDataData

          const shipInThisPackData = []
          const shipInThisPack = temporalBuyBack.querySelectorAll('div.package-listing.ship ul li.js-select-carousel-item')
          shipInThisPack.forEach((shipElement) => {
            const infoElements = shipElement.querySelectorAll('div')
            shipInThisPackData.push({
              image: shipElement.querySelector('img').src,
              name: infoElements[0].querySelector('span').textContent,
              manufacturer: infoElements[1].querySelector('span').textContent,
              focus: infoElements[2].querySelector('span').textContent,
              link: shipElement.querySelector('a').href
            })
          })

          const alsoContainData = []
          const alsoContain = temporalBuyBack.querySelectorAll('div.package-listing.item ul li.trans-02s')
          alsoContain.forEach((shipElement) => {
            alsoContainData.push(shipElement.textContent)
          })

          elementData = {
            image: temporalBuyBack.querySelector('div.wcontent div.lcol img').src,
            title: temporalBuyBack.querySelector('h2.buy-back-title').textContent,
            price: temporalBuyBack.querySelector('div.wcontent div.lcol div.price strong.final-price').dataset.value,
            currency: temporalBuyBack.querySelector('div.wcontent div.lcol div.price strong.final-price').dataset.currency,
            shipInThisPackData,
            alsoContainData
          }

          temporalBuyBack.remove()
        }
      }

      if (link === null) {
        link = `https://robertsspaceindustries.com/account/buy-back-pledges?page=${hangarPosition}&pagesize=1`
      }

      const linkPledge = element.querySelector('div > a.holosmallbtn')
      let pledgeIdCategory
      let category
      if (linkPledge.dataset.pledgeid !== undefined) {
        pledgeIdCategory = linkPledge.dataset.pledgeid
        category = {
          id: 'upgrade',
          name: 'Upgrades'
        }
      } else {
        pledgeIdCategory = linkPledge.href
      }

      if (category === undefined) {
        const findCategory = myBuyBackCategory.find((buyBackCategory) => {
          return pledgeIdCategory === buyBackCategory.pledgeId
        })

        category =
          findCategory === undefined
            ? { id: 'undefined', name: 'Whithout Category' }
            : {
                id: findCategory.category.id,
                name: findCategory.category.name
              }
      }

      myBuyBack.push({
        name,
        image,
        lastModification,
        contained,
        ccuInfo,
        link,
        available,
        elementData,
        category
      })
      hangarPosition++

      progressBarValue += 30 / (100 * progressTotalPages)
      progressBarValue = Math.min(progressBarValue, 85)
      guildswarmMoveProgressBar(progressBarValue)
    }

    temporal.remove()

    actualPage++
  }
}

const fetchBuyBack = async (actualPage) => {
  try {
    const response = await ky.get('https://robertsspaceindustries.com/account/buy-back-pledges?page=' +
        actualPage +
        '&pagesize=100',
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

const getCurrency = (pledgePage) => {
  const regex = /<input type="hidden" name="currency" class="js-currency ty-js-currency-selector js-form-data" id="currency" value="(\w*)" \/>/g
  const pledgePageData = regex.exec(pledgePage)
  return pledgePageData[1]
}

const getStoreCredits = (pledgePage) => {
  const regex = /<span class="c-account-sidebar__profile-info-credits-amount c-account-sidebar__profile-info-credits-amount--pledge">\s*\$([\w\W]*) USD\s*<\/span>/g
  const pledgePageData = regex.exec(pledgePage)
  return pledgePageData[1]
}

const getPledgePage = async () => {
  try {
    const response = await ky.get('https://robertsspaceindustries.com/pledge', {
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

const setCurrency = async (currency) => {
  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'application/json')
  myHeaders.append(
    'x-rsi-token',
    document.cookie.match('(^|;)\\s*' + 'Rsi-Token' + '\\s*=\\s*([^;]+)')?.pop()
  )
  myHeaders.append('accept', 'application/json')

  const raw = JSON.stringify({ currency })

  try {
    const response = await ky.post('https://robertsspaceindustries.com/api/store/setCurrency', {
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

const setAuthToken = async () => {
  const myHeaders = new Headers()
  myHeaders.append('Content-Type', 'text/plain')
  myHeaders.append(
    'x-rsi-token',
    document.cookie.match('(^|;)\\s*' + 'Rsi-Token' + '\\s*=\\s*([^;]+)')?.pop()
  )
  myHeaders.append('accept', 'application/json')

  const raw = '{}'

  try {
    const response = await ky.post('https://robertsspaceindustries.com/api/account/v2/setAuthToken', {
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

const fetchSetContextToken = async (pledgeId) => {
  const myHeaders = new Headers()
  myHeaders.append('content-type', 'application/json')
  myHeaders.append(
    'x-rsi-token',
    document.cookie.match('(^|;)\\s*' + 'Rsi-Token' + '\\s*=\\s*([^;]+)')?.pop()
  )

  const raw = JSON.stringify({
    pledgeId
  })

  try {
    const response = await ky.post('https://robertsspaceindustries.com/api/ship-upgrades/setContextToken', {
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
    const response = await ky.post('https://robertsspaceindustries.com/pledge-store/api/upgrade/graphql', {
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

const getCategoryBuyBackElements = async (myBuyBackCategory) => {
  await Promise.all(
    categories.map(async (category) => {
      let actualPage = 1
      let totalPages = 1

      while (actualPage <= totalPages) {
        const categoryBuyBackData = await fetchBuyBackCategory(category, actualPage)
        const regex = /<a class="raquo btn" href=.*page=(.*?)&.*">/g
        const pageFiltered = regex.exec(categoryBuyBackData)
        totalPages = pageFiltered === null ? 1 : pageFiltered[1]

        const regexLi = /(<ul class="pledges">[\s\S]*?<\/ul>)\s*?<\/section>/g
        const ulData = regexLi.exec(categoryBuyBackData)
        const ulValue = ulData[1]

        const temporal = document.createElement('temporal')
        temporal.innerHTML = ulValue

        const arrayDivInformation = temporal.querySelectorAll(
          'ul.pledges li article.pledge div.information'
        )

        for (let i = 0; i < arrayDivInformation.length; i++) {
          const element = arrayDivInformation[i]
          const linkPledge = element.querySelector('div > a.holosmallbtn')
          if (linkPledge.dataset.pledgeid !== undefined) {
            myBuyBackCategory.push({ pledgeId: linkPledge.dataset.pledgeid, category })
          } else {
            myBuyBackCategory.push({ pledgeId: linkPledge.href, category })
          }
        }

        temporal.remove()

        actualPage++
      }

      progressBarValue += 10 / categories.length
      progressBarValue = Math.min(progressBarValue, 55)
      guildswarmMoveProgressBar(progressBarValue)
    })
  )
}

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

const fetchCreditLog = async (actualPage) => {
  const myHeaders = new Headers()
  myHeaders.append('content-type', 'application/json')
  myHeaders.append(
    'x-rsi-token',
    document.cookie.match('(^|;)\\s*' + 'Rsi-Token' + '\\s*=\\s*([^;]+)')?.pop()
  )

  const raw = JSON.stringify({
    page: actualPage
  })

  try {
    const response = await ky.post('https://robertsspaceindustries.com/api/account/creditLog', {
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

const getCreditLogElements = async (myCreditLog) => {
  let actualPage = 1
  let totalPages = 1

  while (actualPage <= totalPages) {
    const creditLogData = await fetchCreditLog(actualPage)
    totalPages = creditLogData.pagecount
    const temporalCreditLog = document.createElement('temporalHangarLog')
    temporalCreditLog.innerHTML = creditLogData.rendered

    temporalCreditLog
      .querySelector('div.pledge-log-entry')
      .textContent.split(
        temporalCreditLog.querySelector('div.pledge-log-entry span.important')
          .textContent
      )

    const arrayDiv = temporalCreditLog.querySelectorAll(
      'div.pledge-log-entry'
    )
    arrayDiv.forEach((div) => {
      myCreditLog.push({
        date: div.textContent
          .split(div.querySelector('span.important').textContent)[0]
          .replace('\n \n ', '')
          .replace(' - ', '')
          .trim(),
        name: div.querySelector('span.important').textContent,
        extra: div.textContent
          .split(div.querySelector('span.important').textContent)[1]
          .replace('\n \n', '')
          .replace('- ', '')
          .trim()
      })
    })

    temporalCreditLog.remove()

    progressBarValue += 10 / totalPages
    progressBarValue = Math.min(progressBarValue, 95)
    guildswarmMoveProgressBar(progressBarValue)
    actualPage++
  }
}

const downloadFile = (
  myHangar,
  myHangarLog,
  myBuyBack,
  myCreditLog,
  quantityBuyBackToken,
  actualStoreCredits
) => {
  const blob = new Blob(
    [
      JSON.stringify({
        version: chrome.runtime.getManifest().version,
        myHangar,
        myHangarLog,
        myBuyBack,
        myCreditLog,
        quantityBuyBackToken,
        actualStoreCredits
      })
    ],
    { type: 'text' }
  )
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `guildswarm-myHangar_${(new Date()).toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const downloadHangar = async () => {
  const myHangar = []
  const myHangarCategory = []
  const myHangarLog = []
  const myBuyBack = []
  const myBuyBackCategory = []
  const myCreditLog = []
  let actualStoreCredits = 0
  let quantityBuyBackToken = 0
  let authToken
  let actualCurrency

  try {
    guildswarmResetUi()
    authToken = await setAuthToken()
    const pledgePage = await getPledgePage()
    actualCurrency = getCurrency(pledgePage)
    actualStoreCredits = getStoreCredits(pledgePage)
    await setCurrency('USD')
    progressBarValue += 5
    guildswarmMoveProgressBar(progressBarValue)
    await getCategoryHangarElements(myHangarCategory)
    await getHangarElements(myHangarCategory, myHangar)
    await getHangarLogElements(myHangarLog)
    await getCategoryBuyBackElements(myBuyBackCategory)
    await getBuyBackElements(authToken, quantityBuyBackToken, myBuyBackCategory, myBuyBack)
    await getCreditLogElements(myCreditLog)
    await setCurrency(actualCurrency)
    downloadFile(
      myHangar,
      myHangarLog,
      myBuyBack,
      myCreditLog,
      quantityBuyBackToken,
      actualStoreCredits)
    finishProcessSuccess()
  } catch (error) {
    console.error('Error:', error)
    guildswarmErrorProgressBar()
    guildswarmDisplayError()
  }
}
