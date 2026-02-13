import urllib.request
import re

def analyze_dorian():
    url = "https://www.gutenberg.org/cache/epub/174/pg174.txt"
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8-sig')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    lines = text.splitlines()
    chapter_headers = []
    
    # Dorian Gray headers are "CHAPTER I.", "CHAPTER II." etc.
    # Also "THE PREFACE"
    for i, line in enumerate(lines):
        clean_line = line.strip()
        if clean_line == "THE PREFACE" and i > 50:
             chapter_headers.append((i, clean_line))
        if re.match(r'^CHAPTER\s+[IVXLCDM]+\.$', clean_line) and i > 50:
            chapter_headers.append((i, clean_line))

    # TOC is roughly lines 35-55. Headers in text start later.
    real_chapters = []
    for idx, header in chapter_headers:
        if idx < 60: continue # TOC
        real_chapters.append((idx, header))

    print(f"Found {len(real_chapters)} real chapter headers.")
    for idx, header in real_chapters:
        print(f"Line {idx}: {header}")

    # Estimate splitting
    # Total 21 markers (Preface + 20 chapters)
    # Vol 1: Preface + Ch 1-10
    # Vol 2: Ch 11-20

if __name__ == "__main__":
    analyze_dorian()
