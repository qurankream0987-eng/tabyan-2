/**
 * @license
 * Tabyan Smart Mushaf — bounded drop-oldest queue
 *
 * Live audio must never accumulate seconds of backlog: when a consumer falls
 * behind, the oldest items are dropped (and counted) so what is sent stays
 * close to real time.
 */

export class BoundedFrameQueue<T> {
  private readonly items: (T | undefined)[];
  private head = 0;
  private size = 0;
  private droppedTotal = 0;
  private highWater = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error('capacity must be a positive integer');
    this.items = new Array(capacity);
  }

  get length(): number {
    return this.size;
  }

  get dropped(): number {
    return this.droppedTotal;
  }

  get highWaterMark(): number {
    return this.highWater;
  }

  push(item: T): void {
    if (this.size === this.capacity) {
      this.items[this.head] = undefined;
      this.head = (this.head + 1) % this.capacity;
      this.size -= 1;
      this.droppedTotal += 1;
    }
    this.items[(this.head + this.size) % this.capacity] = item;
    this.size += 1;
    if (this.size > this.highWater) this.highWater = this.size;
  }

  shift(): T | undefined {
    if (this.size === 0) return undefined;
    const item = this.items[this.head];
    this.items[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.size -= 1;
    return item;
  }

  /** Removes and returns every queued item, oldest first. */
  drain(): T[] {
    const out: T[] = [];
    for (let item = this.shift(); item !== undefined; item = this.shift()) out.push(item);
    return out;
  }

  clear(): void {
    this.items.fill(undefined);
    this.head = 0;
    this.size = 0;
  }
}
