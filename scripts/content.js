// Add a callback to add a Mutation Observer when the main frame loads
document.querySelector('#main').addEventListener('load', function (e) {
    // This observer lets us know when things change in the main frame so we can save the current food and water values for the base
    // we are at
    const innerObserver = new MutationObserver( (mutataionList, observer ) => {
        frame = document.querySelector("#main").contentWindow.document.querySelector("form[name=starbase_trade]");
        // Only check values to save if we can find the "starbase_trade" form
        if (frame) {
            // Rean from storage first so we only save when needed
            chrome.storage.local.get(["food","water"]).then((values) => {
                var food = Number(frame.querySelector("#baserow1").children[2].textContent.replaceAll(",",""));
                var water = Number(frame.querySelector("#baserow3").children[2].textContent.replaceAll(",",""));
                if ((food && water ) && ( food != values.food || water != values.water)) {
                    chrome.storage.local.set({"food":food, "water":water}).then(() => {
                       console.log("Saved - Food: "+food+", Water: "+water);
                    });
                }
            });
        }
    });
    innerObserver.observe(e.target.contentWindow.document.body, { subtree: true, attributes: true});
})
