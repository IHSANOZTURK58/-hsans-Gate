import urllib.request
import re

def analyze_gatsby():
    url = "https://www.gutenberg.org/cache/epub/64317/pg64317.txt"
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    lines = text.splitlines()
    chapter_headers = []
    
    # Gatsby headers are Roman numerals (I, II, III...) on their own line
    # They start appearing after the TOC (line 50+)
    for i, line in enumerate(lines):
        clean_line = line.strip()
        # Look for isolated Roman numeral
        if re.match(r'^[IVXLC]+$', clean_line) and i > 50:
            # Check if it's not part of the TOC
            # TOC chapters are usually close together
            # Real chapters have space before/after and a significant amount of text
            chapter_headers.append((i, clean_line))

    # Filter TOC: if two headers are very close, skip the first ones
    real_chapters = []
    for i in range(len(chapter_headers)):
        idx, header = chapter_headers[i]
        # Ignore TOC (chapters 1-9 are listed early)
        if idx < 58: continue 
        real_chapters.append((idx, header))

    print(f"Found {len(real_chapters)} real chapter headers.")
    for idx, header in real_chapters:
        print(f"Line {idx}: {header}")

if __name__ == "__main__":
    analyze_gatsby()
