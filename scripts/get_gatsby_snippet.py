import urllib.request

url = "https://www.gutenberg.org/cache/epub/64317/pg64317.txt"
with urllib.request.urlopen(url) as response:
    text = response.read().decode('utf-8')

with open("scripts/gatsby_snippet.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(text.splitlines()[:2000]))
