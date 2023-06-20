var loads = 0;
chrome.storage.local.get(["loads"]).then((result) => {
    if (result.loads) {
        loads = result.loads;
    }
    loads++;
    console.log("Test on pardus pages: ", loads);
    chrome.storage.local.set({"loads":loads})
})
