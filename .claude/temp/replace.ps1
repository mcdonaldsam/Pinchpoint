$base = "c:\Users\samcd\Projects\Git-Repos\Icarus-TopCo\3.0 Build\3.6 Website\3.6.4 Website Build"
$files = @(
    "$base\package.json",
    "$base\.env.example",
    "$base\tailwind.config.ts",
    "$base\lib\config.ts"
)

foreach ($f in $files) {
    Write-Host "Processing: $f"
    $c = Get-Content -Path $f -Raw
    $c = $c -replace 'support@icarus\.email', 'sam.mcdonald.dev@gmail.com'
    $c = $c -replace 'legal@icarus\.email', 'sam.mcdonald.dev@gmail.com'
    $c = $c -replace 'privacy@icarus\.email', 'sam.mcdonald.dev@gmail.com'
    $c = $c -replace 'icarus\.email', 'certafide.com'
    $c = $c -replace 'Icarus', 'CertaFide'
    $c = $c -replace 'icarus', 'certafide'
    Set-Content -Path $f -Value $c -NoNewline
    Write-Host "Done: $f"
}
