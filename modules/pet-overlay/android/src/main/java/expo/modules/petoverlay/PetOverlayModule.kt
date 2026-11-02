package expo.modules.petoverlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PetOverlayModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PetOverlay")

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    Function("requestOverlayPermission") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("start") { configJson: String ->
      PetOverlayService.saveConfig(context, configJson)
      PetOverlayService.setHidden(context, false)
      PetOverlayService.running = true
      PetOverlayService.start(context)
    }

    Function("stop") {
      PetOverlayService.setEnabled(context, false)
      PetOverlayService.running = false
      context.stopService(Intent(context, PetOverlayService::class.java))
    }

    Function("hide") {
      if (PetOverlayService.running) PetOverlayService.start(context, PetOverlayService.ACTION_HIDE)
    }

    Function("show") {
      if (PetOverlayService.running) PetOverlayService.start(context, PetOverlayService.ACTION_SHOW)
    }

    Function("isRunning") {
      PetOverlayService.running
    }

    Function("consumeStoppedByUser") {
      PetOverlayService.consumeStoppedByUser(context)
    }

    Function("isHidden") {
      PetOverlayService.isHidden(context)
    }

    Function("markFed") {
      PetOverlayService.markFed(context)
    }
  }
}
