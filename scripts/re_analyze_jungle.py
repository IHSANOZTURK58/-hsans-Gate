
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/236/pg236.txt"
try:
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE JUNGLE BOOK ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE JUNGLE BOOK ***"
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    content = text[start_idx + len(start_marker):end_idx].strip()

    # The Jungle Book structure:
    # Story Title
    #   (Poem)
    # Story Title
    #   (Poem)
    
    # Let's find the exact headers
    headers = [
        "Mowgli’s Brothers",
        "Kaa’s Hunting",
        "“Tiger! Tiger!”",
        "The White Seal",
        "“Rikki-Tikki-Tavi”",
        "Toomai of the Elephants",
        "Her Majesty’s Servants"
    ]
    
    # We want to catch the poems too
    # Actually we can just split by these titles
    pattern = "|".join([re.escape(h) for h in headers])
    parts = re.split(f"({pattern})", content)
    
    # parts[0] is preamble
    # parts[1] is header1, parts[2] is body1
    
    def estimate_pages(text):
        if not text: return 0
        para = text.split('\r\n\r\n')
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
    story_counts = []
    for i in range(1, len(parts), 2):
        h = parts[i]
        b = parts[i+1]
        pages = estimate_pages(h + "\n" + b)
        story_counts.append((h, pages))
        total_pages += pages

    print(f"Total Pages: {total_pages}")
    for h, p in story_counts:
        print(f"{h}: {p} pages")

except Exception as e:
    print(f"Error: {e}")
