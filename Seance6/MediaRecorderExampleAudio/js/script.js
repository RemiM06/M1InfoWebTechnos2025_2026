let recordButton, stopButton, playButton, sendButton, canvas, progressBar;
let recorder;
let lastBlob = null;
let lastSample = null;
let bufferSourceNode;

const ac = new AudioContext();
const limiter = ac.createDynamicsCompressor();
limiter.connect(ac.destination);

window.addEventListener('load', async () => {
	canvas = document.querySelector('canvas');
	recordButton = document.getElementById('record');
	stopButton = document.getElementById('stop');
	playButton = document.getElementById('play');
	sendButton = document.getElementById('send');
	progressBar = document.getElementById('progress');

	disableButtons(true, true, true, true);

	try {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		recorder = new MediaRecorder(stream);

		recorder.addEventListener('dataavailable', onRecordingReady);
		recorder.addEventListener('start', () => console.log('Recording started'));

		recordButton.addEventListener('click', startRecording);
		stopButton.addEventListener('click', stopRecording);
		playButton.addEventListener('click', playSample);
		sendButton.addEventListener('click', sendToServer);

		disableButtons(false, true, true, true);
		console.log('Recorder ready');
	} catch (err) {
		console.error('Micro access denied:', err);
	}
});

function disableButtons(record, stop, play, send) {
	recordButton.disabled = record;
	stopButton.disabled = stop;
	playButton.disabled = play;
	sendButton.disabled = send;
}

function startRecording() {
	console.log('Start recording');
	disableButtons(true, false, true, true);
	stopSample();
	recorder.start();
}

function stopRecording() {
	console.log('Stop recording');
	disableButtons(false, true, true, true);
	recorder.stop();
}

async function onRecordingReady(event) {
	lastBlob = event.data;
	try {
		const arrayBuffer = await lastBlob.arrayBuffer();
		const decoded = await ac.decodeAudioData(arrayBuffer);
		useSample(decoded);
	} catch (err) {
		console.error('Audio decode failed:', err);
	}
}

function useSample(sample) {
	maximizeSampleInPlace(sample);
	lastSample = sample;

	stopSample();

	bufferSourceNode = ac.createBufferSource();
	bufferSourceNode.buffer = sample;
	bufferSourceNode.connect(limiter);
	bufferSourceNode.loop = false;
	bufferSourceNode.start();

	bufferSourceNode.onended = () => disableButtons(false, true, false, false);
	renderWave(canvas, sample.getChannelData(0));
}

function playSample() {
	if (!lastSample) return;
	stopSample();

	bufferSourceNode = ac.createBufferSource();
	bufferSourceNode.buffer = lastSample;
	bufferSourceNode.connect(limiter);
	bufferSourceNode.loop = false;
	bufferSourceNode.start();

	disableButtons(true, true, true, true);
	bufferSourceNode.onended = () => disableButtons(false, true, false, false);
}

function stopSample() {
	if (bufferSourceNode) {
		bufferSourceNode.stop();
		bufferSourceNode.disconnect();
		bufferSourceNode = null;
	}
}

async function sendToServer() {
	if (!lastBlob) {
		alert('Aucun enregistrement à envoyer.');
		return;
	}

	const name = prompt('Nom du sample à envoyer :');
	if (!name) {
		alert('Envoi annulé.');
		return;
	}

	progressBar.style.display = 'block';
	progressBar.value = 0;

	try {
		await uploadWithProgress('https://myserver.com/api/samples', lastBlob, name);
		progressBar.style.display = 'none';
		alert('✅ Sample envoyé avec succès !');
	} catch (err) {
		progressBar.style.display = 'none';
		console.error('Upload error:', err);
		alert('Erreur pendant l’envoi : ' + err.message);
	}
}

/**
 * Upload  Blob with a progress bar (via XMLHttpRequest)
 * Note : we could also use the Fetch API with ReadableStream for more 
 * modern approach, but it is not yet supported correctly by modern
 * browsers, in particular for tracking upload progress.
 * in particular : 
 * const response = await fetch('http://myserver.com/api/samples', {
	method: 'POST',
	duplex: 'half', // 👈 obligatoire pour un body streamé
	headers: {
		'X-Sample-Name': name,
	},
	body: stream
});
is not well supported for upload progress tracking as of mid-2025.
 */
function uploadWithProgress(url, blob, sampleName) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
		xhr.setRequestHeader('X-Sample-Name', sampleName);

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) {
				progressBar.value = (e.loaded / e.total) * 100;
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(xhr.responseText);
			} else {
				reject(new Error(`Erreur HTTP ${xhr.status}`));
			}
		};

		xhr.onerror = () => reject(new Error('Erreur réseau'));
		xhr.send(blob);
	});
}

/**
 * Affiche la forme d’onde dans le canvas
 */
function renderWave(canvas, data) {
	const ctx = canvas.getContext('2d');
	const w = canvas.width;
	const h = canvas.height;
	const mid = h / 2;

	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, w, h);

	ctx.strokeStyle = '#000';
	ctx.lineWidth = 1;
	ctx.beginPath();

	const step = w / data.length;
	let x = 0;
	for (let i = 0; i < data.length; i++) {
		const y = mid - data[i] * mid;
		i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
		x += step;
	}

	ctx.stroke();
}

/**
 * Normalise le volume du sample pour maximiser sans saturer
 */
function maximizeSampleInPlace(sample) {
	const numChannels = sample.numberOfChannels;
	let maxValue = 0;

	for (let i = 0; i < numChannels; i++) {
		const data = sample.getChannelData(i);
		for (const v of data) {
			maxValue = Math.max(maxValue, Math.abs(v));
		}
	}

	const amp = 1 / maxValue;
	for (let i = 0; i < numChannels; i++) {
		const data = sample.getChannelData(i);
		for (let j = 0; j < data.length; j++) {
			data[j] *= amp;
		}
	}
}
