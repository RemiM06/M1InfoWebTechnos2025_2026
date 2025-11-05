// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound, playSound } from './soundutils.js';

// The AudioContext object is the main "entry point" into the Web Audio API
let ctx;

let soundURLs = [];
let presets = [];
    
let decodedSounds = [];

window.onload = async function init() {
    ctx = new AudioContext();

    // Fetch presets from server
    const response = await fetch('http://localhost:3000/api/presets');
    presets = await response.json();

    // Create dropdown menu
    let select = document.createElement('select');
    presets.forEach((preset, index) => {
        let option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        select.appendChild(option);
    });
    select.onchange = function() {
        loadPresetSounds(parseInt(this.value));
    };
    document.body.insertBefore(select, document.querySelector("#buttonsContainer"));

    // Load first preset
    await loadPresetSounds(0);
}

async function loadPresetSounds(presetIndex) {
    // Build sound URLs from preset
    soundURLs = [];
    let preset = presets[presetIndex];
    
    // Use samples array to build URLs
    // sample.url already contains the folder name (e.g., "808/Kick 808X.wav")
    preset.samples.forEach(sample => {
        soundURLs.push(`http://localhost:3000/presets/${sample.url}`);
    });

    // load and decode the sounds using Promise.all
    // we create an array of promises
    let promises = soundURLs.map(url => loadAndDecodeSound(url, ctx));

    // we wait for all the promises to be resolved
    decodedSounds = await Promise.all(promises);
  
    // now we create a button for each sound
    let buttonsContainer = document.querySelector("#buttonsContainer");
    buttonsContainer.innerHTML = ""; // Clear previous buttons

    decodedSounds.forEach((decodedSound, index) => {
        let button = document.createElement("button");
        button.textContent = `Play sound ${index + 1}`;
        button.onclick = function() {
            playSound(ctx, decodedSound, 0, decodedSound.duration);
        };
        buttonsContainer.appendChild(button);
    });
}
