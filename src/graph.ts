import type { RingWindow1D, RingWindow2D, Sample, Sample2D } from "./types";

const DEFAULT_CAPACITY = 10_000;

export class RingBuffer1D {
  private readonly capacity: number;
  private readonly times: Float64Array;
  private readonly values: Float64Array;
  private index = 0;
  private count = 0;

  constructor(capacity = DEFAULT_CAPACITY) {
    this.capacity = capacity;
    this.times = new Float64Array(capacity);
    this.values = new Float64Array(capacity);
  }

  push(time: number, value: number): void {
    this.times[this.index] = time;
    this.values[this.index] = value;
    this.index = (this.index + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }

  clear(): void {
    this.index = 0;
    this.count = 0;
  }

  latestTime(): number {
    if (this.count === 0) {
      return 0;
    }
    const latestIndex = (this.index - 1 + this.capacity) % this.capacity;
    return this.times[latestIndex];
  }

  visibleWindow(startTime: number): RingWindow1D {
    const points: Sample[] = [];
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < this.count; i += 1) {
      const actualIndex = (this.index - this.count + i + this.capacity) % this.capacity;
      const time = this.times[actualIndex];
      if (time < startTime) {
        continue;
      }
      const value = this.values[actualIndex];
      points.push({ time, value });
      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    if (points.length === 0) {
      min = -1;
      max = 1;
    } else if (Math.abs(max - min) < 1e-9) {
      const pad = Math.max(Math.abs(max) * 0.1, 0.1);
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.1;
      min -= pad;
      max += pad;
    }

    return { points, min, max };
  }
}

export class RingBuffer2D {
  private readonly capacity: number;
  private readonly xs: Float64Array;
  private readonly ys: Float64Array;
  private readonly times: Float64Array;
  private index = 0;
  private count = 0;

  constructor(capacity = DEFAULT_CAPACITY) {
    this.capacity = capacity;
    this.xs = new Float64Array(capacity);
    this.ys = new Float64Array(capacity);
    this.times = new Float64Array(capacity);
  }

  push(time: number, x: number, y: number): void {
    this.times[this.index] = time;
    this.xs[this.index] = x;
    this.ys[this.index] = y;
    this.index = (this.index + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }

  clear(): void {
    this.index = 0;
    this.count = 0;
  }

  visibleWindow(startTime: number): RingWindow2D {
    const points: Sample2D[] = [];
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < this.count; i += 1) {
      const actualIndex = (this.index - this.count + i + this.capacity) % this.capacity;
      const time = this.times[actualIndex];
      if (time < startTime) {
        continue;
      }
      const x = this.xs[actualIndex];
      const y = this.ys[actualIndex];
      points.push({ x, y, time });
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    if (points.length === 0) {
      minX = -1;
      maxX = 1;
      minY = -1;
      maxY = 1;
    } else {
      const spanX = Math.abs(maxX - minX) < 1e-9 ? 0.2 : (maxX - minX) * 0.1;
      const spanY = Math.abs(maxY - minY) < 1e-9 ? 0.2 : (maxY - minY) * 0.1;
      minX -= spanX;
      maxX += spanX;
      minY -= spanY;
      maxY += spanY;
    }

    return { points, minX, maxX, minY, maxY };
  }
}
