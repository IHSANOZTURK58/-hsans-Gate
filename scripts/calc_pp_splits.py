import urllib.request
import re

def calculate_splits():
    url = "https://www.gutenberg.org/cache/epub/1342/pg1342.txt"
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    lines = text.splitlines()
    
    chapters = []
    for i, line in enumerate(lines):
        if re.match(r'^Chapter\s+[IVXLCDM]+\.?$', line.strip()) and i > 600:
            chapters.append(i)
    
    chapters.append(len(lines)) # EOF marker
    
    splits = [
        (0, 15),   # Vol 1: Ch 1-15
        (15, 30),  # Vol 2: Ch 16-30
        (30, 45),  # Vol 3: Ch 31-45
        (45, 61)   # Vol 4: Ch 46-61
    ]
    
    for i, (s, e) in enumerate(splits):
        start_line = chapters[s]
        end_line = chapters[e]
        count = end_line - start_line
        pages = (count + 6) // 7
        print(f"Volume {i+1} (Ch {s+1}-{e}): ~{pages} pages")

if __name__ == "__main__":
    calculate_splits()
