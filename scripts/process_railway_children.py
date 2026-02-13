
import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/1874/pg1874.txt"
    print(f"Fetching {url}...")
    
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    # Extract content
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

    # Split into chapters based on "Chapter X. Title"
    chapter_parts = re.split(r'(Chapter [IVXLC]+\.)', content)
    
    chapters = []
    # chapter_parts[0] is preamble
    # parts[1] is 'Chapter I.', parts[2] is text, etc.
    for i in range(1, len(chapter_parts), 2):
        header = chapter_parts[i].strip()
        body = chapter_parts[i+1].strip()
        # Clean up the body a bit - sometimes titles are duplication
        # The body might start with the title text
        chapters.append((header, body))

    print(f"Found {len(chapters)} chapters.")

    def paginate_chapter(header, text):
        # Format paragraph to pages (max 7 lines)
        paragraphs = text.split('\r\n\r\n')
        all_lines = []
        
        for p in paragraphs:
            # Clean up double returns and whitespace
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
        
        for i, line in enumerate(all_lines):
            line_wrapped = f"<p>{line}</p>"
            if i == 0:
                line_wrapped = f"<h3>{header}</h3>\n" + line_wrapped
            
            current_page.append(line_wrapped)
            if len(current_page) >= 7:
                pages.append("\n".join(current_page))
                current_page = []
        
        if current_page:
            pages.append("\n".join(current_page))
            
        return pages

    # Define volumes
    volume_defs = [
        {"title": "The Railway Children - Vol 1", "chapters": range(0, 4), "cover": "🚂", "color": "#2c3e50", "desc": "The beginning of a new life as the family moves to the countryside near the railway."},
        {"title": "The Railway Children - Vol 2", "chapters": range(4, 7), "cover": "🏡", "color": "#27ae60", "desc": "Life at Three Chimneys and adventures involving the railway and new friends."},
        {"title": "The Railway Children - Vol 3", "chapters": range(7, 11), "cover": "🛤️", "color": "#d35400", "desc": "Secrets and heroic acts as the children become part of the railway community."},
        {"title": "The Railway Children - Vol 4", "chapters": range(11, 14), "cover": "👨‍👩‍👧‍👦", "color": "#8e44ad", "desc": "Hope and reunions as the truth about their father is revealed."}
    ]

    output_js = os.path.join("js", "railway_children_books.js")
    with open(output_js, "w", encoding="utf-8") as f:
        for vol_info in volume_defs:
            all_pages = []
            for ch_idx in vol_info["chapters"]:
                if ch_idx < len(chapters):
                    header, text = chapters[ch_idx]
                    all_pages.extend(paginate_chapter(header, text))
            
            book_obj = {
                "title": vol_info["title"],
                "author": "E. Nesbit",
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
