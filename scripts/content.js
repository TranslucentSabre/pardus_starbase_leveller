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
        innerObserver.observe(baseForm, { subtree: true, attributes: true});
    }

    planetForm = frameDoc.querySelector("form[name=planet_trade]");
    if (planetForm) {
        //Only set up the observer if we are on the planet page
        const innerObserver = new MutationObserver( (mutataionList, observer ) => {
            chrome.storage.local.get(["food","water","base"]).then((values) => {
                //Discover capacity
                goodsStorage = {};
                rows=planetForm.querySelectorAll('tr[id^="shiprow"]')
                rows.forEach((row) => {
                    id = row.id.replace("shiprow","");
                    sell = row.querySelector("input");
                    //Use the manually entered sell quantity if present
                    if (sell && (sell.value != "")) { goodsStorage[id]=Number(sell.value); return; }
                    ship = Number(row.children[2].textContent);
                    //Exclude fuel from selling unless explicitly listed above
                    if (ship != "0" && id != "16" ) { goodsStorage[id]=Number(ship) }
                });
                capacity = Number(planetForm.querySelector('td[colspan="3"]').textContent.replace("t",""))
                values["capacity"] = Object.values(goodsStorage).reduce((acc, curr) => acc + curr, capacity);
                console.log(values);
                output = level(values);
                console.log(output, values);
            });
        });
        innerObserver.observe(planetForm, { subtree: true, attributes: true});
    }
})

function level (input) {
    output={};
    output.food=0;
    output.water=0;

    if( input.food != 0 && input.water != 0 && input.capacity != 0){
        if (water_deficit(input.food,input.water)) {
            output.food=get_food(input.food,input.water,input.capacity);
            while (!Number.isInteger(output.food)) {
                input.capacity-=1;
                output.food=get_food(input.food,input.water,input.capacity);
            }
            output.water=input.capacity-output.food;
        } else {
            output.water=get_water(input.food,input.water,input.capacity);
            while (!Number.isInteger(output.water)) {
                input.capacity=input.capacity-1;
                output.water=get_water(input.food,input.water,input.capacity);
            }
            output.food=input.capacity-output.water;
        }
    }
    return output
}

function div_edge_case(value) {
    floor = Math.floor(value);
    return ( value - floor > 0.001 ) ? value : floor;
}

function water_deficit (food, water) {
    return ((food*(2/3)-water) > 0);
}

function get_food (food, water, capacity) {
    first_order = food * (2/3) - water - capacity;
    if ( first_order >= 0 ) {
        return 0;
    } else {
        return div_edge_case(Math.abs((first_order*3)/5));
    }
}

function get_water (food, water, capacity) {
    first_order = water * (3/2) - food - capacity;
    if ( first_order >= 0 ) {
        return 0;
    } else {
        return div_edge_case(Math.abs((first_order*2)/5));
    }
}
