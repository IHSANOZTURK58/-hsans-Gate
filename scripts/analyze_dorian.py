import urllib.request
import re

def analyze_dorian():
    url = "https://www.gutenberg.org/cache/epub/174/pg174.txt"
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    lines = text.splitlines()
    chapter_headers = []
    
    # Typical chapter headers for Dorian Gray
    for i, line in enumerate(lines):
        clean_line = line.strip()
        # Usually "CHAPTER 1", "CHAPTER I", or just "CHAPTER" followed by number/numeral
        if re.match(r'^CHAPTER\s+[0-9IVXLCDM]+$', clean_line, re.I) and i > 50:
            chapter_headers.append((i, clean_line))

    print(f"Found {len(chapter_headers)} chapter headers.")
    for idx, header in chapter_headers:
        if len(chapter_headers) < 30 or idx < 500: # Show some to confirm format
             print(f"Line {idx}: {header}")

    # Estimate pages (7 lines per page)
    if chapter_headers:
        for i in range(len(chapter_headers)):
            start = chapter_headers[i][0]
            end = chapter_headers[i+1][0] if i+1 < len(chapter_headers) else len(lines)
            count = end - start
            pages = (count + 6) // 7
            if i < 3 or i > len(chapter_headers) - 4:
                print(f"Chapter {i+1}: {chapter_headers[i][1]} -> ~{pages} pages")

if __name__ == "__main__":
    analyze_dorian()
