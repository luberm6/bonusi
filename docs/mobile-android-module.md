# Mobile Android Module

Native Android module is now present at:

- `mobile/android`

Key files:

- `mobile/android/gradlew`
- `mobile/android/app/build.gradle`
- `mobile/package.json`
- `mobile/package-lock.json`

Local commands:

```bash
cd mobile
npm ci
npm run apk:debug
npm run apk:release
```

CI uses:

- `.github/workflows/android-build.yml`
- `assembleRelease`
- signed keystore from GitHub Secrets
- artifact path: `mobile/android/app/build/outputs/apk/release/app-release.apk`

