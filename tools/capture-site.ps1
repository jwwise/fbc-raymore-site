<#
.SYNOPSIS
    Captures a snapshot of the live faithbaptistraymore.org Joomla site.

.DESCRIPTION
    Crawls the live site starting at the homepage, following same-host links,
    and writes:
      archive/html/<path>.html   raw HTML for each page
      archive/images/...         every /images/ asset referenced by a page
      archive/manifest.json      crawl metadata (urls, status, titles, assets)

    This is an archival capture of the OLD site, kept for reference while the
    new static site is built. It is not served.

.EXAMPLE
    pwsh -File tools/capture-site.ps1
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'https://www.faithbaptistraymore.org',
    [string]$OutDir,
    [int]$MaxPages   = 200,
    [int]$DelayMs    = 400
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

if (-not $OutDir) { $OutDir = Join-Path (Split-Path $PSCommandPath -Parent) '..\archive' }
$OutDir   = [System.IO.Path]::GetFullPath($OutDir)
$htmlDir  = Join-Path $OutDir 'html'
$imgDir   = Join-Path $OutDir 'images'
New-Item -ItemType Directory -Force -Path $htmlDir, $imgDir | Out-Null

$baseHost = ([Uri]$BaseUrl).Host

# Joomla emits a lot of noise we do not want to archive: feeds, print views,
# the search form's own submissions, and component-only endpoints.
#
# The sermon library (/sermons/sermon|speaker|serie/...) is ~1,600 generated
# pages backed by audio files. It is excluded so the crawl budget goes to the
# hand-written pages; the audio lives on YouTube and is not being migrated.
$skipPattern = '(format=feed|format=pdf|tmpl=component|print=1|\?start=|\?q=|\?catid=|highlight=|/component/|/sermons/(sermon|speaker|serie|sermons)\b|\.(css|js|ico|png|jpe?g|gif|svg|webp|woff2?|ttf)$)'

function Convert-UrlToRelativePath {
    param([string]$Url)
    $u = [Uri]$Url
    $p = $u.AbsolutePath.Trim('/')
    if ([string]::IsNullOrWhiteSpace($p)) { return 'index' }
    return ($p -replace '[<>:"|?*]', '_')
}

$queue   = [System.Collections.Generic.Queue[string]]::new()
$seen    = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$images  = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$pages   = [System.Collections.Generic.List[object]]::new()

$queue.Enqueue("$BaseUrl/")
$seen.Add("$BaseUrl/") | Out-Null

# A session keeps the Joomla cookie, which avoids a redirect on some pages.
$session = $null

while ($queue.Count -gt 0 -and $pages.Count -lt $MaxPages) {
    $url = $queue.Dequeue()
    Write-Host "GET  $url"

    try {
        if ($null -eq $session) {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -SessionVariable session
        } else {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -WebSession $session
        }
    } catch {
        Write-Warning "  failed: $($_.Exception.Message)"
        $pages.Add([ordered]@{ url = $url; status = 'error'; error = $_.Exception.Message })
        continue
    }

    $html = $resp.Content
    $rel  = Convert-UrlToRelativePath $url
    $dest = Join-Path $htmlDir "$rel.html"
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    [System.IO.File]::WriteAllText($dest, $html, [System.Text.UTF8Encoding]::new($false))

    $title = if ($html -match '<title>(.*?)</title>') { $Matches[1].Trim() } else { '' }
    $pages.Add([ordered]@{
        url    = $url
        status = [int]$resp.StatusCode
        title  = $title
        file   = "html/$rel.html"
        bytes  = $html.Length
    })

    # --- collect images referenced by this page ---
    # The template mixes single- and double-quoted attributes (the logo uses single),
    # and srcset packs several URLs into one attribute, so match per-URL not per-attribute.
    $imgPatterns = @(
        '(?:src|srcset|href)\s*=\s*"([^"]*/images/[^"]+)"',
        "(?:src|srcset|href)\s*=\s*'([^']*/images/[^']+)'",
        'url\((?:''|")?([^''")]*/images/[^''")]+)'
    )
    foreach ($pattern in $imgPatterns) {
        foreach ($m in [regex]::Matches($html, $pattern)) {
            # A srcset value is "url 1x, url 2x"; split it and drop the descriptors.
            foreach ($candidate in ($m.Groups[1].Value -split ',')) {
                $u = ($candidate.Trim() -split '\s+')[0]
                if (-not $u) { continue }
                try { $abs = [Uri]::new([Uri]$url, $u) } catch { continue }
                if ($abs.Host -eq $baseHost) { $images.Add($abs.GetLeftPart([UriPartial]::Path)) | Out-Null }
            }
        }
    }

    # --- enqueue same-host page links ---
    foreach ($m in [regex]::Matches($html, '<a\b[^>]*href\s*=\s*["'']([^"''#][^"'']*)["'']')) {
        $href = $m.Groups[1].Value
        if ($href -match '^(mailto:|tel:|javascript:)') { continue }
        try { $abs = [Uri]::new([Uri]$url, $href) } catch { continue }
        if ($abs.Host -ne $baseHost) { continue }
        $normalized = ($abs.GetLeftPart([UriPartial]::Path)) + $abs.Query
        if ($normalized -match $skipPattern) { continue }
        if ($seen.Add($normalized)) { $queue.Enqueue($normalized) }
    }

    Start-Sleep -Milliseconds $DelayMs
}

Write-Host "`nDownloading $($images.Count) images..."
$imageResults = [System.Collections.Generic.List[object]]::new()
foreach ($img in $images) {
    $relImg = ([Uri]$img).AbsolutePath -replace '^/images/', '' -replace '[<>:"|?*]', '_'
    $dest   = Join-Path $imgDir $relImg
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    try {
        Invoke-WebRequest -Uri $img -UseBasicParsing -OutFile $dest
        $imageResults.Add([ordered]@{ url = $img; file = "images/$relImg"; bytes = (Get-Item $dest).Length })
    } catch {
        Write-Warning "  image failed: $img"
        $imageResults.Add([ordered]@{ url = $img; error = $_.Exception.Message })
    }
}

$manifest = [ordered]@{
    source      = $BaseUrl
    capturedUtc = (Get-Date).ToUniversalTime().ToString('o')
    generator   = 'tools/capture-site.ps1'
    pageCount   = $pages.Count
    imageCount  = $imageResults.Count
    pages       = $pages
    images      = $imageResults
}
$manifest | ConvertTo-Json -Depth 6 |
    Set-Content -Path (Join-Path $OutDir 'manifest.json') -Encoding utf8

Write-Host "`nDone. $($pages.Count) pages, $($imageResults.Count) images -> $OutDir"
