
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/17396/pg17396.txt"
try:
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE SECRET GARDEN ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE SECRET GARDEN ***"
    
    start_idx = text.find(start_marker)
    if start_idx == -1:
        start_idx = text.find("*** START OF THIS PROJECT GUTENBERG EBOOK")
    
    end_idx = text.find(end_marker)
    if end_idx == -1:
        end_idx = text.find("*** END OF THIS PROJECT GUTENBERG EBOOK")

    if start_idx != -1 and end_idx != -1:
        content = text[start_idx + len(start_marker):end_idx].strip()
    else:
        content = text.strip()

    # Simple page estimation logic (similar to our processing)
    para = content.split('\r\n\r\n')
    lines = []
    for p in para:
        p = p.replace('\r\n', ' ').strip()
        if not p: continue
        
        # Split into sentences or roughly 10-12 words per line
        words = p.split()
        current_line = []
        for w in words:
            current_line.append(w)
            if len(current_line) >= 10:
                lines.append(" ".join(current_line))
                current_line = []
        if current_line:
            lines.append(" ".join(current_line))

    total_lines = len(lines)
    pages = (total_lines + 6) // 7
    print(f"Total Lines: {total_lines}")
    print(f"Total Pages (7 lines/page): {pages}")

except Exception as e:
    print(f"Error: {e}")
