// Tabyan Smart Mushaf — AudioWorklet: mono mix, 16 kHz resample, 20 ms PCM16 frames.
// Runs on the audio rendering thread; posts one transferable frame (plus its RMS)
// every 20 ms. Voice-activity decisions are made on the main thread from the RMS,
// so this processor stays minimal and never drops or gates audio.
const TARGET_SAMPLE_RATE = 16000;
const FRAME_SAMPLES = 320; // 20 ms at 16 kHz

class TabyanPcmFrameProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.nextSourcePosition = null;
    this.previousMonoSample = 0;
    this.frame = new Int16Array(FRAME_SAMPLES);
    this.frameLength = 0;
    this.frameStartFrame = 0;
    this.squareSum = 0;
    this.seq = 0;
    this.mono = new Float32Array(128);
  }

  process(inputs, outputs) {
    for (const channel of outputs[0] || []) channel.fill(0);
    const channels = inputs[0];
    if (!channels || channels.length === 0 || channels[0].length === 0) return true;

    const frameCount = channels[0].length;
    if (this.mono.length < frameCount) this.mono = new Float32Array(frameCount);
    const mono = this.mono;
    for (let i = 0; i < frameCount; i += 1) {
      let sum = 0;
      for (let c = 0; c < channels.length; c += 1) sum += channels[c][i] || 0;
      mono[i] = sum / channels.length;
    }

    const blockStart = currentFrame;
    const blockEnd = blockStart + frameCount;
    const step = sampleRate / TARGET_SAMPLE_RATE;
    let position = this.nextSourcePosition ?? blockStart;

    while (position + 1 < blockEnd) {
      const lowerIndex = Math.floor(position);
      const fraction = position - lowerIndex;
      const lower = lowerIndex < blockStart ? this.previousMonoSample : mono[lowerIndex - blockStart];
      const upper = mono[lowerIndex + 1 - blockStart];
      const value = Math.max(-1, Math.min(1, lower + (upper - lower) * fraction));

      if (this.frameLength === 0) {
        this.frameStartFrame = position;
        this.squareSum = 0;
      }
      this.frame[this.frameLength] = value < 0 ? value * 0x8000 : value * 0x7fff;
      this.squareSum += value * value;
      this.frameLength += 1;
      position += step;

      if (this.frameLength === FRAME_SAMPLES) {
        const pcm = this.frame;
        this.port.postMessage(
          {
            seq: ++this.seq,
            pcm: pcm.buffer,
            rms: Math.sqrt(this.squareSum / FRAME_SAMPLES),
            startFrame: this.frameStartFrame,
          },
          [pcm.buffer],
        );
        this.frame = new Int16Array(FRAME_SAMPLES);
        this.frameLength = 0;
      }
    }

    this.nextSourcePosition = position;
    this.previousMonoSample = mono[frameCount - 1] || 0;
    return true;
  }
}

registerProcessor('tabyan-pcm-frame', TabyanPcmFrameProcessor);
