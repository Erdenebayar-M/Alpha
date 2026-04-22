$sourceDir = "content-pipeline\audio"
$destDir   = "public\audio"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
}

$wavFiles = Get-ChildItem "$sourceDir\*.wav"
if ($wavFiles.Count -eq 0) {
    Write-Host "No .wav files found in $sourceDir"
    exit 0
}

Write-Host "Converting $($wavFiles.Count) WAV files to MP3..."

$ok = 0
$fail = 0

foreach ($wav in $wavFiles) {
    $out = Join-Path $destDir ($wav.BaseName + ".mp3")
    & ffmpeg -i $wav.FullName -codec:a libmp3lame -qscale:a 4 -ac 1 $out -y -loglevel error
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: $($wav.BaseName).mp3"
        $ok++
    } else {
        Write-Host "FAIL: $($wav.Name)"
        $fail++
    }
}

Write-Host ""
Write-Host "Done: $ok converted, $fail failed"
