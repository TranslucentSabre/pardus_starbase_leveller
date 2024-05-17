tradeForm = document.forms.starbase_trade || document.forms.planet_trade;
if (tradeForm == document.forms.starbase_trade) {
    //Need to go up one layer so that the right a tag is selected
    base=document.querySelector("a").textContent;
    // Read from storage first so we only save when needed
    chrome.storage.local.get(["bases"]).then((values) => {
        var food = Number(tradeForm.querySelector("#baserow1").children[2].textContent.replaceAll(",",""));
        var water = Number(tradeForm.querySelector("#baserow3").children[2].textContent.replaceAll(",",""));
        if ((food && water ) && ( (!values.bases || !values.bases[base]) || (food != values.bases[base].food || water != values.bases[base].water))) {
            saveObj={"base": base, "bases": values.bases ? values.bases : {}}
            saveObj.bases[base] = {"food": food, "water": water}
            chrome.storage.local.set(saveObj).then(() => {
                //console.log("Saved - Food: "+food+", Water: "+water+", Base: "+base);
            });
        }
    });
}

if (tradeForm == document.forms.planet_trade) {
    // This calculation is functionalized so the we can recurse if a sell input is manually operated or the base to level is changed
    planet_calculation();
}

function planet_calculation() {
    chrome.storage.local.get(["bases","base","direction"]).then((values) => {
        if (!values.hasOwnProperty("direction")) {
            values.direction = true;
        }
        //Discover capacity
        goodsStorage = {};
        rows=tradeForm.querySelectorAll('tr[id^="shiprow"]')
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
            //Do a special check for fuel
            if ( id == "16" ) ship = checkForFuelSelling(ship, values.direction);
            if (ship != "0" ) { 
                goodsStorage[id]=Number(ship)
            }
        });
        // Calculate our buying capacity if we sell everything to the planet, start by reading our empty space
        capacity = Number(tradeForm.querySelector('td[colspan="3"]').textContent.replace("t",""))
        input = {"food": values.bases[values.base].food, "water": values.bases[values.base].water}
        input["capacity"] = Object.values(goodsStorage).reduce((acc, curr) => acc + curr, capacity);
        //console.log(input);
        if ( values.direction ) {
            output = level_max(input);
        } else {
            output = level_min(input);
        }
        //console.log(output, input);

        myButton = tradeForm.querySelector("#levelStarbase");
        if ( ! myButton) {
            //Add our new button if not already present
            newButton = document.createElement("input");
            newButton.type = "submit";
            newButton.id = "levelStarbase";
            // Value not set here, so that we can update it later
            newButton.style = "width: 175px; height: 35px;";
            label = document.createElement("label");
            label.innerText = "Minimal Leveling: ";
            //Add a checkbox to
            direction = document.createElement("input");
            direction.type = "checkbox";
            direction.id = "levelDirection";
            direction.onchange = setDirection;
            direction.checked = ! values.direction;
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
            buttons = tradeForm.querySelector("#quickButtons");
            preview = tradeForm.querySelector("#preview_checkbox_line");
            //Add the new elements
            buttons.insertBefore(label,preview);
            buttons.insertBefore(direction,preview);
            buttons.insertBefore(document.createElement("br"),preview);
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
        myButton.value = "Level Starbase";
        if (! values.direction) {
            myButton.value = "Level Starbase ( Min )"
        }
    });
}

function checkForFuelSelling(ship, max_level) {
    // Cooperate with Bookkeeper's fuel space field
    fuelInput = tradeForm.querySelector("#bookkeeper-fuel");
    fuelCb = tradeForm.querySelector("#bookkeeper-fuel-cb");
    if( fuelInput && fuelCb && max_level ) {
        if ( fuelInput.value != "" && fuelCb.checked ) {
            fsell = ship - Number(fuelInput.value);
            if ( fsell > 0 ) {
                return fsell;
            }
        }
    }
    return 0;
}

function selectBase() {
    saveObj = {"base": tradeForm.querySelector("#levelStarbases").value};
    chrome.storage.local.set(saveObj).then(() => {
        planet_calculation();
    });
}

function setDirection() {
    saveObj = {"direction": (! tradeForm.querySelector("#levelDirection").checked)};
    chrome.storage.local.set(saveObj).then(() => {
        planet_calculation();
    });
}

function level_min(input) {
    output={};
    output.food=0;
    output.water=0;

    waterNeed = get_water_needed(input.food, input.water);
    if ( waterNeed > 0 ) {
        setVal = Math.min(waterNeed,input.capacity);
        foodNeed = 0;
        while (!Number.isInteger(div_edge_case(setVal))) {
            foodNeed += 1;
            setVal = get_water_needed(input.food + foodNeed, input.water)
        }
        output.food = foodNeed;
        output.water = setVal;
    } else if ( waterNeed < 0 ) {
        setVal = Math.min(get_food_needed(input.food, input.water), input.capacity);
        waterNeed = 0;
        while (!Number.isInteger(div_edge_case(setVal))) {
            waterNeed += 1;
            setVal = get_food_needed(input.food, input.water + waterNeed)
        }
        output.food = setVal;
        output.water = waterNeed;
    }
    // Intentionally leave out the == 0 case, we want to return 0, 0 in this case

    return output;
}

function level_max (input) {
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

function get_water_needed (food, water) {
    return (food*(2/3)-water);
}

function get_food_needed (food, water) {
    return (water*(3/2)-food);
}

function water_deficit (food, water) {
    return (get_water_needed(food,water) > 0);
}

function get_food (food, water, capacity) {
    first_order = get_water_needed(food, water) - capacity;
    if ( first_order >= 0 ) {
        return 0;
    } else {
        return div_edge_case(Math.abs((first_order*3)/5));
    }
}

function get_water (food, water, capacity) {
    first_order = get_food_needed(food, water) - capacity;
    if ( first_order >= 0 ) {
        return 0;
    } else {
        return div_edge_case(Math.abs((first_order*2)/5));
    }
}
