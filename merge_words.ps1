$p1 = Get-Content "c:\Users\pc\.gemini\antigravity\playground\inner-pulsar\js\words_part1.js" -Raw
$p2 = Get-Content "c:\Users\pc\.gemini\antigravity\playground\inner-pulsar\js\words_part2.js" -Raw
$p3 = Get-Content "c:\Users\pc\.gemini\antigravity\playground\inner-pulsar\js\words_part3.js" -Raw

# Clean up potential trailings
$p1 = $p1.Trim()
if ($p1.EndsWith("];")) { $p1 = $p1.Substring(0, $p1.Length - 2) }
if ($p1.EndsWith("]")) { $p1 = $p1.Substring(0, $p1.Length - 1) }

$p2 = $p2.Trim()
$p3 = $p3.Trim()

# Construct proper array
# p1 contains "const WORD_DATA = [ ...objects"
# p2 contains "objects"
# p3 contains "objects ... ];"

$final = "$p1,$p2,$p3"

$final | Set-Content "c:\Users\pc\.gemini\antigravity\playground\inner-pulsar\js\words.js" -Encoding UTF8
