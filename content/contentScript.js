const h2Title = document.querySelector('h2.title')
if (h2Title !== null) {
  const newSection = document.createElement('div')
  newSection.innerHTML = `
    <diV class="gs-wrapper">
      <h2 class="title gs-title">MY HANGAR</h2>
      <div class="gs-section">
        <a id="guildswarm-download" class="shadow-button trans-02s trans-color">
        <span class="label trans-02s">Guildswarm - Download Hangar data</span>
        <span class="icon gs-icon trans-02s"></span>
        <span class="left-section"></span>
        <span class="right-section"></span>
      </a>
      </div>
    </div>
    <div class="gs-modal">
      <div class="gs-modal-content-wrapper">
        <div class="gs-modal-content-bg-gradient"></div>
        <div class="gs-modal-content-bg-image"></div>
        <div class="gs-modal-content">
          <div class="gs-modal-content-header">
            <p class="gs-current-action h3-subtitle">Recorriendo el hangar para buscar categorias</p>
            <p class="h3-subtitle">Paso 1 de 6</p>
            <div class="gs-progress-bar">
              <div class="gs-progress-bar-percentage"></div>
              <div class="gs-progress-bar-percentage-label gs-text">10%</div>
              <div class="gs-progress-bar-coffee"></div>
            </div>  
          </div>
          <P class="gs-little-text">Historial de errores:</P>
          <div class="gs-log-errors gs-scroll-section">
            <div class="gs-log-errors-list">
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
              <div class="gs-log-errors-item">
                <div class="error-icon"></div>
                <p class="gs-little-x2-text">Error al recorrer la página 1. Error: Error al recorrer elementos individualmente (página 1, elemento 1).</p>
              </div>
            </div>
            <div class="gs-log-errors-footer">
              <div class="log-error-file">
                <div class="log-error-file-icon"></div>
                <div class="log-error-file-label gs-little-x2-text">Log error</div>
              </div>
            </div>
          </div>
          <div class="gs-modal-footer">
            <button class="gs-stop-process-button gs-little-text">Detener proceso</button>
          </div>
<!--          <div class="gs-modal-content-body">-->
<!--            <div>-->
<!--              <div class="gs-progress-wrapper">-->
<!--                <p><strong>Progreso:</strong></p>-->
<!--                <div class="gs-progress-point-wrapper">-->
<!--                    <div class="gs-progress-interpoint"></div>-->
<!--                    <div class="gs-progress-point one">1</div>-->
<!--                    <div class="gs-progress-point two">2</div>-->
<!--                    <div class="gs-progress-point three">3</div>-->
<!--                    <div class="gs-progress-point four">4</div>-->
<!--                    <div class="gs-progress-point five">5</div>-->
<!--                    <div class="gs-progress-point six">6</div>-->
<!--                </div>-->
<!--              </div>-->
<!--              <div>-->
<!--                  <p><strong>Acción actual:</strong></p>-->
<!--                  <div class="gs-current-action-wrapper">-->
<!--                    <div class="gs-loader-wrapper">-->
<!--                        <span class="gs-loader"></span>-->
<!--                        <div class="gs-process-finished"></div>-->
<!--                    </div>-->
<!--                    <p id="guildswarm-current-action" class="gs-current-action">Empezando el proceso</p>-->
<!--                  </div>-->
<!--              </div>-->
<!--              <div>-->
<!--                  <p><strong>Historial de errores encontrados:</strong></p>-->
<!--                  <ul class="gs-cutom-list gs-scroll-section" id="guildswarm-history-error"></ul>-->
<!--              </div>-->
<!--            </div>-->
<!--            <div class="gs-modal-footer">-->
<!--                <button id="guildswarm-close-modal">Cerrar</button>-->
<!--            </div>-->
<!--          </div>-->
        </div>
      </div>
    </div>`
  const h2TitleParent = h2Title.parentNode
  h2TitleParent.replaceChild(newSection, h2Title)
}

const gsModalElement = document.querySelector('.gs-modal')
const gsModalFooterElement = document.querySelector('.gs-modal-footer')
const progressPointOne = document.querySelector('.gs-progress-point.one')
const progressPointTwo = document.querySelector('.gs-progress-point.two')
const progressPointThree = document.querySelector('.gs-progress-point.three')
const progressPointFour = document.querySelector('.gs-progress-point.four')
const progressPointFive = document.querySelector('.gs-progress-point.five')
const progressPointSix = document.querySelector('.gs-progress-point.six')
const progressInterpoint = document.querySelector('.gs-progress-interpoint')
const loaderElement = document.querySelector('.gs-loader')
const processFinishedElement = document.querySelector('.gs-process-finished')
const currentActionElement = document.querySelector('.gs-current-action')
const historyErrorElement = document.querySelector('#guildswarm-history-error')

document.addEventListener('click', function (e) {
  const target = e.target.closest('#guildswarm-download')
  if (target) {
    downloadHangar()
  }
})

document.addEventListener('click', function (e) {
  const target = e.target.closest('#guildswarm-close-modal')
  if (target) {
    gsModalElement.style.display = 'none'
    resetInterface()
  }
})

const fetchNumberOfPagesInHangar = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getNumberOfPagesInHangar' },
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

const fetchNumberOfPagesInBuyBack = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getNumberOfPagesInBuyBack' },
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
          if (response.error) {
            reject(response)
          }

          resolve(response)
        } else {
          reject('No se recibió respuesta del Service Worker.')
        }
      }
    )
  })
}

const fetchBuyBackElement = (page, elementPositionInPage) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'getBuyBackElement', page, elementPositionInPage },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else if (response) {
          if (response.error) {
            reject(response)
          }

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
  myBuyBack
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

const assignCategoryToElements = (elements, elementsCategory) => {
  for (const elementCategory of elementsCategory) {
    const element = elements.find(element => element.id === elementCategory.pledgeId)
    if (element) {
      element.category = elementCategory.categoryId
    }
  }
}

const downloadHangar = async () => {
  gsModalElement.style.display = 'flex'
  // let hangarElementsCategory = []
  // let hangarElements = []
  // let buyBackElementsCategory = []
  // let buyBackElements = []
  // let page = 1
  // let responseCategories
  //
  // gsModalElement.style.display = 'block'
  // const currentCurrency = await fetchGetCurrency()
  //
  // const responsePagesInHangar = await fetchNumberOfPagesInHangar()
  // if (responsePagesInHangar.numberOfPagesInHangar > 0) {
  //   currentActionElement.innerHTML = 'Recorriendo el hangar para buscar las categorías'
  //   await sleep(1000)
  //   responseCategories = await fetchHangarCategories()
  //   hangarElementsCategory = responseCategories.hangarElementsCategory
  //   progressPointOne.classList.add('completed')
  //
  //   while (page <= responsePagesInHangar.numberOfPagesInHangar) {
  //     currentActionElement.innerHTML = `Recorriendo la página ${page} de ${responsePagesInHangar.numberOfPagesInHangar} del hangar`
  //     const responsePage = await fetchHangarPage(page)
  //     if (!responsePage.hangarData || responsePage.hangarData.length === 0) break
  //     hangarElements = [...hangarElements, ...responsePage.hangarData]
  //     page++
  //   }
  //   progressPointTwo.classList.add('completed')
  //   progressInterpoint.classList.add('point-2')
  //   await sleep(1000)
  //
  //   currentActionElement.innerHTML = 'Asociando categorías a los elementos del hangar'
  //   await sleep(1000)
  //   assignCategoryToElements(hangarElements, hangarElementsCategory)
  //   progressPointThree.classList.add('completed')
  //   progressInterpoint.classList.add('point-3')
  //   await sleep(1000)
  // }
  //
  // const responsePagesInBuyBack = await fetchNumberOfPagesInBuyBack()
  // if (responsePagesInBuyBack.numberOfPagesInBuyBack > 0) {
  //   currentActionElement.innerHTML = 'Recorriendo el buyback para buscar las categorias'
  //   await sleep(1000)
  //
  //   responseCategories = await fetchBuyBackCategories()
  //   buyBackElementsCategory = responseCategories.buyBackElementsCategory
  //
  //   progressPointFour.classList.add('completed')
  //   progressInterpoint.classList.add('point-4')
  //   await sleep(1000)
  //
  //   page = 1
  //   while (page <= responsePagesInBuyBack.numberOfPagesInBuyBack) {
  //     currentActionElement.innerHTML = `Recorriendo la página ${page} de ${responsePagesInBuyBack.numberOfPagesInBuyBack} del buyback`
  //     let responsePage
  //     try {
  //       responsePage = await fetchBuyBackPage(page)
  //     } catch (error) {
  //       historyErrorElement.innerHTML += `<li>Error al recorrer la página ${page}. Error: ${error.message}</li>`
  //
  //       for (let elementPositionInPage = 0; elementPositionInPage < 10; elementPositionInPage++) {
  //         currentActionElement.innerHTML = `Error al recorrer la página ${page}. Intentando recorrer elementos individualmente, elemento actual: ${elementPositionInPage + 1}`
  //         let responseElement
  //         try {
  //           responseElement = await fetchBuyBackElement(page, elementPositionInPage)
  //         } catch (error) {
  //           historyErrorElement.innerHTML += `<li>Error al recorrer elementos individualmente (página ${page}, elemento ${elementPositionInPage + 1}). Error: ${error.message}</li>`
  //           continue
  //         }
  //
  //         if (responseElement.buyBackData && responseElement.buyBackData.length > 0) {
  //           buyBackElements = [...buyBackElements, ...responseElement.buyBackData]
  //         }
  //       }
  //
  //       page++
  //       continue
  //     }
  //
  //     if (responsePage.buyBackData && responsePage.buyBackData.length > 0) {
  //       buyBackElements = [...buyBackElements, ...responsePage.buyBackData]
  //     }
  //     page++
  //   }
  //   progressPointFive.classList.add('completed')
  //   progressInterpoint.classList.add('point-5')
  //   await sleep(1000)
  //
  //   currentActionElement.innerHTML = 'Asociando categorías a los elementos del buyback'
  //   await sleep(1000)
  //   assignCategoryToElements(buyBackElements, buyBackElementsCategory)
  //
  //   progressPointSix.classList.add('completed')
  //   progressInterpoint.classList.add('point-6')
  //   await sleep(1000)
  // }
  //
  // await fetchSetCurrency(currentCurrency)
  // currentActionElement.innerHTML = 'Generando el fichero con los datos'
  // await sleep(1000)
  //
  // downloadFile(hangarElements, buyBackElements)
  // finishProcessSuccess()
}

const finishProcessSuccess = () => {
  gsModalFooterElement.style.display = 'flex'
  loaderElement.style.display = 'none'
  processFinishedElement.style.display = 'block'
  currentActionElement.innerHTML = 'Proceso finalizado'
}

const resetInterface = () => {
  gsModalFooterElement.style.display = 'none'
  loaderElement.style.display = 'block'
  processFinishedElement.style.display = 'none'
  historyErrorElement.innerHTML = ''
  currentActionElement.innerHTML = 'Empezando el proceso'
  progressPointSix.classList.remove('completed')
  progressPointFive.classList.remove('completed')
  progressPointFour.classList.remove('completed')
  progressPointThree.classList.remove('completed')
  progressPointTwo.classList.remove('completed')
  progressPointOne.classList.remove('completed')
  progressInterpoint.classList.remove('point-1')
  progressInterpoint.classList.remove('point-2')
  progressInterpoint.classList.remove('point-3')
  progressInterpoint.classList.remove('point-4')
  progressInterpoint.classList.remove('point-5')
  progressInterpoint.classList.remove('point-6')
}

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
