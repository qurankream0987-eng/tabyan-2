/**
 * @license
 * Tabyan Smart Mushaf — Audio Recitation Playback Service
 * Dedicated to qari playback, strictly isolated from microphone capture.
 */

export interface PlaybackState {
  readonly isPlaying: boolean;
  readonly currentSurah: number;
  readonly currentAyah: number;
  readonly reciterName: string;
}

export type PlaybackStateCallback = (state: PlaybackState) => void;

export class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private currentSurah = 1;
  private currentAyah = 1;
  private reciter = 'Alafasy_128kbps';
  private stateListeners: Set<PlaybackStateCallback> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.onended = () => {
        this.isPlaying = false;
        this.notifyState();
      };
      this.audioElement.onerror = () => {
        this.isPlaying = false;
        this.notifyState();
      };
    }
  }

  onStateChange(cb: PlaybackStateCallback): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  private notifyState(): void {
    const s: PlaybackState = {
      isPlaying: this.isPlaying,
      currentSurah: this.currentSurah,
      currentAyah: this.currentAyah,
      reciterName: 'مشاري العفاسي',
    };
    this.stateListeners.forEach((l) => l(s));
  }

  /**
   * Constructs the authentic EveryAyah standard CDN URL.
   * Format: https://everyayah.com/data/Alafasy_128kbps/{SSSAAA}.mp3
   */
  private getAudioUrl(surah: number, ayah: number): string {
    const sStr = String(surah).padStart(3, '0');
    const aStr = String(ayah).padStart(3, '0');
    return `https://everyayah.com/data/${this.reciter}/${sStr}${aStr}.mp3`;
  }

  async playAyah(surah: number, ayah: number): Promise<void> {
    if (!this.audioElement) return;

    this.currentSurah = surah;
    this.currentAyah = ayah;
    const url = this.getAudioUrl(surah, ayah);

    try {
      this.audioElement.src = url;
      await this.audioElement.play();
      this.isPlaying = true;
      this.notifyState();
    } catch {
      this.isPlaying = false;
      this.notifyState();
    }
  }

  pause(): void {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
      this.notifyState();
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
      this.notifyState();
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const defaultAudioPlayback = new AudioPlaybackService();
