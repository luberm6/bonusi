package com.rnbootstrap

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Dismiss the SplashTheme and switch to AppTheme before React Native renders.
   * The splash is shown automatically via android:theme="@style/SplashTheme" in AndroidManifest.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    android.util.Log.d("AutoService", "MainActivity.onCreate called - Shell Starting")
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript.
   * Must match AppRegistry.registerComponent() call in index.js / app.json "name".
   */
  override fun getMainComponentName(): String = "AutoService"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
