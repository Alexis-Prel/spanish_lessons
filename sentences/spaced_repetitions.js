
/*

Data structure of JSON files

deck = [card, ...]
card = {"recto": HTML_code, "verso": HTML_code, "last seen": MILLISECONDS, "repeat": MILLISECONDS}
*/

let active_deck; // filepath to the active deck's JSON
let active_card;  // card currently being displayed

function select_card_in_deck() {
    // fetch a deck from active_deck (a JSON file containing a deck)
    // assert deck is not empty
    // select card with earliest repeat 
    // if repeat <= Date.now(), return that card
    // else select next unseeen card
    // returns a card
}

function show_recto(card) {
    // in the #recto div replace HTML with card.recto
}

function show_verso(card) {
    // in the #verso div replace HTML with card.recto
}

function show_self_grading_buttons() {
    // set visibility of self-grading buttons to true
}

function hide_self_grading_buttons() {
    // set visibility of self-grading buttons to false
}

function next_card(filepath) {
    hide_self_grading_buttons();
    // flush the #recto div to be empty
    // flush the #verso div to be empty
    active_card = select_card_in_deck(filepath);
    show_recto(active_card);
}

function flip_card() {
    show_verso(active_card);
    show_self_grading_buttons();
}

function grade() {
    // occurs when the user just graded themselves 
    // based on their self-assessment, we space the repetition more or less
    delay = active_card.repeat - active_card.last_seen
    if (button.id === "Easy") {
        delay *= 2;
    } else if (button.id == "Good") {
        delay *= 1.10;
    } else if (button.id == "Hard") {
        delay *= 0.90;
    } else if (button.id == "Wrong") {
        delay = min(5*60*1000, delay / 2);
    } else {
        // raise an error, there should be no such button
    }

    active_card.last_seen = Date.now();
    active_card.repeat = active_card.last_seen + delay;

    // in filepath, 
}
