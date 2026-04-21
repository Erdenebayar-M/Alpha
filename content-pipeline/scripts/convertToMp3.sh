#!/bin/bash
INPUT="content-pipeline/audio/tts"
OUTPUT="public/audio"
mkdir -p "$OUTPUT"
for f in "$INPUT"/*.wav; do
  name=$(basename "$f" .wav)
  ffmpeg -i "$f" -codec:a libmp3lame -qscale:a 4 -ac 1 \
    "$OUTPUT/${name}.mp3" -y -loglevel error
  echo "✓ ${name}.mp3"
done
echo "Done: $(ls $OUTPUT/*.mp3 | wc -l) files in $OUTPUT"
