package expo.modules.petoverlay

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.net.Uri
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import java.io.File
import kotlin.math.abs

/** One floating pet window (MascotView in the original, minus the SurfaceView). */
@SuppressLint("ViewConstructor")
class MascotView(
  context: Context,
  val petId: Int,
  dir: String,
  size: Double,
  speed: Double,
  screenW: Int,
  screenH: Int,
  private val onTap: (MascotView) -> Unit,
) : View(context) {
  private val sprites = HashMap<Int, Bitmap>()
  val mascot: Mascot
  private val paint = Paint(Paint.FILTER_BITMAP_FLAG)
  private val matrix = Matrix()

  init {
    // "builtin:<id>" = sprites packaged in the APK assets; anything else is a folder on disk (imported packs)
    val builtinId = if (dir.startsWith(BUILTIN_PREFIX)) dir.removePrefix(BUILTIN_PREFIX) else null
    val folder = File(Uri.decode(dir.removePrefix("file://")))
    for (i in 0 until FRAME_COUNT) {
      val name = "shime${i + 1}.png"
      val raw: Bitmap? = try {
        if (builtinId != null) {
          context.assets.open("pets/$builtinId/$name").use { BitmapFactory.decodeStream(it) }
        } else {
          val f = File(folder, name)
          if (f.exists()) BitmapFactory.decodeFile(f.absolutePath) else null
        }
      } catch (_: Exception) {
        null
      }
      if (raw != null) {
        val w = (raw.width * size).toInt().coerceAtLeast(1)
        val h = (raw.height * size).toInt().coerceAtLeast(1)
        val scaled = Bitmap.createScaledBitmap(raw, w, h, true)
        sprites[i] = scaled
        if (scaled !== raw) raw.recycle()
      }
    }
    val base = sprites[0]
    mascot = Mascot(base?.width ?: 128, base?.height ?: 128, screenW, screenH, speed)
  }

  val isValid get() = sprites.containsKey(0)
  val bitmap0 get() = sprites[0]

  override fun onDraw(canvas: Canvas) {
    val bmp = sprites[mascot.frame] ?: sprites[0] ?: return
    if (mascot.facingLeft) {
      canvas.drawBitmap(bmp, 0f, 0f, paint)
    } else {
      matrix.setScale(-1f, 1f)
      matrix.postTranslate(bmp.width.toFloat(), 0f)
      canvas.drawBitmap(bmp, matrix, paint)
    }
  }

  // --- touch: drag, fling, tap (GestureDetector equivalent using raw coordinates) ---
  private var downRawX = 0f
  private var downRawY = 0f
  private var startX = 0
  private var startY = 0
  private var moved = false
  private var downTime = 0L
  private var tracker: VelocityTracker? = null

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(e: MotionEvent): Boolean {
    when (e.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downRawX = e.rawX; downRawY = e.rawY
        startX = mascot.x; startY = mascot.y
        moved = false; downTime = System.currentTimeMillis()
        tracker?.recycle()
        tracker = VelocityTracker.obtain().also { it.addMovement(e) }
      }
      MotionEvent.ACTION_MOVE -> {
        tracker?.addMovement(e)
        val dx = e.rawX - downRawX
        val dy = e.rawY - downRawY
        if (abs(dx) + abs(dy) > 12) moved = true
        if (moved) mascot.dragTo(startX + dx.toInt(), startY + dy.toInt())
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        tracker?.addMovement(e)
        if (!moved && System.currentTimeMillis() - downTime < 400) {
          mascot.dragging = false
          if (e.actionMasked == MotionEvent.ACTION_UP) {
            performClick()
            onTap(this)
          }
        } else {
          tracker?.computeCurrentVelocity(1000)
          mascot.release(tracker?.xVelocity ?: 0f, tracker?.yVelocity ?: 0f)
        }
        tracker?.recycle(); tracker = null
      }
    }
    return true
  }

  override fun performClick(): Boolean = super.performClick()

  fun release() {
    sprites.values.forEach { if (!it.isRecycled) it.recycle() }
    sprites.clear()
  }

  companion object {
    const val FRAME_COUNT = 46
    const val BUILTIN_PREFIX = "builtin:"
  }
}
