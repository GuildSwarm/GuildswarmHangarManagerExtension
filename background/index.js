import { getHangarPage } from './hangar.js'

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    /https:\/\/robertsspaceindustries.com\/account\/pledges/.test(tab.url)
  ) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['./hangarScript.js']
    })
  }
})

chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'getHangarData') {
    const page = message.page || 1
    try {
      const hangarData = await getHangarPage(page)
      sendResponse({ page, hangarData })
    } catch (error) {
      console.error('Error fetching hangar data:', error)
      sendResponse({ error: error.message })
    }
  }
  return true // Indica que la respuesta será asincrónica
})
