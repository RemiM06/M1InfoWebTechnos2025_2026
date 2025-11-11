import SamplerEngine from './SamplerEngine.js';
import SamplerGUI from './SamplerGUI.js';

let ctx;
let engine;
let gui;
let presets = [];

window.onload = async function init() {
    ctx = new AudioContext();
    engine = new SamplerEngine(ctx);
    gui = new SamplerGUI(engine, document.body);

    const response = await fetch('http://localhost:3000/api/presets');
    presets = await response.json();

    createPresetSelector();
    gui.createPads();
    gui.initCanvas();
    createLoadButton();

    await loadPreset(0);
}

function createPresetSelector() {
    const select = document.createElement('select');
    select.id = 'presetSelect';
    
    presets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        select.appendChild(option);
    });
    
    select.onchange = function() {
        loadPreset(parseInt(this.value));
    };
    
    document.body.insertBefore(select, document.body.firstChild);
}

function createLoadButton() {
    const button = document.createElement('button');
    button.textContent = 'Load All Sounds';
    button.id = 'loadAllBtn';
    button.onclick = loadAllSounds;
    
    const select = document.getElementById('presetSelect');
    select.parentNode.insertBefore(button, select.nextSibling);
}

async function loadPreset(presetIndex) {
    const preset = presets[presetIndex];
    const ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];
    const sampleNames = new Array(16).fill('—');
    
    preset.samples.forEach((sample, i) => {
        if (i < 16) {
            sampleNames[ORDER[i]] = sample.name || `Sample ${i}`;
        }
    });
    
    document.querySelector('.grid')?.remove();
    gui.padElements = [];
    
    const wrapper = document.querySelector('.wrapper');
    gui.createPads(sampleNames);
    const grid = document.querySelector('.grid');
    document.body.insertBefore(grid, wrapper);
    
    gui.initCanvas();
}

async function loadAllSounds() {
    const presetIndex = parseInt(document.getElementById('presetSelect').value);
    const preset = presets[presetIndex];
    
    const ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];
    const urls = new Array(16).fill(null);
    
    preset.samples.forEach((sample, i) => {
        if (i < 16) {
            urls[ORDER[i]] = `http://localhost:3000/presets/${sample.url}`;
        }
    });
    
    const validUrls = urls.filter(url => url !== null);
    const validIndices = urls.map((url, i) => url ? i : -1).filter(i => i !== -1);
    
    await engine.loadSounds(validUrls, (index, progress) => {
        gui.updateProgress(validIndices[index], progress);
    });
    
    validIndices.forEach((padIndex, i) => {
        const state = engine.getSampleState(i);
        if (state.loaded) {
            gui.markReady(padIndex);
        } else if (state.error) {
            gui.markError(padIndex, 'Erreur');
        }
    });
}