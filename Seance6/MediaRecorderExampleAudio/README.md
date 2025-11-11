# Record audio with a media recorder + draw waveform + upload to server (draft)

This example shows how to use the Media Recorder API for recording an audio sample, it uses simple waveform drawing (you'd better use the waveform drawer frop previous course sessions), and contains also a draft of a code (non tested yet) for uploading the recorded sample to a server.

We could have used the fetch API, which is more modern and up to date, unfortunately, monitoring the progression and drawing a progress bar with fetch is not yet well supported by all modern browsers. We then use the older API XmlHttpRequest, that allows that in a simple way.

![Waveform of a recorded sample](https://i.ibb.co/wZ6Lr2B0/Capture-d-e-cran-2025-11-03-a-16-24-22.png)
