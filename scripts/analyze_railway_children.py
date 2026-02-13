
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/1874/pg1874.txt"
try:
    print(f"Fetching {url}...")
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE RAILWAY CHILDREN ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE RAILWAY CHILDREN ***"
    
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

    # Find chapters
    chapters = re.split(r'CHAPTER [IVXLC]+', content)
    # Filter out empty or very short parts (like intro)
    chapters = [c.strip() for c in chapters if len(c.strip()) > 100]
    
    print(f"Found {len(chapters)} chapters.")

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
            if current_line:
                lines.append(" ".join(current_line))
        return (len(lines) + 6) // 7

    total_pages = 0
    chapter_counts = []
    for idx, ch in enumerate(chapters):
        pages = estimate_pages(ch)
        chapter_counts.append(pages)
        total_pages += pages
        print(f"Chapter {idx+1}: {pages} pages")

    print(f"\nTotal estimated pages: {total_pages}")
    
    # Suggest 3-4 volumes
    if len(chapters) >= 12:
        # Example 4 vols: 3 chapters each
        print("\nProposed 4-volume split:")
        vols = [(0,4), (4,8), (8,11), (11,14)] # 14 chapters total?
        if len(chapters) == 14:
            for i, (s, e) in enumerate(vols):
                print(f"Vol {i+1} (Ch {s+1}-{e}): {sum(chapter_counts[s:e])} pages")

except Exception as e:
    print(f"Error: {e}")
