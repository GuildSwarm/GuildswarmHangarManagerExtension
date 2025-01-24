chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    /https:\/\/robertsspaceindustries.com\/.*?\/account\/pledges/.test(tab.url)
  ) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['./hangarScript.js']
    })
  }
})
