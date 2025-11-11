import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { pixelToSeconds } from './utils.js';

export default class SamplerGUI {
    constructor(samplerEngine, container) {
        this.engine = samplerEngine;
        this.container = container;
        this.padElements = [];
        this.selectedPadIndex = -1;
        this.trimPositions = []; // Sauvegarder trim bars pour chaque pad
        
        // Canvas
        this.waveformCanvas = null;
        this.trimBarsCanvas = null;
        this.waveformDrawer = null;
        this.trimBarsDrawer = null;
    }

    initCanvas() {
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.trimBarsCanvas = document.getElementById('trimBarsCanvas');
        
        // Event listeners pour trim bars
        this.trimBarsCanvas.onmousemove = (e) => this.handleMouseMove(e);
        this.trimBarsCanvas.onmousedown = () => this.trimBarsDrawer?.startDrag();
        this.trimBarsCanvas.onmouseup = () => this.handleMouseUp();
    }

    createPads(sampleNames = []) {
        const grid = document.createElement('div');
        grid.className = 'grid';
        
        for (let i = 0; i < 16; i++) {
            const pad = this.createPad(i, sampleNames[i] || `Pad ${i}`);
            this.padElements[i] = pad;
            grid.appendChild(pad.button);
            // Initialiser trim positions
            this.trimPositions[i] = { start: 0, end: 1 };
        }
        
        this.container.appendChild(grid);
    }

    createPad(index, name) {
        const button = document.createElement('button');
        button.className = 'pad';
        button.disabled = true;
        button.innerHTML = `
            <div class="label">${name}</div>
            <div class="sub">En attente</div>
            <div class="prog"><div class="bar" style="width:0%"></div></div>
        `;
        
        button.onclick = () => {
            // MODIFIÉ : Sélectionner + jouer avec trim bars
            this.selectPad(index);
            const trimPos = this.trimPositions[index];
            const duration = this.engine.getSampleDuration(index);
            this.engine.playSample(index, trimPos.start * duration, (trimPos.end - trimPos.start) * duration);
            button.classList.add('playing');
            setTimeout(() => button.classList.remove('playing'), 150);
        };
        
        return {
            button: button,
            status: button.querySelector('.sub'),
            bar: button.querySelector('.bar')
        };
    }

    selectPad(index) {
        if (!this.engine.isSampleLoaded(index)) return;
        
        // Désélectionner ancien pad
        if (this.selectedPadIndex >= 0) {
            this.padElements[this.selectedPadIndex].button.classList.remove('selected');
        }
        
        // Sélectionner nouveau pad
        this.selectedPadIndex = index;
        this.padElements[index].button.classList.add('selected');
        
        // Afficher waveform
        this.showWaveform(index);
    }

    showWaveform(index) {
        const sample = this.engine.samples[index];
        if (!sample) return;
        
        // Dessiner waveform
        this.waveformDrawer = new WaveformDrawer();
        this.waveformDrawer.init(sample, this.waveformCanvas, 'blue');
        this.waveformDrawer.drawWave(0, this.waveformCanvas.height);
        
        // Dessiner trim bars
        const trimPos = this.trimPositions[index];
        const leftX = trimPos.start * this.waveformCanvas.width;
        const rightX = trimPos.end * this.waveformCanvas.width;
        
        this.trimBarsDrawer = new TrimbarsDrawer(this.trimBarsCanvas, leftX, rightX);
        this.trimBarsDrawer.draw();
    }

    handleMouseMove(e) {
        if (!this.trimBarsDrawer) return;
        
        const rect = this.trimBarsCanvas.getBoundingClientRect();
        const mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.trimBarsDrawer.moveTrimBars(mousePos);
        this.trimBarsDrawer.clear();
        this.trimBarsDrawer.draw();
    }

    handleMouseUp() {
        if (!this.trimBarsDrawer || this.selectedPadIndex < 0) return;
        
        this.trimBarsDrawer.stopDrag();
        
        // Sauvegarder positions
        const duration = this.engine.getSampleDuration(this.selectedPadIndex);
        this.trimPositions[this.selectedPadIndex] = {
            start: pixelToSeconds(this.trimBarsDrawer.leftTrimBar.x, duration, this.waveformCanvas.width) / duration,
            end: pixelToSeconds(this.trimBarsDrawer.rightTrimBar.x, duration, this.waveformCanvas.width) / duration
        };
    }

    updateProgress(index, progress) {
        const pad = this.padElements[index];
        pad.bar.style.width = progress + '%';
        pad.status.textContent = Math.round(progress) + '%';
    }

    markReady(index) {
        const pad = this.padElements[index];
        pad.button.disabled = false;
        pad.button.classList.add('ready');
        pad.status.textContent = 'Prêt';
        pad.bar.style.width = '100%';
    }

    markError(index, msg) {
        const pad = this.padElements[index];
        pad.status.textContent = 'Erreur';
        pad.button.classList.add('error');
    }
}