$base = 'c:\Users\samcd\Projects\Git-Repos\Icarus-TopCo\3.0 Build\3.6 Website\3.6.4 Website Build'

$files = @(
    'app\page.tsx',
    'app\layout.tsx',
    'app\loading.tsx',
    'app\globals.css',
    'app\about\page.tsx',
    'app\features\page.tsx',
    'app\download\page.tsx',
    'app\how-it-works\page.tsx',
    'app\setup\page.tsx',
    'app\terms\page.tsx',
    'app\privacy\page.tsx',
    'app\docs\page.tsx',
    'app\docs\faq\page.tsx',
    'app\docs\getting-started\page.tsx'
)

foreach ($f in $files) {
    $p = Join-Path $base $f
    if (Test-Path $p) {
        $content = Get-Content -Path $p -Raw
        $content = $content -replace 'support@icarus\.email', 'sam.mcdonald.dev@gmail.com'
        $content = $content -replace 'legal@icarus\.email', 'sam.mcdonald.dev@gmail.com'
        $content = $content -replace 'privacy@icarus\.email', 'sam.mcdonald.dev@gmail.com'
        $content = $content -replace 'icarus\.email', 'certafide.com'
        $content = $content -replace 'Icarus', 'CertaFide'
        $content = $content -replace 'icarus', 'certafide'
        Set-Content -Path $p -Value $content -NoNewline
        Write-Output "Done: $f"
    } else {
        Write-Output "NOT FOUND: $f"
    }
}
