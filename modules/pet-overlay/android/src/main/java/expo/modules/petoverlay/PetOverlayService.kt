package expo.modules.petoverlay

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject

/**
 * Foreground service that draws the pets over other apps — the equivalent of the
 * original ShimejiService (WindowManager overlay windows + 30 ms engine loop,
 * tap menu, "time change" re-shuffle and the hungry popup), plus Hide/Show/Stop.
 */
class PetOverlayService : Service() {
  private lateinit var wm: WindowManager
  private val handler = Handler(Looper.getMainLooper())
  private val views = mutableListOf<MascotView>()
  private val params = HashMap<MascotView, WindowManager.LayoutParams>()
  private var menu: View? = null
  private var hungryPopup: View? = null
  private var config = Config()
  private var screenOn = true

  data class Pet(val id: Int, val dir: String)
  data class Config(
    val pets: List<Pet> = emptyList(),
    val count: Int = 1,
    val size: Double = 1.6,
    val speed: Double = 1.5,
    val timeChangeMinutes: Int = 5,
    val hungryMinutes: Int = 30,
  )

  private val loop = object : Runnable {
    override fun run() {
      if (screenOn) {
        for (v in views) {
          v.mascot.tick()
          val lp = params[v] ?: continue
          lp.x = v.mascot.x
          lp.y = v.mascot.y
          if (v.isAttachedToWindow) {
            try {
              wm.updateViewLayout(v, lp)
            } catch (_: Exception) {
            }
            v.invalidate()
          }
        }
      }
      handler.postDelayed(this, Mascot.TICK_MS)
    }
  }

  private val reshuffle = object : Runnable {
    override fun run() {
      if (!hidden) showPets()
      handler.postDelayed(this, config.timeChangeMinutes.coerceAtLeast(1) * 60_000L)
    }
  }

  private val hungryChecker = object : Runnable {
    override fun run() {
      checkHungry()
      handler.postDelayed(this, 5000)
    }
  }

  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      screenOn = intent.action == Intent.ACTION_SCREEN_ON
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_SCREEN_ON)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(screenReceiver, filter)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Always satisfy the startForeground() contract first (required within 5 s on Android 8+).
    startInForeground()
    when (intent?.action) {
      ACTION_STOP -> {
        setEnabled(this, false)
        prefs(this).edit().putBoolean(KEY_STOPPED_BY_USER, true).apply()
        stopSelf()
        return START_NOT_STICKY
      }
      ACTION_HIDE -> {
        setHidden(this, true)
        removeMenu()
        clearPets()
        startInForeground()
        if (running) return START_STICKY
      }
      ACTION_SHOW -> {
        setHidden(this, false)
        startInForeground()
        if (running) {
          if (Settings.canDrawOverlays(this)) showPets()
          return START_STICKY
        }
      }
    }
    // Not running yet (fresh start, boot, or the system restarted us): full start below.
    if (!Settings.canDrawOverlays(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    // (Re)start: new config, fresh pets — clearPets() inside showPets() prevents duplicates.
    config = loadConfig(this)
    running = true
    handler.removeCallbacksAndMessages(null)
    handler.post(reshuffle)
    handler.post(loop)
    if (config.hungryMinutes > 0) handler.postDelayed(hungryChecker, 5000)
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    handler.removeCallbacksAndMessages(null)
    try {
      unregisterReceiver(screenReceiver)
    } catch (_: Exception) {
    }
    clearPets()
    removeMenu()
    removeHungry()
    super.onDestroy()
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    val (w, h) = screenSize()
    views.forEach { it.mascot.resize(w, h) }
  }

  // ---------------------------------------------------------------- pets

  private fun overlayType() =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }

  private val overlayFlags =
    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
      WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS

  /** Playground.getHeight(): screen height minus the status bar. */
  private fun screenSize(): Pair<Int, Int> {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val m = wm.currentWindowMetrics
      val insets = m.windowInsets.getInsetsIgnoringVisibility(WindowInsets.Type.statusBars())
      Pair(m.bounds.width(), m.bounds.height() - insets.top)
    } else {
      val dm = resources.displayMetrics
      Pair(dm.widthPixels, dm.heightPixels)
    }
  }

  private fun clearPets() {
    for (v in views) {
      try {
        wm.removeViewImmediate(v)
      } catch (_: Exception) {
      }
      v.release()
    }
    views.clear()
    params.clear()
  }

  private fun showPets() {
    clearPets()
    val (w, h) = screenSize()
    val chosen = config.pets.shuffled().take(config.count.coerceIn(1, 6))
    for (p in chosen) {
      val v = MascotView(this, p.id, p.dir, config.size, config.speed, w, h) { showMenu(it) }
      if (!v.isValid) {
        v.release()
        continue
      }
      val lp = WindowManager.LayoutParams(
        v.mascot.width,
        v.mascot.height,
        overlayType(),
        overlayFlags,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.TOP or Gravity.START
        x = v.mascot.x
        y = v.mascot.y
      }
      try {
        wm.addView(v, lp)
        views += v
        params[v] = lp
      } catch (e: Exception) {
        // Overlay permission revoked while running: give up cleanly, the app recovers on next open.
        v.release()
        clearPets()
        running = false
        stopSelf()
        return
      }
    }
  }

  // ---------------------------------------------------------------- tap menu (PopupControlView)

  private fun dp(v: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

  private fun pill(color: Int, radius: Int = 16) = GradientDrawable().apply {
    setColor(color)
    cornerRadius = dp(radius).toFloat()
  }

  private val hideMenu = Runnable { removeMenu() }

  private fun menuButton(label: String, onClick: () -> Unit) = TextView(this).apply {
    text = label
    textSize = 13f
    setTextColor(Color.parseColor("#3a2828"))
    gravity = Gravity.CENTER
    setPadding(dp(12), dp(8), dp(12), dp(8))
    background = pill(Color.parseColor("#fff3ee"), 10)
    setOnClickListener {
      removeMenu()
      onClick()
    }
  }

  private fun showMenu(pet: MascotView) {
    removeMenu()
    val row = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      setPadding(dp(6), dp(6), dp(6), dp(6))
      background = pill(Color.WHITE).apply { setStroke(dp(2), PRIMARY) }
      elevation = dp(6).toFloat()
    }
    row.addView(menuButton("🏠 Home") { openApp("home") })
    row.addView(View(this), LinearLayout.LayoutParams(dp(6), 1))
    row.addView(menuButton("⚙️ Settings") { openApp("settings") })
    row.addView(View(this), LinearLayout.LayoutParams(dp(6), 1))
    row.addView(menuButton("🙈 Hide") { hideAll() })

    val lp = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType(),
      overlayFlags,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = (pet.mascot.x + pet.mascot.width / 2 - dp(130)).coerceAtLeast(0)
      y = (pet.mascot.y - dp(52)).coerceAtLeast(0)
    }
    try {
      wm.addView(row, lp)
      menu = row
      handler.postDelayed(hideMenu, 5000)
    } catch (_: Exception) {
    }
  }

  private fun removeMenu() {
    handler.removeCallbacks(hideMenu)
    menu?.let {
      try {
        wm.removeViewImmediate(it)
      } catch (_: Exception) {
      }
    }
    menu = null
  }

  private fun hideAll() {
    setHidden(this, true)
    clearPets()
    startInForeground()
  }

  private fun openApp(path: String) {
    val i = Intent(Intent.ACTION_VIEW, Uri.parse("petsonscreen:///$path")).apply {
      setPackage(packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    try {
      startActivity(i)
    } catch (_: Exception) {
      packageManager.getLaunchIntentForPackage(packageName)?.let {
        it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(it)
      }
    }
  }

  // ---------------------------------------------------------------- hungry popup (PopupHungryView)

  private fun isAppInForeground(): Boolean {
    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    return am.runningAppProcesses?.any {
      it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND && it.processName == packageName
    } ?: false
  }

  private fun checkHungry() {
    if (config.hungryMinutes <= 0 || hungryPopup != null || !screenOn || hidden) return
    val lastFed = prefs(this).getLong(KEY_LAST_FED, System.currentTimeMillis())
    if (System.currentTimeMillis() - lastFed < config.hungryMinutes * 60_000L) return
    if (isAppInForeground()) return
    val pet = views.randomOrNull() ?: return

    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(20), dp(16), dp(20), dp(18))
      background = pill(Color.WHITE, 24).apply { setStroke(dp(3), PRIMARY) }
      elevation = dp(8).toFloat()
    }
    val close = TextView(this).apply {
      text = "✕"
      textSize = 18f
      setTextColor(Color.GRAY)
      setOnClickListener {
        markFed(this@PetOverlayService)
        removeHungry()
      }
    }
    card.addView(
      close,
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { gravity = Gravity.END },
    )
    val image = ImageView(this)
    pet.bitmap0?.let { image.setImageBitmap(it) }
    card.addView(image, LinearLayout.LayoutParams(dp(110), dp(110)))
    card.addView(
      TextView(this).apply {
        text = "I’m hungry now!\nI want to eat something.."
        textSize = 16f
        setTextColor(Color.parseColor("#3a2828"))
        gravity = Gravity.CENTER
        setPadding(0, dp(8), 0, dp(12))
      },
    )
    card.addView(
      TextView(this).apply {
        text = "Feed 🍔"
        textSize = 16f
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        setPadding(dp(36), dp(10), dp(36), dp(10))
        background = pill(PRIMARY, 30)
        setOnClickListener {
          markFed(this@PetOverlayService)
          removeHungry()
          openApp("hungry?petId=${pet.petId}")
        }
      },
    )

    val lp = WindowManager.LayoutParams(
      dp(300),
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType(),
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply { gravity = Gravity.CENTER }
    try {
      wm.addView(card, lp)
      hungryPopup = card
    } catch (_: Exception) {
    }
  }

  private fun removeHungry() {
    hungryPopup?.let {
      try {
        wm.removeViewImmediate(it)
      } catch (_: Exception) {
      }
    }
    hungryPopup = null
  }

  // ---------------------------------------------------------------- notification

  private fun serviceIntent(action: String, code: Int): PendingIntent {
    val i = Intent(this, PetOverlayService::class.java).setAction(action)
    return PendingIntent.getService(this, code, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun startInForeground() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(NotificationChannel(CHANNEL, "Pets on screen", NotificationManager.IMPORTANCE_LOW))
    }
    val open = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
    val contentIntent = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(this, CHANNEL)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(this)
      }
    val icon = Icon.createWithResource(this, applicationInfo.icon)
    val toggle =
      if (hidden) {
        Notification.Action.Builder(icon, "Show", serviceIntent(ACTION_SHOW, 2)).build()
      } else {
        Notification.Action.Builder(icon, "Hide", serviceIntent(ACTION_HIDE, 1)).build()
      }
    val stop = Notification.Action.Builder(icon, "Stop", serviceIntent(ACTION_STOP, 3)).build()
    val notification = builder
      .setContentTitle(if (hidden) "Pets are hidden" else "Pets are visible")
      .setContentText("Tap to edit your pets")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setContentIntent(contentIntent)
      .addAction(toggle)
      .addAction(stop)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private val hidden get() = isHidden(this)

  companion object {
    const val ACTION_STOP = "expo.modules.petoverlay.STOP"
    const val ACTION_HIDE = "expo.modules.petoverlay.HIDE"
    const val ACTION_SHOW = "expo.modules.petoverlay.SHOW"
    private const val CHANNEL = "pets_on_screen"
    private const val NOTIFICATION_ID = 99
    private const val PREFS = "pet_overlay"
    private const val KEY_CONFIG = "config"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_HIDDEN = "hidden"
    private const val KEY_LAST_FED = "lastFed"
    private const val KEY_STOPPED_BY_USER = "stoppedByUser"
    private val PRIMARY = Color.parseColor("#fc9268")

    @Volatile var running = false

    fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveConfig(ctx: Context, json: String) {
      val lastFed = try {
        JSONObject(json).optLong("lastFed", 0)
      } catch (_: Exception) {
        0L
      }
      val p = prefs(ctx)
      p.edit()
        .putString(KEY_CONFIG, json)
        .putBoolean(KEY_ENABLED, true)
        .putBoolean(KEY_STOPPED_BY_USER, false)
        .putLong(KEY_LAST_FED, maxOf(lastFed, p.getLong(KEY_LAST_FED, 0)))
        .apply()
    }

    fun setEnabled(ctx: Context, enabled: Boolean) = prefs(ctx).edit().putBoolean(KEY_ENABLED, enabled).apply()
    fun isEnabled(ctx: Context) = prefs(ctx).getBoolean(KEY_ENABLED, false)
    fun setHidden(ctx: Context, hidden: Boolean) = prefs(ctx).edit().putBoolean(KEY_HIDDEN, hidden).apply()
    fun isHidden(ctx: Context) = prefs(ctx).getBoolean(KEY_HIDDEN, false)
    /** True once "Stop" was pressed in the notification, until the app starts the service again. */
    fun consumeStoppedByUser(ctx: Context): Boolean {
      val p = prefs(ctx)
      val v = p.getBoolean(KEY_STOPPED_BY_USER, false)
      if (v) p.edit().putBoolean(KEY_STOPPED_BY_USER, false).apply()
      return v
    }

    fun markFed(ctx: Context) = prefs(ctx).edit().putLong(KEY_LAST_FED, System.currentTimeMillis()).apply()

    fun loadConfig(ctx: Context): Config {
      val raw = prefs(ctx).getString(KEY_CONFIG, null) ?: return Config()
      return try {
        val o = JSONObject(raw)
        val arr = o.optJSONArray("pets")
        val pets = mutableListOf<Pet>()
        if (arr != null) {
          for (i in 0 until arr.length()) {
            val p = arr.getJSONObject(i)
            pets += Pet(p.getInt("id"), p.getString("dir"))
          }
        }
        Config(
          pets = pets,
          count = o.optInt("count", 1),
          size = o.optDouble("size", 1.6),
          speed = o.optDouble("speed", 1.5),
          timeChangeMinutes = o.optInt("timeChangeMinutes", 5),
          hungryMinutes = o.optInt("hungryMinutes", 30),
        )
      } catch (_: Exception) {
        Config()
      }
    }

    fun start(ctx: Context, action: String? = null) {
      val i = Intent(ctx, PetOverlayService::class.java)
      if (action != null) i.action = action
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i) else ctx.startService(i)
    }
  }
}
