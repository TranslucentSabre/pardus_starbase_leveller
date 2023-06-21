// Add a callback to calculate and save our data when the page loads
document.querySelector('#main').addEventListener('load', function (e) {
    frameDoc = e.target.contentWindow.document.body;
    baseForm = frameDoc.querySelector("form[name=starbase_trade]");
    if (baseForm) {
        //Need to go up one layer so that the right a tag is selected
        base=frameDoc.querySelector("a").textContent;
        // Read from storage first so we only save when needed
        chrome.storage.local.get(["bases"]).then((values) => {
            var food = Number(baseForm.querySelector("#baserow1").children[2].textContent.replaceAll(",",""));
            var water = Number(baseForm.querySelector("#baserow3").children[2].textContent.replaceAll(",",""));
            if ((food && water ) && ( (!values.bases || !values.bases[base]) || (food != values.bases[base].food || water != values.bases[base].water))) {
                saveObj={"base": base, "bases": values.bases}
                saveObj.bases[base] = {"food": food, "water": water}
                chrome.storage.local.set(saveObj).then(() => {
                    console.log("Saved - Food: "+food+", Water: "+water+", Base: "+base);
                });
            }
        });
    }

    planetForm = frameDoc.querySelector("form[name=planet_trade]");
    if (planetForm) {
        // This calculation is functionalized so the we can recurse if a sell input is manually operated
        planet_calculation();
    }
})

function planet_calculation() {
    chrome.storage.local.get(["bases","base"]).then((values) => {
        //Discover capacity
        goodsStorage = {};
        rows=planetForm.querySelectorAll('tr[id^="shiprow"]')
        rows.forEach((row) => {
            id = row.id.replace("shiprow","");
            sell = row.querySelector("#sell_"+id);
            //Use the manually entered sell quantity if present, and eventlisteners to update if we manually change
            if (sell) {
                if (! sell.hasAttribute("planet_calculation") ) {
                    sell.setAttribute("planet_calculation",true);
                    sell.addEventListener("input", e => planet_calculation() );
                }
                if (sell.value != "") { goodsStorage[id]=Number(sell.value); return; }
            }
            ship = Number(row.children[2].textContent);
            //Exclude fuel from selling unless explicitly sold above
            if (ship != "0" && id != "16" ) { goodsStorage[id]=Number(ship) }
        });
        // Calculate our buying capacity if we sell everything to the planet, start by reading our empty space
        capacity = Number(planetForm.querySelector('td[colspan="3"]').textContent.replace("t",""))
        input = {"food": values.bases[values.base].food, "water": values.bases[values.base].water}
        input["capacity"] = Object.values(goodsStorage).reduce((acc, curr) => acc + curr, capacity);
        console.log(input);
        output = level(input);
        console.log(output, input);

        myButton = planetForm.querySelector("#levelStarbase");
        if ( ! myButton) {
            //Add our new button if not already present
            newButton = document.createElement("input");
            newButton.type = "submit";
            newButton.id = "levelStarbase";
            newButton.value = "Level Starbase";
            newButton.style = "width: 175px; height: 35px;";
            //Add drop to select base to level
            bases = document.createElement("select");
            bases.id = "levelStarbases";
            bases.onchange = selectBase;
            Object.keys(values.bases).forEach( base => {
                option = document.createElement("option");
                option.value = base;
                option.text = base;
                bases.appendChild(option);
            });
            bases.value = values.base;
            //Get the selectors necessary for insertion
            buttons = planetForm.querySelector("#quickButtons");
            preview = planetForm.querySelector("#preview_checkbox_line");
            //Add the new elements
            buttons.insertBefore(newButton,preview);
            buttons.insertBefore(bases,preview);
            buttons.insertBefore(document.createElement("br"),preview);
            buttons.insertBefore(document.createElement("br"),preview);
            buttons.insertBefore(document.createElement("br"),preview);
            myButton = newButton;
        }
        //Generate button action, this action uses 1st party javascript functions so it respects the preview checkbox
        sellGoods=[];
        Object.keys(goodsStorage).forEach( key => sellGoods.push('"'+key+'": '+goodsStorage[key]) );
        clickAction='resetForm(); quickSell({'+sellGoods.join(",")+'}); quickBuy({"1": '+output.food+', "3": '+output.water+'}); submitTradeForm(); return false';
        myButton.setAttribute("onclick",clickAction);
    });
}

function selectBase() {
    saveObj = {"base": planetForm.querySelector("#levelStarbases").value};
    chrome.storage.local.set(saveObj).then(() => {
        planet_calculation();
    });
}

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
