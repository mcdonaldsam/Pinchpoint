$base = "c:\Users\samcd\Projects\Git-Repos\Icarus-TopCo\3.0 Build\3.6 Website\3.6.4 Website Build"

# Fix package.json: npm name should be lowercase
$f = "$base\package.json"
$c = Get-Content -Path $f -Raw
$c = $c -creplace 'CertaFide-website', 'certafide-website'
Set-Content -Path $f -Value $c -NoNewline
Write-Host "Fixed: $f"

# Fix tailwind.config.ts: CSS key should be lowercase
$f = "$base\tailwind.config.ts"
$c = Get-Content -Path $f -Raw
# Only replace the Tailwind color key (which is a CSS identifier)
$c = $c -creplace '        CertaFide:', '        certafide:'
Set-Content -Path $f -Value $c -NoNewline
Write-Host "Fixed: $f"

# Fix .env.example: URL paths for app stores should be lowercase
$f = "$base\.env.example"
$c = Get-Content -Path $f -Raw
$c = $c -creplace 'detail/CertaFide', 'detail/certafide'
$c = $c -creplace 'app/CertaFide', 'app/certafide'
Set-Content -Path $f -Value $c -NoNewline
Write-Host "Fixed: $f"
