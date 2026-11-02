package expo.modules.petoverlay

import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.random.Random

/**
 * Kotlin port of the Shimeji state machine (same tables as src/engine/animations.ts,
 * which in turn mirror the decompiled shimeji.lib.animations.* classes).
 */
enum class Dir { LEFT, RIGHT }

private fun flip(d: Dir) = if (d == Dir.LEFT) Dir.RIGHT else Dir.LEFT
private fun coin() = Random.nextBoolean()

/** frame, dx, dy, duration (ticks of 30 ms) */
class Step(val frame: Int, val dx: Int, val dy: Int, val duration: Int)

private fun steps(vararg s: IntArray) = s.map { Step(it[0], it[1], it[2], it[3]) }
private fun st(f: Int, dx: Int, dy: Int, d: Int) = intArrayOf(f, dx, dy, d)

class Anim(
  val name: String,
  val dir: Dir,
  val steps: List<Step>,
  val endsAfterLoop: Boolean,
  private val edges: ((top: Boolean, bottom: Boolean, left: Boolean, right: Boolean) -> Boolean)? = null,
  maxTicksFn: (() -> Int)? = null,
  private val timeoutFn: (() -> Anim)? = null,
  private val nextFn: () -> Anim,
) {
  var ticks = 0
  var stepStart = 0
  var stepIndex = 0
  var ended = false
  val maxTicks = maxTicksFn?.invoke() ?: 0
  val step get() = steps[stepIndex]
  fun onEdges(t: Boolean, b: Boolean, l: Boolean, r: Boolean) {
    edges?.let { ended = it(t, b, l, r) }
  }
  fun next() = nextFn()
  fun timeout() = timeoutFn?.invoke()
}

object Anims {
  fun stand(d: Dir) = Anim("Stand", d, steps(st(0, 0, 0, 150)), true) { walk(d) }

  fun walk(d: Dir): Anim {
    val s = if (d == Dir.LEFT) -2 else 2
    return Anim(
      "Walk", d, steps(st(0, s, 0, 6), st(1, s, 0, 6), st(0, s, 0, 6), st(2, s, 0, 6)), false,
      edges = { _, _, l, r -> if (d == Dir.LEFT) l else r },
      maxTicksFn = { Random.nextInt(60) + 10 },
      timeoutFn = { randomIdle(d) },
    ) { if (coin()) climb(d) else walk(flip(d)) }
  }

  private fun randomIdle(d: Dir): Anim {
    val list = listOf(
      idle("Sit", d, steps(st(10, 0, 0, 250))),
      stand(d),
      idle("Wink", d, steps(st(14, 0, 0, 30), st(16, 0, 0, 5), st(14, 0, 0, 30))),
      idle("SitAndDangleLegs", d, (0 until 5).flatMap { steps(st(30, 0, 0, 5), st(31, 0, 0, 15)) }),
      idle("SitWithLegsDown", d, steps(st(30, 0, 0, 250))),
      idle("SitAndLookUp", d, steps(st(25, 0, 0, 250))),
      tripping(d),
      creep(d),
      idle("Special", d, steps(st(0, 0, 0, 16), st(37, 0, 0, 20), st(38, 0, 0, 20), st(39, 0, 0, 20), st(40, 0, 0, 20))),
      idle(
        "Special2", d,
        steps(
          st(41, 0, 0, 10), st(42, 0, 0, 4), st(43, 0, 0, 4), st(44, 0, 0, 10), st(45, 0, 0, 20),
          st(44, 0, 0, 10), st(43, 0, 0, 4), st(42, 0, 0, 4), st(41, 0, 0, 10),
        ),
      ),
    )
    return list[Random.nextInt(list.size)]
  }

  private fun idle(name: String, d: Dir, s: List<Step>) = Anim(name, d, s, true) { walk(d) }

  fun falling(d: Dir = if (coin()) Dir.LEFT else Dir.RIGHT): Anim =
    Anim("Falling", d, steps(st(3, 0, 15, 250)), false, edges = { _, b, _, _ -> b }) { bounce(d) }

  fun bounce(d: Dir) = Anim("Bounce", d, steps(st(17, 0, 0, 8), st(18, 0, 0, 8)), true) { walk(if (coin()) Dir.LEFT else Dir.RIGHT) }

  fun climb(d: Dir): Anim = Anim(
    "Climb", d,
    steps(st(13, 0, 0, 16), st(13, 0, -1, 4), st(11, 0, -1, 4), st(12, 0, -1, 4), st(12, 0, 0, 16), st(12, 0, -2, 4), st(11, 0, -2, 4), st(13, 0, -2, 4)),
    false,
    edges = { t, _, _, _ -> t },
    maxTicksFn = { Random.nextInt(300) + 50 },
    timeoutFn = { if (Random.nextInt(100) < 70) jump(flip(d)) else falling(d) },
  ) { climbCeiling(flip(d)) }

  fun climbCeiling(d: Dir): Anim {
    val s = if (d == Dir.LEFT) -1 else 1
    return Anim(
      "ClimbCeiling", d,
      steps(st(24, 0, 0, 16), st(24, s, 0, 4), st(22, s, 0, 4), st(23, s, 0, 4), st(23, 0, 0, 16), st(23, 2 * s, 0, 4), st(22, 2 * s, 0, 4), st(24, 2 * s, 0, 4)),
      false,
      edges = { _, _, l, r -> if (d == Dir.LEFT) l else r },
      maxTicksFn = { Random.nextInt(170) + 30 },
      timeoutFn = { falling(d) },
    ) { if (coin()) descend(d) else climbCeiling(flip(d)) }
  }

  fun descend(d: Dir) = Anim(
    "Descend", d,
    steps(st(13, 0, 0, 16), st(13, 0, 2, 4), st(11, 0, 2, 4), st(12, 0, 2, 4), st(12, 0, 0, 16), st(12, 0, 1, 4), st(11, 0, 1, 4), st(13, 0, 1, 4)),
    false,
    edges = { _, b, _, _ -> b },
  ) { if (coin()) climb(d) else walk(flip(d)) }

  fun jump(d: Dir) = Anim(
    "Jump", d, steps(st(21, if (d == Dir.LEFT) -10 else 10, -1, 2)), false,
    edges = { _, _, l, r -> if (d == Dir.LEFT) l else r },
  ) { climb(d) }

  fun creep(d: Dir): Anim {
    val s = if (d == Dir.LEFT) -1 else 1
    return Anim(
      "Creep", d, steps(st(19, 0, 0, 28), st(19, 2 * s, 0, 4), st(20, 2 * s, 0, 4), st(20, s, 0, 4), st(20, 0, 0, 24)), false,
      edges = { _, _, l, r -> if (d == Dir.LEFT) l else r },
    ) { climb(d) }
  }

  fun tripping(d: Dir): Anim {
    val s = if (d == Dir.LEFT) -1 else 1
    return Anim("Tripping", d, steps(st(18, 8 * s, 0, 8), st(17, 4 * s, 0, 4), st(19, 2 * s, 0, 4), st(19, 0, 0, 10), st(18, 4 * s, 0, 4)), true) { walk(d) }
  }

  fun dragging(): Anim {
    val d = if (coin()) Dir.LEFT else Dir.RIGHT
    return Anim("Dragging", d, steps(st(6, 0, 0, 8), st(4, 0, 0, 8), st(5, 0, 0, 8), st(7, 0, 0, 8), st(5, 0, 0, 8), st(4, 0, 0, 8)), false) { falling(d) }
  }

  fun flinging(vx: Float): Anim {
    val d = if (vx < 0) Dir.LEFT else Dir.RIGHT
    var hit = BooleanArray(4)
    return Anim(
      "Flinging", d, steps(st(7, 0, 0, 250)), false,
      edges = { t, b, l, r -> hit = booleanArrayOf(t, b, l, r); t || b || l || r },
    ) {
      when {
        hit[2] -> climb(Dir.LEFT)
        hit[3] -> climb(Dir.RIGHT)
        hit[0] -> climbCeiling(d)
        hit[1] -> bounce(d)
        else -> falling(d)
      }
    }
  }
}

/** Port of shimeji.lib.Mascot — all units are device pixels. */
class Mascot(val width: Int, val height: Int, screenW: Int, screenH: Int, var speed: Double) {
  var anim: Anim = Anims.falling()
  var x = 0
  var y = 0
  var dragging = false
  var flinging = false
  var facingLeft = true
  private var top = 0
  private var bottom = 0
  private var left = 0
  private var right = 0
  private var fvx = 0f
  private var fvy = 0f

  init {
    resize(screenW, screenH)
    clampX(Random.nextInt(max(1, right - width)))
    y = top
  }

  fun resize(screenW: Int, screenH: Int) {
    val o = width / 3
    top = -o; bottom = screenH; left = -o; right = screenW + o
    anim = Anims.falling()
  }

  fun clampX(v: Int) { x = max(left, min(right - width, v)) }
  fun clampY(v: Int) { y = max(top, min(bottom - height, v)) }

  fun dragTo(nx: Int, ny: Int) { clampX(nx); clampY(ny); dragging = true }

  fun release(vx: Float, vy: Float) {
    dragging = false
    if (hypot(vx, vy) > 600f) { flinging = true; fvx = vx; fvy = vy }
  }

  private val mult get() = if (speed <= 0.1) 1.0 else speed + 0.9

  fun tick() {
    if (flinging) {
      val dt = TICK_MS / 1000f
      clampX((x + fvx * dt).toInt()); clampY((y + fvy * dt).toInt())
      val decay = 0.08f.pow(dt)
      fvx *= decay; fvy *= decay
      if (hypot(fvx, fvy) < 60f) flinging = false
    }
    var a = anim
    if (dragging) {
      if (a.name != "Dragging") a = Anims.dragging()
    } else if (!flinging) {
      if (a.name == "Dragging" || a.name == "Flinging") a = a.next()
    } else if (a.name != "Flinging") {
      a = Anims.flinging(fvx)
    }
    a.onEdges(y <= top, y + height >= bottom, x <= left, x + width >= right)
    clampX(x + (a.step.dx * mult).toInt())
    clampY(y + (a.step.dy * mult).toInt())
    facingLeft = a.dir == Dir.LEFT

    a.ticks++
    val timedOut = if (!a.ended && a.maxTicks > 0 && a.ticks >= a.maxTicks) a.timeout() else null
    if (a.ended) {
      a = a.next()
    } else if (timedOut != null) {
      a = timedOut
    } else if (a.ticks > a.stepStart + a.step.duration) {
      a.stepStart = a.ticks
      var loopDone = false
      if (a.stepIndex + 1 >= a.steps.size) {
        loopDone = a.endsAfterLoop
        a.stepIndex = 0
      } else {
        a.stepIndex++
      }
      if (loopDone) a = a.next()
    }
    anim = a
  }

  val frame get() = anim.step.frame

  companion object {
    const val TICK_MS = 30L
  }
}
