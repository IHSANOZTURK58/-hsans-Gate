$files = @(
    "words_part1.js",
    "words_part2.js",
    "words_part3.js",
    "words_part4.js",
    "words_part5.js",
    "words_part6.js",
    "words_part7.js",
    "words_part8.js",
    "words_part9.js"
)

$allContent = @()

foreach ($file in $files) {
    $path = Join-Path "c:\Users\pc\.gemini\antigravity\playground\inner-pulsar\js" $file
    if (Test-Path $path) {
        $content = Get-Content $path -Raw -Encoding UTF8
        
        # Remove assignment if exists
        if ($content -match "=") {
            $content = $content.Substring($content.IndexOf("=") + 1).Trim()
        }
        
        # Remove trailing semicolon
        if ($content.EndsWith(";")) {
            $content = $content.Substring(0, $content.Length - 1).Trim()
        }
        
        # Extract content between [ and ]
        $start = $content.IndexOf("[")
        $end = $content.LastIndexOf("]")
        
        if ($start -ne -1 -and $end -ne -1) {
            $inner = $content.Substring($start + 1, $end - $start - 1).Trim()
            if ($inner.EndsWith(",")) {
                $inner = $inner.Substring(0, $inner.Length - 1)
            }
            if ($inner -ne "") {
                $allContent += $inner
            }
        }
    }
}

$finalJs = "window.WORD_DATA = [`n" + ($allContent -join ",`n") + "`n];"
$finalJs | Set-Content "c:\Users\pc\.gemini\antigravity\playground\inner-pulsar\js\words.js" -Encoding UTF8
Write-Host "Merge Completed Successfully with $($files.Count) files."
$wordCount = (Select-String -Path "c:\Users\pc\.gemini\antigravity\playground\inner-pulsar\js\words.js" -Pattern "id:").Count
Write-Host "Total word count in words.js: $wordCount"
