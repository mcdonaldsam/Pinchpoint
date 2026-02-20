# PowerShell script to download images from URLs
# Usage: .\download-images.ps1 urls.txt

param(
    [Parameter(Mandatory=$true)]
    [string]$UrlFile,

    [Parameter(Mandatory=$false)]
    [string]$OutputDir = ".\property-images"
)

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Created directory: $OutputDir" -ForegroundColor Green
}

# Read URLs from file
$urls = Get-Content $UrlFile

Write-Host "Found $($urls.Count) URLs to download" -ForegroundColor Cyan

$counter = 1
foreach ($url in $urls) {
    if ([string]::IsNullOrWhiteSpace($url)) { continue }

    try {
        # Extract filename from URL or use counter
        $filename = if ($url -match '([^/]+\.(jpg|jpeg|png|webp|gif))') {
            $matches[1]
        } else {
            "image-$counter.jpg"
        }

        $outputPath = Join-Path $OutputDir $filename

        Write-Host "[$counter/$($urls.Count)] Downloading: $filename" -ForegroundColor Yellow

        # Download with progress
        Invoke-WebRequest -Uri $url -OutFile $outputPath -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

        Write-Host "  ✓ Saved to: $outputPath" -ForegroundColor Green
        $counter++

        # Small delay to be polite
        Start-Sleep -Milliseconds 500

    } catch {
        Write-Host "  ✗ Failed: $_" -ForegroundColor Red
    }
}

Write-Host "`nDownload complete! Images saved to: $OutputDir" -ForegroundColor Green
Write-Host "Total images: $(Get-ChildItem $OutputDir | Measure-Object).Count" -ForegroundColor Cyan
