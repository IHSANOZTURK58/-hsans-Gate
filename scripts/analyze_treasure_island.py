import urllib.request
import re

def analyze_treasure_island():
    url = "https://www.gutenberg.org/cache/epub/120/pg120.txt"
    print(f"Fetching {url}...")
    try:
        # Gutenberg 120 can be utf-8
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8-sig')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    lines = text.splitlines()
    headers = []
    
    # Treasure Island headers:
    # "PART ONE--The Old Buccaneer"
    # "I" (Roman numeral on its own line)
    part_pattern = r'^PART\s+(ONE|TWO|THREE|FOUR|FIVE|SIX)--'
    chapter_pattern = r'^[IVXLCDM]+$'

    for i, line in enumerate(lines):
        clean_line = line.strip()
        if i < 120: continue # Skip TOC
        
        if re.match(part_pattern, clean_line, re.I):
            headers.append((i, "PART: " + clean_line))
        elif re.match(chapter_pattern, clean_line):
            # Check if next line has a title (to avoid random Roman numerals)
            if i + 1 < len(lines) and lines[i+1].strip():
                headers.append((i, "CHAPTER " + clean_line + ": " + lines[i+1].strip()))

    print(f"Found {len(headers)} headers (Parts + Chapters).")
    for idx, header in headers:
         print(f"Line {idx}: {header}")

if __name__ == "__main__":
    analyze_treasure_island()
