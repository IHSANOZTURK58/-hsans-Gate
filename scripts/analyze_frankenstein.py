import urllib.request
import re

def analyze_frankenstein():
    url = "https://www.gutenberg.org/cache/epub/84/pg84.txt"
    print(f"Fetching {url}...")
    try:
        # Gutenberg 84 often has BOM
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8-sig')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    lines = text.splitlines()
    headers = []
    
    # Typical headers: "Letter 1", "Chapter 1", etc.
    for i, line in enumerate(lines):
        clean_line = line.strip()
        # Letters
        if re.match(r'^Letter\s+[0-9IVXLCDM]+$', clean_line, re.I) and i > 100:
            headers.append((i, clean_line))
        # Chapters
        if re.match(r'^Chapter\s+[0-9IVXLCDM]+$', clean_line, re.I) and i > 100:
            headers.append((i, clean_line))

    print(f"Found {len(headers)} headers.")
    for idx, header in headers:
         print(f"Line {idx}: {header}")

if __name__ == "__main__":
    analyze_frankenstein()
