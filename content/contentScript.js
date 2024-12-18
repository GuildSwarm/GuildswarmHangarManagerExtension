const h2Title = document.querySelector('h2.title')
if (h2Title !== null) {
  const newSection = document.createElement('div')
  newSection.innerHTML = `
    <diV class="gs-wrapper">
      <h2 class="title gs-title">MY HANGAR</h2>
      <div class="gs-section">
        <div id="guildswarm-error-wrapper" class="gs-subwrapper">
          <div id="guildswarm-error-wrapper-close" class="gs-close-button">&#10006; Close window</div>
          <p class="gs-error-content">Lost connection with RSI. Please refresh this page and check if you are logged in, or try again after a few minutes.</p>
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
  newElement.innerHTML = '&#10003; The process has completed successfully.'
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
    newElement.innerHTML = '&#10003; The process has completed successfully with warnings. The following BuyBack element(s) are not included in the file due to an error on the RSI website:'
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

const fetchHangarPage = (page) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getHangarPage', page },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else if (response) {
          resolve(response)
        } else {
          reject('No se recibió respuesta del Service Worker.')
        }
      }
    )
  })
}

const fetchHangarCategories = (page) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getHangarCategories', page },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else if (response) {
          resolve(response)
        } else {
          reject('No se recibió respuesta del Service Worker.')
        }
      }
    )
  })
}

const fetchBuyBackPage = (page) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getBuyBackPage', page },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else if (response) {
          resolve(response)
        } else {
          reject('No se recibió respuesta del Service Worker.')
        }
      }
    )
  })
}

const fetchBuyBackCategories = (page) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getBuyBackCategories', page },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else if (response) {
          resolve(response)
        } else {
          reject('No se recibió respuesta del Service Worker.')
        }
      }
    )
  })
}

const fetchGetCurrency = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getCurrency' },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else if (response) {
          resolve(response)
        } else {
          reject('No se recibió respuesta del Service Worker.')
        }
      }
    )
  })
}

const fetchSetCurrency = (currency) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'setCurrency', currency },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else if (response) {
          resolve(response)
        } else {
          reject('No se recibió respuesta del Service Worker.')
        }
      }
    )
  })
}

const downloadFile = (
  myHangar,
  myBuyBack,
  quantityBuyBackToken,
  actualStoreCredits
) => {
  const blob = new Blob(
    [
      JSON.stringify({
        version: chrome.runtime.getManifest().version,
        myHangar,
        myBuyBack
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
  let hangarElementsCategory = []
  let hangarElements = []
  let buyBackElementsCategory = []
  let buyBackElements = []

  try {
    // let responseCategories = await fetchHangarCategories()
    // hangarElementsCategory = responseCategories.hangarElementsCategory

    const currentCurrency = await fetchGetCurrency()

    let page = 1
    while (page < 3) {
      const responsePage = await fetchHangarPage(page)
      if (!responsePage.hangarData || responsePage.hangarData.length === 0) break
      hangarElements = [...hangarElements, ...responsePage.hangarData]
      page++
    }

    // responseCategories = await fetchBuyBackCategories()
    // buyBackElementsCategory = responseCategories.buyBackElementsCategory

    page = 1
    while (page < 3) {
      const responsePage = await fetchBuyBackPage(page)
      if (!responsePage.buyBackData || responsePage.buyBackData.length === 0) break
      buyBackElements = [...buyBackElements, ...responsePage.buyBackData]
      page++
    }

    await fetchSetCurrency(currentCurrency)
  } catch (error) {
    console.error('Error durante la descarga del hangar:', error)
  }

  console.log('Categorías del hangar:', hangarElementsCategory)
  console.log('Elementos del hangar:', hangarElements)
  console.log('Categorías del buyback:', buyBackElementsCategory)
  console.log('Elementos del buyback:', buyBackElements)

  downloadFile(hangarElements, buyBackElements)
}
