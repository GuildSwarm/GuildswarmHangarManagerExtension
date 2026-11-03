// Textos traducidos desde _locales/<idioma>/messages.json según el idioma del navegador
const t = (key, substitutions = []) => chrome.i18n.getMessage(key, substitutions.map(String))

const STEPS = [
  { key: 'hangarCategories', label: t('stepHangarCategories') },
  { key: 'hangarPages', label: t('stepHangarPages') },
  { key: 'hangarAssign', label: t('stepHangarAssign') },
  { key: 'buyBackCategories', label: t('stepBuyBackCategories') },
  { key: 'buyBackPages', label: t('stepBuyBackPages') },
  { key: 'buyBackAssign', label: t('stepBuyBackAssign') },
  { key: 'file', label: t('stepFile') }
]

const h2Title = document.querySelector('h2.title')
if (h2Title !== null) {
  const newSection = document.createElement('div')
  newSection.innerHTML = `
    <diV class="gs-wrapper">
      <h2 class="title gs-title">MY HANGAR</h2>
      <div class="gs-section">
        <div class="gs-start-process-button">
        <div class="gs-start-process-button-content">
            <img class="gs-brand-logo" src="${chrome.runtime.getURL('assets/logo.svg')}" alt="">
            <span class="gs-brand-lockup">
              <span class="gs-brand-name" translate="no">guildswarm</span>
              <span class="gs-brand-product">${t('buttonExportHangar')}</span>
            </span>
        </div>
        </div>
      </div>
    </div>
    <div class="gs-modal">
      <div class="gs-modal-content-wrapper">
        <div class="gs-modal-content-bg-gradient"></div>
        <div class="gs-modal-content">
          <button class="gs-close-process-button" type="button" aria-label="${t('buttonClose')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
          <div class="gs-modal-content-header">
            <p class="gs-current-action">${t('statusExporting')}</p>
            <p class="gs-current-step">${t('statusStep', [1, STEPS.length])}</p>
          </div>
          <ol class="gs-steps">
            ${STEPS.map(step => `
            <li class="gs-step" data-step="${step.key}" data-state="pending">
              <span class="gs-step-icon"></span>
              <span class="gs-step-label">${step.label}</span>
              <span class="gs-step-detail"></span>${step.key === 'file'
                ? `
              <span class="gs-done" aria-hidden="true">
                <svg class="gs-done-mark" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" pathLength="1" /><path d="M14.5 24.5l6 6 11-13" pathLength="1" /></svg>
              </span>`
                : ''}
            </li>`).join('')}
          </ol>
          <section class="gs-log">
            <div class="gs-log-header">
              <p class="gs-log-title">${t('logTitle')} (<span class="gs-log-count">0</span>)</p>
              <div class="log-error-file">
                <div class="log-error-file-icon"></div>
                <div class="log-error-file-label">${t('logDownload')}</div>
              </div>
            </div>
            <div class="gs-log-errors gs-scroll-section">
              <div class="gs-log-errors-list"></div>
            </div>
            <details class="gs-errors-help">
              <summary>${t('errorsHelpSummary')}</summary>
              <p>${t('errorsHelpParagraph1')}</p>
              <p>${t('errorsHelpParagraph2')}</p>
            </details>
          </section>
        </div>
      </div>
    </div>`
  const h2TitleParent = h2Title.parentNode
  h2TitleParent.replaceChild(newSection, h2Title)
}

const gsStartProcessButton = document.querySelector('.gs-start-process-button')
const gsLogErrorFile = document.querySelector('.log-error-file')
const closeModalButton = document.querySelector('.gs-close-process-button')
const gsModalElement = document.querySelector('.gs-modal')
const currentActionElement = document.querySelector('.gs-current-action')
const currentStepElement = document.querySelector('.gs-current-step')
const gsLogElement = gsModalElement.querySelector('.gs-log')
const gsLogErrorsList = gsModalElement.querySelector('.gs-log-errors-list')
const gsLogCount = gsModalElement.querySelector('.gs-log-count')
const gsDoneElement = gsModalElement.querySelector('.gs-done')
const historyErrorCollection = []
const hangarElements = []
const buyBackElements = []
let shouldStopProcess = false
let activeStepKey = null
let activeStepErrorCount = 0
let isProcessRunning = false
let lastRun = Promise.resolve()

// Un proceso cancelado sale en cuanto vuelve su petición en curso: el siguiente espera a que termine
gsStartProcessButton?.addEventListener('click', function () {
  if (isProcessRunning) return

  isProcessRunning = true
  lastRun = lastRun
    .then(downloadHangar)
    .catch((error) => {
      isProcessRunning = false
      console.error(error)
    })
})

gsLogErrorFile?.addEventListener('click', function () {
  if (historyErrorCollection.length > 0) {
    downloadHistoryErrorsFile()
  }
})

// La X cierra siempre; si el proceso sigue en marcha, antes lo cancela
closeModalButton?.addEventListener('click', function () {
  if (isProcessRunning) {
    stopProcess()
  }
  gsModalElement.style.display = 'none'
})

const downloadHangar = async () => {
  resetInterface()

  let hangarElementsCategory
  let buyBackElementsCategory
  let page = 1
  let responseCategories

  gsModalElement.style.display = 'flex'

  const visitorCurrency = await switchStoreCurrencyToUsd()
  try {
    const responsePagesInHangar = await sendMessage({ type: 'handleGetNumberOfPagesInHangar' })
    const numberOfPagesInHangar = responsePagesInHangar.numberOfPagesInHangar
    if (numberOfPagesInHangar > 0) {
      if (shouldStopProcess) return

      startStep('hangarCategories')
      responseCategories = await sendMessage({ type: 'handleGetHangarCategories' })
      hangarElementsCategory = responseCategories.hangarElementsCategory
      completeStep('hangarCategories')

      startStep('hangarPages')

      while (page <= numberOfPagesInHangar) {
        if (shouldStopProcess) return

        setActiveStepDetail(t('stepDetailPage', [page, numberOfPagesInHangar]))

        const response = await sendMessage({ type: 'handleGetHangarPage', page })

        if (response.error) {
          const errorMessage = t('errorHangarPage', [page, response.message])
          addLogError(errorMessage)

          for (let elementPositionInPage = 0; elementPositionInPage < 10; elementPositionInPage++) {
            if (shouldStopProcess) return

            setActiveStepDetail(t('stepDetailRetry', [page, elementPositionInPage + 1]))

            const responseElement = await sendMessage({ type: 'handleGetHangarElement', page, elementPositionInPage })

            if (responseElement.error) {
              const errorMessage = t('errorHangarElement', [page, elementPositionInPage + 1, responseElement.message])
              addLogError(errorMessage)
              continue
            }

            if (responseElement.hangarData && responseElement.hangarData.length > 0) {
              hangarElements.push(...responseElement.hangarData)
            }
          }

          page++
          continue
        }

        if (response.hangarData && response.hangarData.length > 0) {
          hangarElements.push(...response.hangarData)
        }

        page++
      }
      completeStep('hangarPages', pagesLabel(numberOfPagesInHangar))

      startStep('hangarAssign')
      assignCategoryToElements(hangarElements, hangarElementsCategory)
      completeStep('hangarAssign')
    } else {
      skipSteps(['hangarCategories', 'hangarPages', 'hangarAssign'])
    }

    const responsePagesInBuyBack = await sendMessage({ type: 'handleGetNumberOfPagesInBuyBack' })
    const numberOfPagesInBuyBack = responsePagesInBuyBack.numberOfPagesInBuyBack
    if (numberOfPagesInBuyBack > 0) {
      if (shouldStopProcess) return

      startStep('buyBackCategories')
      responseCategories = await sendMessage({ type: 'handleGetBuyBackCategories' })
      buyBackElementsCategory = responseCategories.buyBackElementsCategory
      completeStep('buyBackCategories')

      startStep('buyBackPages')

      page = 1
      while (page <= numberOfPagesInBuyBack) {
        if (shouldStopProcess) return

        setActiveStepDetail(t('stepDetailPage', [page, numberOfPagesInBuyBack]))

        const response = await sendMessage({ type: 'handleGetBuyBackPage', page })

        if (response.error) {
          const errorMessage = t('errorBuyBackPage', [page, response.message])
          addLogError(errorMessage)

          for (let elementPositionInPage = 0; elementPositionInPage < 10; elementPositionInPage++) {
            if (shouldStopProcess) return

            setActiveStepDetail(t('stepDetailRetry', [page, elementPositionInPage + 1]))
            const responseElement = await sendMessage({ type: 'handleGetBuyBackElement', page, elementPositionInPage })

            if (responseElement.error) {
              const errorMessage = t('errorBuyBackElement', [page, elementPositionInPage + 1, responseElement.message])
              addLogError(errorMessage)
              continue
            }

            if (responseElement.buyBackData && responseElement.buyBackData.length > 0) {
              buyBackElements.push(...responseElement.buyBackData)
            }
          }

          page++
          continue
        }

        if (response.buyBackData && response.buyBackData.length > 0) {
          buyBackElements.push(...response.buyBackData)
        }

        page++
      }
      completeStep('buyBackPages', pagesLabel(numberOfPagesInBuyBack))

      startStep('buyBackAssign')
      assignCategoryToElements(buyBackElements, buyBackElementsCategory)
      completeStep('buyBackAssign')
    } else {
      skipSteps(['buyBackCategories', 'buyBackPages', 'buyBackAssign'])
    }
  } finally {
    await restoreStoreCurrency(visitorCurrency)
  }

  if (shouldStopProcess) return

  startStep('file')
  downloadFile(hangarElements, buyBackElements)
  completeStep('file')
  finishProcessSuccess()
}

// RSI shows pledge values in the visitor's store currency and the parsers expect USD:
// read everything in USD, then give the visitor their own currency back on every exit path.
const switchStoreCurrencyToUsd = async () => {
  const response = await sendMessage({ type: 'handleGetCurrency' })
  if (response.error || !response.currency) return null
  if (response.currency !== 'USD') {
    await sendMessage({ type: 'handleSetCurrency', currency: 'USD' })
  }
  return response.currency
}

const restoreStoreCurrency = async (currency) => {
  if (!currency || currency === 'USD') return
  let response
  try {
    response = await sendMessage({ type: 'handleSetCurrency', currency })
  } catch (error) {
    response = { error: true, message: error }
  }
  if (response.error) {
    addLogError(t('errorRestoreCurrency', [currency, response.message]))
  }
}

const sendMessage = (message) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message)
      } else if (response) {
        resolve(response)
      } else {
        reject(t('errorNoServiceWorkerResponse', [message.type]))
      }
    })
  })
}

const changeCurrentActionMessage = (message) => {
  currentActionElement.textContent = message
}

const getStepElement = (key) => gsModalElement.querySelector(`.gs-step[data-step="${key}"]`)

const setStepDetail = (key, detail) => {
  getStepElement(key).querySelector('.gs-step-detail').textContent = detail
}

const setActiveStepDetail = (detail) => {
  if (activeStepKey !== null) {
    setStepDetail(activeStepKey, detail)
  }
}

const startStep = (key) => {
  if (shouldStopProcess) return

  activeStepKey = key
  activeStepErrorCount = 0
  const stepNumber = STEPS.findIndex(step => step.key === key) + 1
  currentStepElement.textContent = t('statusStep', [stepNumber, STEPS.length])
  getStepElement(key).dataset.state = 'active'
}

// Un paso con errores se marca como completado con avisos, no en verde
const completeStep = (key, detail = '') => {
  if (shouldStopProcess) return

  const errorsLabel = activeStepErrorCount > 0
    ? t(activeStepErrorCount === 1 ? 'errorsOne' : 'errorsMany', [activeStepErrorCount])
    : ''
  getStepElement(key).dataset.state = activeStepErrorCount > 0 ? 'warning' : 'done'
  setStepDetail(key, [detail, errorsLabel].filter(Boolean).join(' · '))
  activeStepKey = null
}

const skipSteps = (keys) => {
  for (const key of keys) {
    getStepElement(key).dataset.state = 'done'
    setStepDetail(key, t('stepDetailNoItems'))
  }
}

const pagesLabel = (numberOfPages) => t(numberOfPages === 1 ? 'pagesOne' : 'pagesMany', [numberOfPages])

const assignCategoryToElements = (elements, elementsCategory) => {
  if (!Array.isArray(elementsCategory)) return

  for (const elementCategory of elementsCategory) {
    const element = elements.find(element => element.id === elementCategory.pledgeId)
    if (element) {
      element.category = elementCategory.categoryId
    }
  }
}

const downloadFile = () => {
  const blob = new Blob(
    [
      JSON.stringify({
        version: chrome.runtime.getManifest().version,
        myHangar: hangarElements,
        myBuyBack: buyBackElements
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

const downloadHistoryErrorsFile = async () => {
  const content = [
    `Version: ${chrome.runtime.getManifest().version}`,
    `Date: ${(new Date()).toISOString()}`,
    '',
    'Errors:',
    ...historyErrorCollection.map((error, index) => `${index + 1}. ${error}`)
  ].join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hangar-manager-errors_${(new Date()).toISOString().split('T')[0]}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// El bloque de errores solo se muestra a partir del primer error
const addLogError = (error) => {
  historyErrorCollection.push(error)
  if (activeStepKey !== null) {
    activeStepErrorCount++
  }

  const logErrorElement = document.createElement('div')
  logErrorElement.className = 'gs-log-errors-item'
  logErrorElement.innerHTML = '<div class="error-icon"></div><p></p>'
  logErrorElement.querySelector('p').textContent = error
  gsLogErrorsList.appendChild(logErrorElement)

  gsLogCount.textContent = historyErrorCollection.length
  gsLogElement.classList.add('is-visible')
}

// El fichero ya se ha descargado: aparece el círculo que dibuja el anillo y el check
const finishProcessSuccess = () => {
  isProcessRunning = false
  gsDoneElement.classList.add('is-visible')
  changeCurrentActionMessage(t(historyErrorCollection.length > 0 ? 'statusSuccessWithWarnings' : 'statusSuccess'))
  currentStepElement.textContent = t('statusCompleted')
}

const stopProcess = () => {
  shouldStopProcess = true
  isProcessRunning = false
  changeCurrentActionMessage(t('statusStopped'))
  currentStepElement.textContent = t('statusStoppedByUser')

  if (activeStepKey !== null) {
    getStepElement(activeStepKey).dataset.state = 'stopped'
    setStepDetail(activeStepKey, t('stepDetailStopped'))
    activeStepKey = null
  }
}

const resetInterface = () => {
  changeCurrentActionMessage(t('statusExporting'))
  currentStepElement.textContent = t('statusStep', [1, STEPS.length])
  for (const stepElement of gsModalElement.querySelectorAll('.gs-step')) {
    stepElement.dataset.state = 'pending'
    stepElement.querySelector('.gs-step-detail').textContent = ''
  }
  activeStepKey = null
  activeStepErrorCount = 0
  historyErrorCollection.length = 0
  gsLogErrorsList.innerHTML = ''
  gsLogCount.textContent = '0'
  gsLogElement.classList.remove('is-visible')
  gsDoneElement.classList.remove('is-visible')
  hangarElements.length = 0
  buyBackElements.length = 0
  shouldStopProcess = false
}

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
