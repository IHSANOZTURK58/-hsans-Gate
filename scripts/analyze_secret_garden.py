
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/17396/pg17396.txt"
try:
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE SECRET GARDEN ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE SECRET GARDEN ***"
    start_idx = text.find(start_marker)
    if start_idx == -1: start_idx = text.find("*** START OF THIS PROJECT GUTENBERG EBOOK")
    end_idx = text.find(end_marker)
    if end_idx == -1: end_idx = text.find("*** END OF THIS PROJECT GUTENBERG EBOOK")
    content = text[start_idx:end_idx] if start_idx != -1 and end_idx != -1 else text

    chapters = re.split(r'CHAPTER [IVXLC]+\r\n\r\n', content)
    # The first element is the intro/contents
    chapters = chapters[1:] 

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

    chapter_pages = [estimate_pages(c) for c in chapters]
    
    # Let's try to group them into 4 volumes
    ranges = [(0,7), (7,14), (14,21), (21,27)]
    for i, (s, e) in enumerate(ranges):
        total = sum(chapter_pages[s:e])
        print(f"Vol {i+1} (Ch {s+1}-{e}): {total} pages")

except Exception as e:
    print(f"Error: {e}")
