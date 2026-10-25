export const PROCESSOR_SOURCE = `
class TabyanPcm24kProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 24000;
    this.ratio = sampleRate / this.targetRate;
    this.offset = 0;
    this.frame = new Int16Array(Math.round(this.targetRate / 10));
    this.index = 0;
    this.finishing = false;
    this.port.onmessage = (event) => {
      if (event.data && event.data.t === "flush") {
        this.finishing = true;
        if (this.index > 0) {
          const out = this.frame.slice(0, this.index);
          this.port.postMessage(out.buffer, [out.buffer]);
          this.index = 0;
        }
        this.port.postMessage({ t: "flushed" });
      }
    };
  }
  process(inputs) {
    if (this.finishing) return true;
    const input = inputs[0] && inputs[0][0];
    if (!input || input.length === 0) return true;
    let i = this.offset;
    while (i < input.length) {
      const sample = Math.max(-1, Math.min(1, input[Math.floor(i)] || 0));
      this.frame[this.index++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      if (this.index === this.frame.length) {
        const out = this.frame.buffer;
        this.port.postMessage(out, [out]);
        this.frame = new Int16Array(Math.round(this.targetRate / 10));
        this.index = 0;
      }
      i += this.ratio;
    }
    this.offset = i - input.length;
    return true;
  }
}
registerProcessor("tabyan-pcm24k", TabyanPcm24kProcessor);
`;
