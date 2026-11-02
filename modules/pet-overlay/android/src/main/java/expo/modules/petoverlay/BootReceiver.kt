package expo.modules.petoverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Settings

/** Restarts the floating pets after a reboot if they were switched on (original BootReceiver). */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    if (PetOverlayService.isEnabled(context) && Settings.canDrawOverlays(context)) {
      try {
        PetOverlayService.start(context)
      } catch (_: Exception) {
      }
    }
  }
}
