#!/usr/bin/env bash
# Makes all the voiceovers. Run from anywhere: ./shorts-studio/voice-maker/make.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
models="${KOKORO_DIR:-$HOME/.cache/kokoro}"
mkdir -p "$models"
pip install -q kokoro-onnx soundfile 2>/dev/null || pip install -q --break-system-packages kokoro-onnx soundfile
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "$models/$f" ] || curl -sSL -o "$models/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done
tmp="$(mktemp -d)"
node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8");fs.writeFileSync(process.argv[2],JSON.stringify(new Function(s+";return SCRIPTS;")()))' "$here/../scripts.js" "$tmp/scripts.json"
cd "$tmp" && KOKORO_DIR="$models" python3 -I "$here/make_voice.py" "$tmp/scripts.json" "$here/../voiceovers"
rm -rf "$tmp"
