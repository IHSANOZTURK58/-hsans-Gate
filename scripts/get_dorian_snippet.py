import urllib.request

url = "https://www.gutenberg.org/cache/epub/174/pg174.txt"
with urllib.request.urlopen(url) as response:
    text = response.read().decode('utf-8-sig')

with open("scripts/dorian_snippet.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(text.splitlines()[:3000]))
