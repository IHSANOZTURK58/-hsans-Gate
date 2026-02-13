
import urllib.request

url = "https://www.gutenberg.org/cache/epub/21/pg21.txt"
text = urllib.request.urlopen(url).read().decode('utf-8')

# Find first occurrence of "The Wolf and the Lamb"
idx = text.find("The Wolf and the Lamb")
print(f"First occurrence index: {idx}")
print(text[idx:idx+500])

# Find second occurrence (likely the actual story, not TOC)
idx2 = text.find("The Wolf and the Lamb", idx + 1)
print(f"\nSecond occurrence index: {idx2}")
print(text[idx2:idx2+500])

# Find third?
idx3 = text.find("The Wolf and the Lamb", idx2 + 1)
if idx3 != -1:
    print(f"\nThird occurrence index: {idx3}")
    print(text[idx3:idx3+500])
