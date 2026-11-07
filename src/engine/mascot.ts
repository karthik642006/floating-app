/**
 * Port of `shimeji.lib.Mascot` + `Playground` + the fling Scroller from MascotView.
 * Coordinates are in device pixels, exactly like the original; the renderer converts to dp.
 */
import { Animation, DEFAULT_CONFIG, Dragging, Falling, Flinging, Jump, MascotConfig, Sit, Walk } from './animations';

export interface Playground {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const TICK_MS = 30;

/** Mascot.getSpeed(): the stored speed (1.0–5.0) is mapped to a movement multiplier. */
export const speedMultiplier = (speed: number) => (speed <= 0.1 ? 1 : speed + 0.9);

export class Mascot {
  anim: Animation;
  x = 0;
  y = 0;
  dragging = false; // f5014h
  flinging = false; // f5015i
  flingVX = 0; // f5011e
  facingLeft = true; // f5016j
  readonly area: Playground;
  private fling = { vx: 0, vy: 0 };

  constructor(
    readonly width: number,
    readonly height: number,
    screen: Playground,
    public speed: number,
    readonly cfg: MascotConfig = DEFAULT_CONFIG
  ) {
    // The sprite may overhang the left, right and top edges by a third of its width.
    const o = Math.floor(width / 3);
    this.area = { top: screen.top - o, bottom: screen.bottom, left: screen.left - o, right: screen.right + o };
    this.anim = Falling(cfg);
    this.setX(Math.floor(Math.random() * Math.max(1, this.area.right - width)));
    this.y = this.area.top;
  }

  setX(v: number) {
    this.x = Math.max(this.area.left, Math.min(this.area.right - this.width, v));
  }
  setY(v: number) {
    this.y = Math.max(this.area.top, Math.min(this.area.bottom - this.height, v));
  }

  /** Called on finger move. */
  dragTo(x: number, y: number) {
    this.setX(x);
    this.setY(y);
    this.dragging = true;
  }

  setSpeed(v: number) {
    this.speed = v;
  }

  requestAction(action: 'walk' | 'jump' | 'sit') {
    const direction = this.facingLeft ? 'LEFT' : 'RIGHT';
    if (action === 'walk') this.anim = Walk(direction, this.cfg);
    if (action === 'jump') this.anim = Jump(direction, this.cfg);
    if (action === 'sit') this.anim = Sit(direction, this.cfg);
  }

  /** Finger lifted without dragging (tap). */
  stopDrag() {
    this.dragging = false;
  }

  /** Called on finger release; velocities in px/s. */
  release(vx: number, vy: number) {
    this.dragging = false;
    if (Math.hypot(vx, vy) > 600) {
      this.flinging = true;
      this.flingVX = vx;
      this.fling = { vx, vy };
    }
  }

  /** Approximates Android's Scroller.fling deceleration; call once per tick. */
  private stepFling() {
    if (!this.flinging) return;
    const dt = TICK_MS / 1000;
    this.setX(this.x + this.fling.vx * dt);
    this.setY(this.y + this.fling.vy * dt);
    const decay = Math.pow(0.08, dt); // strong friction, ~1s glide
    this.fling.vx *= decay;
    this.fling.vy *= decay;
    if (Math.hypot(this.fling.vx, this.fling.vy) < 60) this.flinging = false;
  }

  /** One engine tick (Mascot.a). */
  tick() {
    this.stepFling();
    let a = this.anim;
    if (this.dragging) {
      if (a.name !== 'Dragging') a = Dragging(this.cfg);
    } else if (!this.flinging) {
      if (a.name === 'Dragging' || a.name === 'Flinging') a = a.next();
    } else if (a.name !== 'Flinging') {
      a = Flinging(this.flingVX, this.cfg);
    }

    const ar = this.area;
    a.onEdges(this.y <= ar.top, this.y + this.height >= ar.bottom, this.x <= ar.left, this.x + this.width >= ar.right);
    const mult = speedMultiplier(this.speed);
    const [, dx, dy] = a.step;
    this.setX(this.x + Math.trunc(dx * mult));
    this.setY(this.y + Math.trunc(dy * mult));
    this.facingLeft = a.direction === 'LEFT';

    a.ticks++;
    const timedOut = !a.ended && a.maxTicks > 0 && a.ticks >= a.maxTicks ? a.timeout() : null;
    if (a.ended) {
      a = a.next();
    } else if (timedOut) {
      a = timedOut;
    } else if (a.ticks > a.stepStart + a.step[3]) {
      a.stepStart = a.ticks;
      let loopDone = false;
      if (a.stepIndex + 1 >= a.steps.length) {
        loopDone = a.endsAfterLoop;
        a.stepIndex = 0;
      } else {
        a.stepIndex++;
      }
      if (loopDone) a = a.next();
    }
    this.anim = a;
  }

  get frame() {
    return this.anim.step[0];
  }

  /** Re-seat after rotation (MascotView.b). */
  resize(screen: Playground) {
    const o = Math.floor(this.width / 3);
    Object.assign(this.area, { top: screen.top - o, bottom: screen.bottom, left: screen.left - o, right: screen.right + o });
    this.anim = Falling(this.cfg);
  }
}
