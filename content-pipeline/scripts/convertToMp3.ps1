$input = "content-pipeline\audio\tts"
$output = "public\audio"
New-Item -ItemType Directory -Force -Path $output | Out-Null
Get-ChildItem "$input\*.wav" | ForEach-Object {
  $out = "$output\" + $_.BaseName + ".mp3"
  & ffmpeg -i $_.FullName -codec:a libmp3lame -qscale:a 4 -ac 1 $out -y -loglevel error
  Write-Host "OK: $($_.BaseName).mp3"
}
Write-Host "Done"
