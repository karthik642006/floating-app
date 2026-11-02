/**
 * Shimeji animation state machine — a TypeScript port of the decompiled
 * `shimeji.lib.animations.*` classes from the original APK.
 *
 * Each animation is a list of sprite steps: [frameIndex, dx, dy, durationTicks].
 * One tick = 30 ms (the original MascotThread sleep). dx/dy are in sprite pixels per tick.
 *
 * Hooks mirror the original abstract methods:
 *   a(top, bottom, left, right) -> onEdges   : decide whether the animation must end (`ended`)
 *   b()                        -> direction
 *   c()                        -> endsAfterLoop : whether finishing one loop ends the animation
 *   d()                        -> maxTicks      : random lifetime after which `timeout()` fires
 *   e()                        -> next          : animation that follows when ended
 *   f()                        -> timeout       : animation that follows when maxTicks is reached
 */

export type Direction = 'LEFT' | 'RIGHT';
export type Step = readonly [frame: number, dx: number, dy: number, duration: number];

/** MascotConfig: mode 0 = normal, 3 = "Z" variants (unused in-app); specials enabled when 0. */
export interface MascotConfig {
  mode: number;
  special: number;
  special2: number;
}
export const DEFAULT_CONFIG: MascotConfig = { mode: 0, special: 0, special2: 0 };

const rnd = (n: number) => Math.floor(Math.random() * n);
const coin = () => Math.random() < 0.5;
const side = (d: Direction, l: Step[], r: Step[]) => (d === 'LEFT' ? l : r);

export class Animation {
  ticks = 0; // f5073b
  stepStart = 0; // f5074c
  stepIndex = 0; // f5078g
  ended = false; // f5076e
  readonly steps: Step[];
  readonly maxTicks: number;

  constructor(
    readonly name: string,
    readonly direction: Direction,
    readonly cfg: MascotConfig,
    steps: Step[],
    private readonly opts: {
      endsAfterLoop: boolean;
      edges?: (top: boolean, bottom: boolean, left: boolean, right: boolean) => boolean;
      next: () => Animation;
      maxTicks?: () => number;
      timeout?: () => Animation | null;
    }
  ) {
    this.steps = steps;
    this.maxTicks = opts.maxTicks ? opts.maxTicks() : 0;
  }

  onEdges(top: boolean, bottom: boolean, left: boolean, right: boolean) {
    if (this.opts.edges) this.ended = this.opts.edges(top, bottom, left, right);
  }
  get endsAfterLoop() {
    return this.opts.endsAfterLoop;
  }
  next(): Animation {
    return this.opts.next();
  }
  timeout(): Animation | null {
    return this.opts.timeout ? this.opts.timeout() : null;
  }
  get step(): Step {
    return this.steps[this.stepIndex];
  }
}

// ---- concrete animations -------------------------------------------------

export function Stand(d: Direction, c: MascotConfig) {
  return new Animation('Stand', d, c, [[0, 0, 0, 150]], { endsAfterLoop: true, next: () => Walk(d, c) });
}

export function Walk(d: Direction, c: MascotConfig): Animation {
  const s = d === 'LEFT' ? -2 : 2;
  return new Animation('Walk', d, c, [[0, s, 0, 6], [1, s, 0, 6], [0, s, 0, 6], [2, s, 0, 6]], {
    endsAfterLoop: false,
    edges: (_t, _b, l, r) => (d === 'LEFT' ? l : r),
    next: () => (coin() ? Climb(d, c) : Walk(d === 'LEFT' ? 'RIGHT' : 'LEFT', c)),
    maxTicks: () => rnd(60) + 10,
    timeout: () => randomIdle(d, c),
  });
}

/** Walk.f(): pick a random idle / special animation. */
function randomIdle(d: Direction, c: MascotConfig): Animation {
  const list: Animation[] = [
    Sit(d, c),
    Stand(d, c),
    Wink(d, c),
    SitAndDangleLegs(d, c),
    SitWithLegsDown(d, c),
    SitAndLookUp(d, c),
    Tripping(d, c),
    Creep(d, c),
  ];
  if (c.special === 0) list.push(Special(d, c));
  if (c.special2 === 0) list.push(Special2(d, c));
  return list[rnd(list.length)];
}

export function Falling(c: MascotConfig, d?: Direction) {
  const dir = d ?? (coin() ? 'LEFT' : 'RIGHT');
  return new Animation('Falling', dir, c, [[3, 0, 15, 250]], {
    endsAfterLoop: false,
    edges: (_t, bottom) => bottom,
    next: () => Bounce(dir, c),
  });
}

export function Bounce(d: Direction, c: MascotConfig) {
  return new Animation('Bounce', d, c, [[17, 0, 0, 8], [18, 0, 0, 8]], {
    endsAfterLoop: true,
    next: () => Walk(coin() ? 'LEFT' : 'RIGHT', c),
  });
}

export function Climb(d: Direction, c: MascotConfig): Animation {
  return new Animation(
    'Climb',
    d,
    c,
    [[13, 0, 0, 16], [13, 0, -1, 4], [11, 0, -1, 4], [12, 0, -1, 4], [12, 0, 0, 16], [12, 0, -2, 4], [11, 0, -2, 4], [13, 0, -2, 4]],
    {
      endsAfterLoop: false,
      edges: (top) => top,
      next: () => ClimbCeiling(d === 'LEFT' ? 'RIGHT' : 'LEFT', c),
      maxTicks: () => rnd(300) + 50,
      timeout: () =>
        rnd(100) < 70 ? Jump(d === 'LEFT' ? 'RIGHT' : 'LEFT', c) : Falling(c, d),
    }
  );
}

export function ClimbCeiling(d: Direction, c: MascotConfig): Animation {
  const s = d === 'LEFT' ? -1 : 1;
  return new Animation(
    'ClimbCeiling',
    d,
    c,
    [[24, 0, 0, 16], [24, s, 0, 4], [22, s, 0, 4], [23, s, 0, 4], [23, 0, 0, 16], [23, 2 * s, 0, 4], [22, 2 * s, 0, 4], [24, 2 * s, 0, 4]],
    {
      endsAfterLoop: false,
      edges: (_t, _b, l, r) => (d === 'LEFT' ? l : r),
      next: () => (coin() ? Descend(d, c) : ClimbCeiling(d === 'LEFT' ? 'RIGHT' : 'LEFT', c)),
      maxTicks: () => rnd(170) + 30,
      timeout: () => Falling(c, d),
    }
  );
}

export function Descend(d: Direction, c: MascotConfig) {
  return new Animation(
    'Descend',
    d,
    c,
    [[13, 0, 0, 16], [13, 0, 2, 4], [11, 0, 2, 4], [12, 0, 2, 4], [12, 0, 0, 16], [12, 0, 1, 4], [11, 0, 1, 4], [13, 0, 1, 4]],
    {
      endsAfterLoop: false,
      edges: (_t, bottom) => bottom,
      next: () => (coin() ? Climb(d, c) : Walk(d === 'LEFT' ? 'RIGHT' : 'LEFT', c)),
    }
  );
}

export function Jump(d: Direction, c: MascotConfig) {
  return new Animation('Jump', d, c, [[21, d === 'LEFT' ? -10 : 10, -1, 2]], {
    endsAfterLoop: false,
    edges: (_t, _b, l, r) => (d === 'LEFT' ? l : r),
    next: () => Climb(d, c),
  });
}

export function Creep(d: Direction, c: MascotConfig) {
  const s = d === 'LEFT' ? -1 : 1;
  return new Animation('Creep', d, c, [[19, 0, 0, 28], [19, 2 * s, 0, 4], [20, 2 * s, 0, 4], [20, s, 0, 4], [20, 0, 0, 24]], {
    endsAfterLoop: false,
    edges: (_t, _b, l, r) => (d === 'LEFT' ? l : r),
    next: () => Climb(d, c),
  });
}

const idle = (name: string, steps: Step[]) => (d: Direction, c: MascotConfig) =>
  new Animation(name, d, c, steps, { endsAfterLoop: true, next: () => Walk(d, c) });

export const Sit = idle('Sit', [[10, 0, 0, 250]]);
export const SitWithLegsDown = idle('SitWithLegsDown', [[30, 0, 0, 250]]);
export const SitAndLookUp = idle('SitAndLookUp', [[25, 0, 0, 250]]);
export const Wink = idle('Wink', [[14, 0, 0, 30], [16, 0, 0, 5], [14, 0, 0, 30]]);
export const SitAndDangleLegs = idle('SitAndDangleLegs', [
  [30, 0, 0, 5], [31, 0, 0, 15], [30, 0, 0, 5], [31, 0, 0, 15], [30, 0, 0, 5],
  [31, 0, 0, 15], [30, 0, 0, 5], [31, 0, 0, 15], [30, 0, 0, 5], [31, 0, 0, 15],
]);
export const Special = idle('Special', [[0, 0, 0, 16], [37, 0, 0, 20], [38, 0, 0, 20], [39, 0, 0, 20], [40, 0, 0, 20]]);
export const Special2 = idle('Special2', [
  [41, 0, 0, 10], [42, 0, 0, 4], [43, 0, 0, 4], [44, 0, 0, 10], [45, 0, 0, 20],
  [44, 0, 0, 10], [43, 0, 0, 4], [42, 0, 0, 4], [41, 0, 0, 10],
]);

export function Tripping(d: Direction, c: MascotConfig) {
  const s = d === 'LEFT' ? -1 : 1;
  return new Animation('Tripping', d, c, side(d,
    [[18, -8, 0, 8], [17, -4, 0, 4], [19, -2, 0, 4], [19, 0, 0, 10], [18, -4, 0, 4]],
    [[18, 8 * s, 0, 8], [17, 4 * s, 0, 4], [19, 2 * s, 0, 4], [19, 0, 0, 10], [18, 4 * s, 0, 4]]),
  { endsAfterLoop: true, next: () => Walk(d, c) });
}

export function Dragging(c: MascotConfig) {
  const d: Direction = coin() ? 'LEFT' : 'RIGHT';
  return new Animation('Dragging', d, c, [[6, 0, 0, 8], [4, 0, 0, 8], [5, 0, 0, 8], [7, 0, 0, 8], [5, 0, 0, 8], [4, 0, 0, 8]], {
    endsAfterLoop: false,
    next: () => Falling(c, d),
  });
}

export function Flinging(vx: number, c: MascotConfig) {
  const d: Direction = vx < 0 ? 'LEFT' : 'RIGHT';
  let hit = { top: false, bottom: false, left: false, right: false };
  return new Animation('Flinging', d, c, [[7, 0, 0, 250]], {
    endsAfterLoop: false,
    edges: (top, bottom, left, right) => {
      hit = { top, bottom, left, right };
      return top || bottom || left || right;
    },
    next: () =>
      hit.left ? Climb('LEFT', c)
      : hit.right ? Climb('RIGHT', c)
      : hit.top ? ClimbCeiling(d, c)
      : hit.bottom ? Bounce(d, c)
      : Falling(c, d),
  });
}

/** Every frame index the engine can show (SpriteUtil.f()). */
export const USED_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 30, 31, 37, 38, 39, 40, 41, 42, 43, 44, 45];
