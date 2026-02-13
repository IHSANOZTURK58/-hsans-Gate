
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/1874/pg1874.txt"
try:
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE RAILWAY CHILDREN ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE RAILWAY CHILDREN ***"
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    content = text[start_idx:end_idx] if start_idx != -1 and end_idx != -1 else text

    # Split by "Chapter X. Title"
    chapter_parts = re.split(r'Chapter ([IVXLC]+)\.', content)
    # chapter_parts[0] is preamble
    # chapter_parts[1] is 'I', parts[2] is text, etc.
    
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

    total_pages = 0
    results = []
    for i in range(1, len(chapter_parts), 2):
        num = chapter_parts[i]
        body = chapter_parts[i+1]
        pages = estimate_pages(body)
        results.append((num, pages))
        total_pages += pages

    print(f"Total Pages: {total_pages}")
    for num, pages in results:
        print(f"Chapter {num}: {pages} pages")

except Exception as e:
    print(f"Error: {e}")
