// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

// default imports of classes from waveformdrawer.js and trimbarsdrawer.js
import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';

// The AudioContext object is the main "entry point" into the Web Audio API
let ctx;

const soundURL = [
    'https://mainline.i3s.unice.fr/mooc/shoot2.mp3',
    'https://mainline.i3s.unice.fr/mooc/drums.mp3',
    'https://mainline.i3s.unice.fr/mooc/shoot1.mp3'
];

let decodedSound = []; // the decoded sound will be stored here
let currentSoundIndex = 0;
// Store trim bar positions for each sound
let trimBarPositions = [];

let canvas, canvasOverlay;
// waveform drawer is for drawing the waveform in the canvas
// trimbars drawer is for drawing the trim bars in the overlay canvas

let waveformDrawer, trimbarsDrawer;
let mousePos = { x: 0, y: 0 }
// The button for playing the sound
let playButton = document.querySelector("#playButton");

// disable the button until the sound is loaded and decoded
playButton.disabled = true;
let debugButton; 

window.onload = async function init() {
    ctx = new AudioContext();

    // two canvas : one for drawing the waveform, the other for the trim bars
    canvas = document.querySelector("#myCanvas");
    canvasOverlay = document.querySelector("#myCanvasOverlay");

    // create the waveform drawer and the trimbars drawer
    waveformDrawer = new WaveformDrawer();
    trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 100, 200);

    for (let i = 0; i < soundURL.length; i++) {
        try {
            let decoded = await loadAndDecodeSound(soundURL[i], ctx);
            decodedSound.push(decoded);
            // Initialize trim bar positions for each sound
            trimBarPositions.push({ left: 100, right: 200 });
            console.log("Sound " + (i + 1) + " loaded successfully");
        } catch (error) {
            console.error("Error loading sound " + (i + 1) + ":", error);
            // Skip this sound and continue with the next one
        }
    }

    // Check if at least one sound was loaded
    if (decodedSound.length === 0) {
        alert("No sounds could be loaded!");
        return;
    }

    // Generate a PLAY button for each sound AFTER loading all sounds
    for (let i = 0; i < decodedSound.length; i++) {
        createPlayButton(i);
    }

    // load and decode the sound
    // this is asynchronous, we use await to wait for the end of the loading and decoding
    // before going to the next instruction
    // Note that we cannot use await outside an async function
    // so we had to declare the init function as async
    waveformDrawer.init(decodedSound[0], canvas, '#83E83E');
    waveformDrawer.drawWave(0, canvas.height);

    displaySound(currentSoundIndex);


    // we enable the play sound button, now that the sound is loaded and decoded
    playButton.disabled = false;

    // Event listener for the button. When the button is pressed, we play the sound
    playButton.onclick = function (evt) {
        // get start and end time (in seconds) from trim bars position.x (in pixels)
        let sound = decodedSound[currentSoundIndex];
        let start = pixelToSeconds(trimbarsDrawer.leftTrimBar.x, sound.duration, canvas.width);
        let end = pixelToSeconds(trimbarsDrawer.rightTrimBar.x, sound.duration, canvas.width);
        console.log("start: " + start + " end: " + end);
        // from utils.js
        playSound(ctx, sound, start, end);
    };


    // declare mouse event listeners for ajusting the trim bars
    // when the mouse moves, we check if we are close to a trim bar
    // if so: highlight it!
    // if a trim bar is selected and the mouse moves, we move the trim bar
    // when the mouse is pressed, we start dragging the selected trim bar (if any)
    // when the mouse is released, we stop dragging the trim bar (if any)
    canvasOverlay.onmousemove = (evt) => {
        // get the mouse position in the canvas
        let rect = canvas.getBoundingClientRect();

        mousePos.x = (evt.clientX - rect.left);
        mousePos.y = (evt.clientY - rect.top);

        // When the mouse moves, we check if we are close to a trim bar
        // if so: move it!
        trimbarsDrawer.moveTrimBars(mousePos);
    }

    canvasOverlay.onmousedown = (evt) => {
        // If a trim bar is close to the mouse position, we start dragging it
        trimbarsDrawer.startDrag();
    }

    canvasOverlay.onmouseup = (evt) => {
        // We stop dragging the trim bars (if they were being dragged)
        trimbarsDrawer.stopDrag();
        // Save trim bar positions for current sound
        trimBarPositions[currentSoundIndex].left = trimbarsDrawer.leftTrimBar.x;
        trimBarPositions[currentSoundIndex].right = trimbarsDrawer.rightTrimBar.x;
    }

    // start the animation loop for drawing the trim bars
    requestAnimationFrame(animate);
};

// Generate a PLAY button for each sound
function createPlayButton(index) {
    let button = document.createElement('button');
    button.textContent = 'Play sound ' + (index + 1);
    button.onclick = function() {
        displaySound(index);
        // Play the sound when button is clicked
        let sound = decodedSound[index];
        let start = pixelToSeconds(trimbarsDrawer.leftTrimBar.x, sound.duration, canvas.width);
        let end = pixelToSeconds(trimbarsDrawer.rightTrimBar.x, sound.duration, canvas.width);
        playSound(ctx, sound, start, end);
    };
    document.body.appendChild(button);
}

function displaySound(index) {
    // Save current trim bar positions before switching
    trimBarPositions[currentSoundIndex].left = trimbarsDrawer.leftTrimBar.x;
    trimBarPositions[currentSoundIndex].right = trimbarsDrawer.rightTrimBar.x;
    
    currentSoundIndex = index;
    let sound = decodedSound[index];
    waveformDrawer.init(sound, canvas, '#83E83E');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    waveformDrawer.drawWave(0, canvas.height);
    
    // Restore trim bar positions for this sound
    trimbarsDrawer.leftTrimBar.x = trimBarPositions[index].left;
    trimbarsDrawer.rightTrimBar.x = trimBarPositions[index].right;
}

// Animation loop for drawing the trim bars
// We use requestAnimationFrame() to call the animate function
// at a rate of 60 frames per second (if possible)
// see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
function animate() {
    // clear overlay canvas;
    trimbarsDrawer.clear();

    // draw the trim bars
    trimbarsDrawer.draw();

    // redraw in 1/60th of a second
    requestAnimationFrame(animate);
}



