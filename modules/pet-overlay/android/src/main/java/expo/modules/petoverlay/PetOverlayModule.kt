package expo.modules.petoverlay

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.os.Bundle
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PetOverlayModule : Module() {
  private var speechRecognizer: SpeechRecognizer? = null
  private var textToSpeech: TextToSpeech? = null
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

    AsyncFunction("listen").SuspendBody<String> {
      if (context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        val activity = appContext.currentActivity ?: throw IllegalStateException("An active Android activity is required")
        activity.requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), 4201)
        throw IllegalStateException("Microphone permission is required. Tap Talk again after granting it.")
      }
      if (!SpeechRecognizer.isRecognitionAvailable(context)) {
        throw IllegalStateException("Speech recognition is unavailable on this device")
      }
      val activity = appContext.currentActivity ?: throw IllegalStateException("An active Android activity is required")
      val result = suspendCancellableCoroutine<String> { continuation ->
        activity.runOnUiThread {
          speechRecognizer?.destroy()
          speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
          speechRecognizer?.setRecognitionListener(object : android.speech.RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) = Unit
            override fun onBeginningOfSpeech() = Unit
            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() = Unit
            override fun onError(error: Int) {
              if (continuation.isActive) continuation.resumeWith(Result.failure(IllegalStateException("Speech recognition error: $error")))
            }
            override fun onResults(results: Bundle?) {
              val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
              if (continuation.isActive) {
                if (text.isBlank()) continuation.resumeWith(Result.failure(IllegalStateException("No speech was recognized")))
                else continuation.resume(text) {}
              }
            }
            override fun onPartialResults(partialResults: Bundle?) = Unit
            override fun onEvent(eventType: Int, params: Bundle?) = Unit
          })
          val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
          }
          speechRecognizer?.startListening(intent)
        }
        continuation.invokeOnCancellation {
          activity.runOnUiThread {
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
            speechRecognizer = null
          }
        }
      }
      result
    }

    Function("speak") { text: String, language: String ->
      val locale = java.util.Locale.forLanguageTag(language)
      if (textToSpeech == null) {
        textToSpeech = TextToSpeech(context) { status ->
          if (status == TextToSpeech.SUCCESS) {
            textToSpeech?.language = locale
            textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pet-response")
          }
        }
      } else {
        textToSpeech?.language = locale
        textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pet-response")
      }
    }

    Function("stopSpeaking") {
      textToSpeech?.stop()
    }

    Function("performAction") { actionJson: String ->
      val action = try {
        org.json.JSONObject(actionJson).optString("type")
      } catch (_: Exception) {
        ""
      }
      PetOverlayService.start(context, PetOverlayService.ACTION_ACTION, action)
    }
  }
}
