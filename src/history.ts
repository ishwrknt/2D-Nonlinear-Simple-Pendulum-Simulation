/** Full-run storage for export, plus bounded extrema-preserving summaries for plotting. */
type Entry<T> = { index: number; item: T; values: readonly number[] };
type Bucket<T> = {
  count: number;
  first: Entry<T>;
  last: Entry<T>;
  min: Entry<T>[];
  max: Entry<T>[];
};
export class History<T> {
  private items: T[] = [];
  private buckets: Bucket<T>[] = [];
  private width = 1;
  constructor(privateFeatures?: (item: T) => readonly number[]) {
    this.features = privateFeatures;
  }
  private readonly features?: (item: T) => readonly number[];
  get total(): number {
    return this.items.length;
  }
  push(item: T): void {
    const entry: Entry<T> = {
      index: this.items.length,
      item,
      values: this.features?.(item) ?? [],
    };
    this.items.push(item);
    const last = this.buckets.at(-1);
    if (last && last.count < this.width) this.add(last, entry);
    else
      this.buckets.push({
        count: 1,
        first: entry,
        last: entry,
        min: entry.values.map(() => entry),
        max: entry.values.map(() => entry),
      });
    if (this.buckets.length > 512) {
      const merged: Bucket<T>[] = [];
      for (let i = 0; i < this.buckets.length; i += 2) {
        const a = this.buckets[i],
          b = this.buckets[i + 1];
        if (!b) {
          merged.push(a);
          continue;
        }
        merged.push({
          count: a.count + b.count,
          first: a.first,
          last: b.last,
          min: a.min.map((v, k) =>
            v.values[k] <= b.min[k].values[k] ? v : b.min[k],
          ),
          max: a.max.map((v, k) =>
            v.values[k] >= b.max[k].values[k] ? v : b.max[k],
          ),
        });
      }
      this.buckets = merged;
      this.width *= 2;
    }
  }
  private add(b: Bucket<T>, e: Entry<T>): void {
    b.count++;
    b.last = e;
    e.values.forEach((value, k) => {
      if (value < b.min[k].values[k]) b.min[k] = e;
      if (value > b.max[k].values[k]) b.max[k] = e;
    });
  }
  clear(): void {
    this.items = [];
    this.buckets = [];
    this.width = 1;
  }
  /** Read-only view avoids copying the entire run on each animation frame. */
  values(): readonly T[] {
    return this.items;
  }
  window(start: number, time: (item: T) => number): readonly T[] {
    let lo = 0,
      hi = this.items.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (time(this.items[mid]) < start) lo = mid + 1;
      else hi = mid;
    }
    return this.items.slice(lo);
  }
  /** Every bucket contributes endpoints and extrema; all raw samples remain exportable. */
  plotValues(): T[] {
    return this.buckets.flatMap((b) => {
      const entries = [b.first, ...b.min, ...b.max, b.last];
      return [...new Map(entries.map((e) => [e.index, e])).values()]
        .sort((a, b) => a.index - b.index)
        .map((e) => e.item);
    });
  }
}
