# Android Release Signing + Auto Versioning (Prompt 23)

Current repository status:
- GitHub Actions workflow is configured for signed `assembleRelease`.
- Native Android project scaffold is now present at `mobile/android`.

## Applied `mobile/android/app/build.gradle` changes

```gradle
android {
    defaultConfig {
        def ciRunNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInteger()
        versionCode ciRunNumber
        versionName "1.0.${ciRunNumber}"
    }

    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
}
```

## Required GitHub Secrets

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

## Keystore generation command (local)

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore release.keystore \
  -alias release-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Then convert keystore to Base64 and place it in `ANDROID_KEYSTORE_BASE64`.
