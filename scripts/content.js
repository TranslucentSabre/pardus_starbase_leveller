var food = Number(document.querySelector("#baserow1").children[2].textContent);
if (food) {
    chrome.storage.local.set({"food":food});
}
var water = Number(document.querySelector("#baserow3").children[2].textContent);
if (water) {
    chrome.storage.local.set({"water":water});
}
chrome.storage.local.get(["food","water"]).then((result) => {
    if (result.loads) {
        loads = result.loads;
    }
    loads++;
    console.log("Test on pardus pages: ", loads);
    chrome.storage.local.set({"loads":loads})
})
