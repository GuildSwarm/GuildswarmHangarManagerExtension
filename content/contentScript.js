const h2Title = document.querySelector('h2.title')
if (h2Title !== null) {
  const newSection = document.createElement('div')
  newSection.innerHTML = `
    <diV class="gs-wrapper">
      <h2 class="title gs-title">MY HANGAR</h2>
      <div class="gs-section">
        <div class="gs-start-process-button">
        <div class="gs-start-process-button-content">
            <div class="gs-logo"></div>
            <p class="gs-little-little">Hangar Manager</p>
        </div>
        </div>
      </div>
    </div>
    <div class="gs-modal">
      <div class="gs-modal-content-wrapper">
        <div class="gs-modal-content-bg-gradient"></div>
        <div class="gs-modal-content-bg-image"></div>
        <div class="gs-modal-content">
          <div class="gs-modal-content-header">
            <p class="gs-current-action h3-subtitle">Empezando el proceso</p>
            <p class="gs-current-step h3-subtitle">Paso 1 de 7</p>
            <div class="gs-progress-bar">
              <div class="gs-progress-bar-percentage"></div>
              <div class="gs-progress-bar-percentage-label gs-text">0%</div>
              <div class="gs-progress-bar-coffee"></div>
            </div>  
          </div>
          <P class="gs-little-text">Historial de errores:</P>
          <div class="gs-log-errors gs-scroll-section">
            <div class="gs-log-errors-list">
            </div>
            <div class="gs-log-errors-footer">
              <div class="log-error-file">
                <div class="log-error-file-icon"></div>
                <div class="log-error-file-label gs-little-x2-text">Log error</div>
              </div>
            </div>
          </div>
          <div class="gs-modal-footer">
            <div class="gs-errors-explanation">
              <p class="gs-little-text">¿Qué son estos errores?</p>
              <div class="tooltip-text">
                <p class="gs-little-text">En algunos casos, al solicitar información a la web de RSI, pueden ocurrir errores que impidan obtener los datos de una página completa. Cuando esto sucede, nuestra aplicación intenta recuperar la información de manera individual para cada artículo de esa página. Si este método alternativo también falla, el artículo no podrá incluirse en el fichero debido a la falta de datos disponibles.</p>
                <p class="gs-little-text">Lamentamos los posibles inconvenientes que esto pueda causar. Estos errores son provocados por restricciones en la web de RSI y, aunque hacemos todo lo posible para minimizar su impacto, hay ocasiones en las que no es posible recuperar algunos artículos.</p>
              </div>
            </div>
            <div class="gs-actions-buttons">
              <button class="gs-stop-process-button gs-little-text">Detener proceso</button>
              <button class="gs-download-file-button gs-little-text">Descargar Fichero</button>
              <button class="gs-close-process-button gs-little-text">Cerrar</button>
            </div>
          </div>
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
const progressBar = document.querySelector('.gs-progress-bar-percentage')
const progressBarLabel = document.querySelector('.gs-progress-bar-percentage-label')
const stopProcessButton = document.querySelector('.gs-stop-process-button')
const downloadFileButton = document.querySelector('.gs-download-file-button')
const historyErrorCollection = []
const hangarElements = []
const buyBackElements = []

gsStartProcessButton?.addEventListener('click', function () {
  downloadHangar()
})

downloadFileButton.addEventListener('click', function () {
  downloadFile()
})

gsLogErrorFile?.addEventListener('click', function () {
  if (historyErrorCollection.length > 0) {
    downloadHistoryErrorsFile()
  }
})

closeModalButton?.addEventListener('click', function () {
  gsModalElement.style.display = 'none'
})

// const fetchBuyBackPage = (page) => {
//   return new Promise((resolve, reject) => {
//     chrome.runtime.sendMessage(
//       { type: 'getBuyBackPage', page },
//       (response) => {
//         if (chrome.runtime.lastError) {
//           reject(chrome.runtime.lastError.message)
//         } else if (response) {
//           if (response.error) {
//             reject(response)
//           }
//
//           resolve(response)
//         } else {
//           reject('No se recibió respuesta del Service Worker.')
//         }
//       }
//     )
//   })
// }

const downloadHangar = async () => {
  resetInterface()

  let hangarElementsCategory
  let buyBackElementsCategory
  let page = 1
  let responseCategories
  let progress = 0

  gsModalElement.style.display = 'flex'
  // await sleep(1000)

  const currentCurrency = await sendMessage({ type: 'handleGetCurrency' })
  const responsePagesInHangar = await sendMessage({ type: 'handleGetNumberOfPagesInHangar' })
  if (responsePagesInHangar.numberOfPagesInHangar > 0) {
    currentActionElement.innerHTML = 'Recorriendo el hangar para buscar las categorías'
    // await sleep(1000)

    responseCategories = await sendMessage({ type: 'handleGetHangarCategories' })
    hangarElementsCategory = responseCategories.hangarElementsCategory

    progress = 10
    setProgressByPercentage(progress)
    currentStepElement.innerHTML = 'Paso 2 de 7'

    while (page <= responsePagesInHangar.numberOfPagesInHangar) {
      currentActionElement.innerHTML = `Recorriendo la página ${page} de ${responsePagesInHangar.numberOfPagesInHangar} del hangar`
      const responsePage = await sendMessage({ type: 'handleGetHangarPage', page })
      if (!responsePage.hangarData || responsePage.hangarData.length === 0) break
      hangarElements.push(...responsePage.hangarData)

      progress += (30 / responsePagesInHangar.numberOfPagesInHangar)
      setProgressByPercentage(progress)

      page++
    }
    currentStepElement.innerHTML = 'Paso 3 de 7'

    currentActionElement.innerHTML = 'Asociando categorías a los elementos del hangar'
    // await sleep(1000)
    assignCategoryToElements(hangarElements, hangarElementsCategory)
    progress = 45
    setProgressByPercentage(progress)
    currentStepElement.innerHTML = 'Paso 4 de 7'
  }

  const responsePagesInBuyBack = await sendMessage({ type: 'handleGetNumberOfPagesInBuyBack' })
  if (responsePagesInBuyBack.numberOfPagesInBuyBack > 0) {
    currentActionElement.innerHTML = 'Recorriendo el buyback para buscar las categorias'
    // await sleep(1000)

    responseCategories = await sendMessage({ type: 'handleGetBuyBackCategories' })
    buyBackElementsCategory = responseCategories.buyBackElementsCategory

    progress = 50
    setProgressByPercentage(progress)
    currentStepElement.innerHTML = 'Paso 5 de 7'
    // await sleep(1000)

    page = 1
    while (page <= responsePagesInBuyBack.numberOfPagesInBuyBack) {
      currentActionElement.innerHTML = `Recorriendo la página ${page} de ${responsePagesInBuyBack.numberOfPagesInBuyBack} del buyback`
      let responsePage
      try {
        responsePage = await sendMessage({ type: 'handleGetBuyBackPage', page })
      } catch (error) {
        const errorMessage = `Error al recorrer la página ${page}. Error: ${error.message}`
        addLogError(errorMessage)

        for (let elementPositionInPage = 0; elementPositionInPage < 10; elementPositionInPage++) {
          currentActionElement.innerHTML = `Error al recorrer la página ${page}. Intentando recorrer elementos individualmente, elemento actual: ${elementPositionInPage + 1}`
          let responseElement
          try {
            responseElement = await sendMessage({ type: 'handleGetBuyBackElement', page, elementPositionInPage })
          } catch (error) {
            const errorMessage = `Error al recorrer elementos individualmente (página ${page}, elemento ${elementPositionInPage + 1}). Error: ${error.message}`
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

      if (responsePage.buyBackData && responsePage.buyBackData.length > 0) {
        buyBackElements.push(...responsePage.buyBackData)
      }

      progress += (30 / responsePagesInBuyBack.numberOfPagesInBuyBack)
      setProgressByPercentage(progress)

      page++
    }
    currentStepElement.innerHTML = 'Paso 6 de 7'

    currentActionElement.innerHTML = 'Asociando categorías a los elementos del buyback'
    // await sleep(1000)
    assignCategoryToElements(buyBackElements, buyBackElementsCategory)

    progress = 90
    setProgressByPercentage(progress)
  }

  await sendMessage({ type: 'handleSetCurrency', currentCurrency })
  currentActionElement.innerHTML = 'Generando el fichero con los datos'
  // await sleep(1000)
  progress = 100
  setProgressByPercentage(progress)
  currentStepElement.innerHTML = 'Paso 7 de 7'

  downloadFile(hangarElements, buyBackElements)
  finishProcessSuccess()
}

const sendMessage = (message) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message)
      } else if (response) {
        resolve(response)
      } else {
        console.warn(message)
        reject(`No se recibió respuesta del Service Worker. Message.type:${message.type}`)
      }
    })
  })
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

const assignCategoryToElements = (elements, elementsCategory) => {
  if (!Array.isArray(elementsCategory)) {
    console.warn('elementsCategory no es un array válido:', elementsCategory)
    return
  }

  for (const elementCategory of elementsCategory) {
    const element = elements.find(element => element.id === elementCategory.pledgeId)
    if (element) {
      element.category = elementCategory.categoryId
    }
  }
}

const setProgressByPercentage = (percentage) => {
  const totalWidth = 374
  const pixels = (percentage / 100) * totalWidth
  if (percentage === 100) {
    progressBar.classList.add('gs-progress-bar-percentage-completed')
  }
  progressBar.style.width = `${pixels}px`
  const roundedPercentage = Math.round(percentage)
  progressBarLabel.innerHTML = `${roundedPercentage}%`
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

const addLogError = (error) => {
  historyErrorCollection.push(error)
  const logErrorElement = document.createElement('div')
  logErrorElement.innerHTML = `
      <div class="gs-log-errors-item">
        <div class="error-icon"></div>
        <p class="gs-little-x2-text">${error}</p>
      </div>`
  gsModalElement.querySelector('.gs-log-errors-list').appendChild(logErrorElement)
}

const finishProcessSuccess = () => {
  stopProcessButton.style.display = 'none'
  closeModalButton.style.display = 'flex'
  downloadFileButton.style.display = 'flex'
  currentActionElement.innerHTML = '¡Éxito!'
  currentStepElement.innerHTML = 'Proceso completado'
}

const resetInterface = () => {
  currentActionElement.innerHTML = 'Iniciando el proceso'
  currentStepElement.innerHTML = 'Paso 1 de 7'
  progressBar.style.width = '0%'
  progressBarLabel.innerHTML = '0%'
  historyErrorCollection.length = 0
  hangarElements.length = 0
  buyBackElements.length = 0
  stopProcessButton.style.display = 'flex'
  closeModalButton.style.display = 'none'
  downloadFileButton.style.display = 'none'
}

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
