import { damp } from './motion.ts';

/** Fractional wheel travel owns the rail; selection follows the nearest physical cell. */
export class WheelTrack {
  value: number;
  velocity = 0;
  target: number;
  lastInput = 0;
  idle = false;
  readonly lane: number;
  constructor(value: number, lane: number) { this.value = this.target = value; this.lane = lane; }
  input(pixels: number, now: number) {
    this.target += pixels / 120;
    this.lastInput = now;
    this.idle = false;
  }
  step(dt: number, now: number) {
    const released = now - this.lastInput > .16;
    if (released) this.target = Math.round(this.target);
    damp(this, this.target, released ? 14 : 18, dt);
    if (released && Math.abs(this.value - this.target) < .0001 && Math.abs(this.velocity) < .005) {
      this.value = this.target;
      this.velocity = 0;
      this.idle = true;
    }
  }
}
