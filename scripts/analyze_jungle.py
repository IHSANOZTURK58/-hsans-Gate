
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/236/pg236.txt"
try:
    print(f"Fetching {url}...")
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE JUNGLE BOOK ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE JUNGLE BOOK ***"
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    content = text[start_idx:end_idx] if start_idx != -1 and end_idx != -1 else text

    # Jungle Book has distinct stories/chapters, often with poems at the end.
    # Common markers: "MOWGLI'S BROTHERS", "KAA'S HUNTING", "RIKKI-TIKKI-TAVI", etc.
    # Also "Chapter" or just the titles in uppercase.
    
    def estimate_pages(chapter_text):
        para = chapter_text.split('\r\n\r\n')
        lines = []
        for p in para:
            p = p.replace('\r\n', ' ').strip()
            if not p: continue
            words = p.split()
            current_line = []
            for w in words:
                current_line.append(w)
                if len(current_line) >= 10:
                    lines.append(" ".join(current_line))
                    current_line = []
            if current_line: lines.append(" ".join(current_line))
        return (len(lines) + 6) // 7

    # Let's try to find stories
    # Stories are usually separated by titles like:
    # MOWGLI'S BROTHERS
    # Hunting-Song of the Seeonee Pack
    # KAA'S HUNTING
    # Road-Song of the Bandar-Log
    #...
    
    stories = re.split(r'\r\n\r\n([A-Z\-\'\s]+)\r\n\r\n', content)
    # This might be too generic. Let's look at the first 10000 chars to see pattern.
    print("Pattern check (first 5000 chars after marker):")
    print(content[:5000])

except Exception as e:
    print(f"Error: {e}")
