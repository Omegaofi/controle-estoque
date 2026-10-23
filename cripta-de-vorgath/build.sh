#!/usr/bin/env bash
# Builds CriptaDeVorgath.apk without the Android SDK: every tool comes from PyPI / Maven Central.
# Needs: bash, curl, unzip, zip, python3, JDK 11+.
set -euo pipefail
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-}"
cd "$(dirname "$0")"
T=.tools; O=build
mkdir -p "$T" && rm -rf "$O" && mkdir -p "$O"/{res,gen,classes,dex}

fetch() { [ -s "$T/$1" ] || curl -fsSL -o "$T/$1" "$2"; }
fetch aapt2.whl   https://files.pythonhosted.org/packages/8d/18/9af0fde83ea6b2d05ed23ec2005d799df6d2e363e887279c5308fc3c7473/aapt2-0.2.1-py3-none-any.whl
fetch android.jar https://repo1.maven.org/maven2/com/google/android/android/4.1.1.4/android-4.1.1.4.jar
fetch dx.jar      https://repo1.maven.org/maven2/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar
fetch apksig.jar  https://repo1.maven.org/maven2/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar
[ -x "$T/aapt2" ] || { unzip -p "$T/aapt2.whl" aapt2/bin/Linux/aapt2 > "$T/aapt2"; chmod +x "$T/aapt2"; }

# 1. resources + manifest
"$T/aapt2" compile --dir app/res -o "$O/res.zip"
"$T/aapt2" link -o "$O/unsigned.apk" -I "$T/android.jar" \
  --manifest app/AndroidManifest.xml -A app/assets --java "$O/gen" \
  --min-sdk-version 24 --target-sdk-version 34 --auto-add-overlay "$O/res.zip"

# 2. java -> dex
javac -nowarn --release 8 -cp "$T/android.jar" -d "$O/classes" $(find app/java "$O/gen" -name '*.java')
java -cp "$T/dx.jar" com.android.dx.command.Main --dex --min-sdk-version=24 --output="$O/dex/classes.dex" "$O/classes"
(cd "$O/dex" && zip -q ../unsigned.apk classes.dex)
python3 tools/zipalign.py "$O/unsigned.apk" "$O/aligned.apk"

# 3. sign (v2)
[ -s keystore.p12 ] || keytool -genkeypair -keystore keystore.p12 -storetype PKCS12 -storepass vorgath \
  -alias vorgath -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Cripta de Vorgath" >/dev/null
javac -nowarn -cp "$T/apksig.jar" -d "$O" tools/Sign.java
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
  --add-exports java.base/sun.security.util=ALL-UNNAMED -cp "$T/apksig.jar:$O" Sign keystore.p12 vorgath vorgath "$O/aligned.apk" CriptaDeVorgath.apk
echo "OK -> $(pwd)/CriptaDeVorgath.apk ($(du -h CriptaDeVorgath.apk | cut -f1))"
