/** RS-style global tick clock (~0.6s). */

export const TICK_MS = 600;

export type TickFn = (tick: number) => void;

export class TickClock {
  tick = 0;
  private acc = 0;
  private listeners = new Set<TickFn>();
  private running = false;

  onTick(fn: TickFn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Call from rAF with dt seconds. */
  update(dt: number) {
    if (!this.running) return;
    this.acc += dt * 1000;
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      this.tick += 1;
      for (const fn of this.listeners) fn(this.tick);
    }
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }
}

export type ScheduledAction = {
  id: string;
  /** Absolute tick when it fires. */
  dueTick: number;
  kind: string;
  payload?: unknown;
  onFire: () => void;
};

export class ActionScheduler {
  private queue: ScheduledAction[] = [];
  private seq = 0;

  constructor(private clock: TickClock) {
    clock.onTick((t) => this.flush(t));
  }

  /** Schedule after N ticks from now (min 1). */
  after(ticks: number, kind: string, onFire: () => void, payload?: unknown): string {
    const id = `act_${++this.seq}`;
    const dueTick = this.clock.tick + Math.max(1, ticks);
    this.queue.push({ id, dueTick, kind, onFire, payload });
    return id;
  }

  cancel(id: string) {
    this.queue = this.queue.filter((a) => a.id !== id);
  }

  cancelKind(kind: string) {
    this.queue = this.queue.filter((a) => a.kind !== kind);
  }

  hasKind(kind: string) {
    return this.queue.some((a) => a.kind === kind);
  }

  private flush(tick: number) {
    const due = this.queue.filter((a) => a.dueTick <= tick);
    this.queue = this.queue.filter((a) => a.dueTick > tick);
    for (const a of due) {
      try {
        a.onFire();
      } catch (e) {
        console.error(e);
      }
    }
  }
}
