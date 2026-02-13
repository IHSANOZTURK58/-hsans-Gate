
import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/17396/pg17396.txt"
    print(f"Fetching {url}...")
    
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    # Extract content
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

    # Split into chapters
    chapter_parts = re.split(r'(CHAPTER [IVXLC]+)', content)
    
    chapters = []
    # Index 0 is intro text before Chapter I
    # chapter_parts will be ['', 'CHAPTER I', 'content...', 'CHAPTER II', ...]
    for i in range(1, len(chapter_parts), 2):
        header = chapter_parts[i].strip()
        body = chapter_parts[i+1].strip()
        chapters.append((header, body))

    print(f"Found {len(chapters)} chapters.")

    def paginate_chapter(title, text):
        # Format paragraph to pages (max 7 lines)
        paragraphs = text.split('\r\n\r\n')
        all_lines = []
        
        # Add Chapter Title on its own page at start
        # Actually better to put it at the top of the first page of the chapter
        
        for p_idx, p in enumerate(paragraphs):
            p = p.replace('\r\n', ' ').strip()
            if not p: continue
            
            words = p.split()
            current_line = []
            for w in words:
                current_line.append(w)
                # ~10 words per line
                if len(current_line) >= 10:
                    all_lines.append(" ".join(current_line))
                    current_line = []
            if current_line:
                all_lines.append(" ".join(current_line))
        
        pages = []
        current_page = []
        
        # Add Chapter Title to the very first line of the chapter
        if all_lines:
            header_html = f"<h3>{title}</h3>"
            # If the first line is short, we could combine, but let's keep it clean
            # We'll prepend the header to the first paragraph's first page
            pass

        for i, line in enumerate(all_lines):
            line_wrapped = f"<p>{line}</p>"
            if i == 0:
                line_wrapped = f"<h3>{title}</h3>\n" + line_wrapped
            
            current_page.append(line_wrapped)
            if len(current_page) >= 7:
                pages.append("\n".join(current_page))
                current_page = []
        
        if current_page:
            pages.append("\n".join(current_page))
            
        return pages

    # Define volumes (Indices are 0-based)
    # Vol 1: Ch 1-7 (0-6)
    # Vol 2: Ch 8-14 (7-13)
    # Vol 3: Ch 15-21 (14-20)
    # Vol 4: Ch 22-27 (21-26)
    volume_defs = [
        {"title": "The Secret Garden - Vol 1", "chapters": range(0, 7), "cover": "🌿", "color": "#27ae60", "desc": "Mary Lennox is sent to Misselthwaite Manor and discovers a mysterious house."},
        {"title": "The Secret Garden - Vol 2", "chapters": range(7, 14), "cover": "🗝️", "color": "#d35400", "desc": "The discovery of the hidden key and the entrance to the garden."},
        {"title": "The Secret Garden - Vol 3", "chapters": range(14, 21), "cover": "🐦", "color": "#2980b9", "desc": "Spring returns to the garden as Mary meets Colin."},
        {"title": "The Secret Garden - Vol 4", "chapters": range(21, 27), "cover": "🌸", "color": "#9b59b6", "desc": "The magic of the garden transforms the lives of those within it."}
    ]

    output_js = os.path.join("js", "secret_garden_books.js")
    with open(output_js, "w", encoding="utf-8") as f:
        # We use an append-only style as per recent refactors
        for vol_info in volume_defs:
            all_pages = []
            for ch_idx in vol_info["chapters"]:
                if ch_idx < len(chapters):
                    title, text = chapters[ch_idx]
                    all_pages.extend(paginate_chapter(title, text))
            
            book_obj = {
                "title": vol_info["title"],
                "author": "Frances Hodgson Burnett",
                "level": "B1",
                "cover": vol_info["cover"],
                "color": vol_info["color"],
                "description": vol_info["desc"],
                "pages": all_pages
            }
            
            f.write(f"window.BOOK_DATA['B1'].push({json.dumps(book_obj, indent=4, ensure_ascii=False)});\n\n")

    print(f"Successfully generated {output_js}")

if __name__ == "__main__":
    process_book()
