// Add a callback to add a Mutation Observer when the main frame loads
document.querySelector('#main').addEventListener('load', function (e) {
    // This observer lets us know when things change in the main frame so we can save the current food and water values for the base
    // we are at
    frameDoc = e.target.contentWindow.document.body;
    baseForm = frameDoc.querySelector("form[name=starbase_trade]");
    if (baseForm) {
        //Only set up the observer if we are on the base page
        const innerObserver = new MutationObserver( (mutataionList, observer ) => {
            // Rean from storage first so we only save when needed
            chrome.storage.local.get(["food","water"]).then((values) => {
                var food = Number(baseForm.querySelector("#baserow1").children[2].textContent.replaceAll(",",""));
                var water = Number(baseForm.querySelector("#baserow3").children[2].textContent.replaceAll(",",""));
                if ((food && water ) && ( food != values.food || water != values.water)) {
                    //Need to go up one layer so that the right a tag is selected
                    base=frameDoc.querySelector("a").textContent;
                    chrome.storage.local.set({"food":food, "water":water, "base":base}).then(() => {
                       console.log("Saved - Food: "+food+", Water: "+water+", Base: "+base);
                    });
                }
            });
        });
        innerObserver.observe(frameDoc, { subtree: true, attributes: true});
    }
})
