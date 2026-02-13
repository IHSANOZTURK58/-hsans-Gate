import urllib.request

url = "https://www.gutenberg.org/cache/epub/120/pg120.txt"
with urllib.request.urlopen(url) as response:
    text = response.read().decode('utf-8-sig')

with open("scripts/treasure_island_snippet.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(text.splitlines()[:1500]))
