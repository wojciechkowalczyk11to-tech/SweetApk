# Android CI build troubleshooting

## Problem summary
GitHub Actions failed during Android release compilation because Compose Compiler `1.5.15` requires Kotlin `1.9.25`, while prebuild-generated native config used Kotlin `1.9.24`.

## Fix summary
`expo-build-properties` is now configured in `app.json` to enforce Android `kotlinVersion: 1.9.25` during `expo prebuild`, so generated Gradle files match Compose Compiler requirements.

## Local verification
```bash
npm ci
npx tsc --noEmit
npx expo prebuild --platform android --clean
cd android
./gradlew :expo-modules-core:compileReleaseKotlin --no-daemon --stacktrace
./gradlew assembleRelease --no-daemon --stacktrace
```
