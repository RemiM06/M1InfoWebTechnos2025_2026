import { playSound } from './soundutils.js';

export default class SamplerEngine {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.samples = [];
        this.loadingState = [];
    }

    async loadSounds(urls, onProgress = null) {
        this.loadingState = urls.map(() => ({ loaded: false, error: null, progress: 0 }));
        const promises = urls.map((url, i) => this.loadSingleSound(url, i, onProgress));
        const results = await Promise.allSettled(promises);

        results.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                this.samples[i] = result.value;
                this.loadingState[i].loaded = true;
            } else {
                this.samples[i] = null;
                this.loadingState[i].error = result.reason;
            }
        });

        return results;
    }

    async loadSingleSound(url, index, onProgress) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const total = parseInt(response.headers.get('content-length') || 0);
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            received += value.length;

            if (onProgress && total > 0) {
                const progress = (received / total) * 100;
                this.loadingState[index].progress = progress;
                onProgress(index, progress, received, total);
            }
        }

        const allChunks = new Uint8Array(received);
        let position = 0;
        for (let chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
        }

        return await this.audioContext.decodeAudioData(allChunks.buffer);
    }

    // CORRIGÉ : duration est maintenant la durée, pas endTime
    playSample(index, startTime = 0, duration = null) {
        const sample = this.samples[index];
        if (!sample) return false;

        // Calculer endTime à partir de startTime + duration
        const endTime = duration !== null ? startTime + duration : sample.duration;
        
        playSound(this.audioContext, sample, startTime, endTime);
        return true;
    }

    getSampleState(index) {
        return this.loadingState[index];
    }

    isSampleLoaded(index) {
        return !!this.samples[index];
    }

    getSampleDuration(index) {
        return this.samples[index]?.duration || 0;
    }
}