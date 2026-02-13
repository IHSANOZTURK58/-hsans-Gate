import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/64317/pg64317.txt"
    output_js = "js/gatsby_books.js"
    
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching book: {e}")
        return

    lines = text.splitlines()
    
    # Detect all chapters
    # Gatsby headers are Roman numerals (I, II, III...) on their own line
    all_headers = []
    for i, line in enumerate(lines):
        clean_line = line.strip()
        if re.match(r'^[IVXLC]+$', clean_line) and i > 50:
            all_headers.append((i, clean_line))

    # Filter TOC (TOC is usually lines 35-43)
    chapters = []
    for idx, header in all_headers:
        if idx < 58: continue 
        chapters.append(idx)
    
    print(f"Found {len(chapters)} chapters.")
    if len(chapters) != 9:
         print(f"Warning: Found {len(chapters)} chapters. Expected 9.")

    # Split into 2 volumes
    # Vol 1: Ch 1-5, Vol 2: Ch 6-9
    volume_ranges = [
        (0, 5),
        (5, 9)
    ]
    
    volume_defs = [
        {"title": "The Great Gatsby - Vol 1", "desc": "Nick Carraway is drawn into the mysterious world of his neighbor, Jay Gatsby, and the rekindling of a past romance.", "cover": "🍸"},
        {"title": "The Great Gatsby - Vol 2", "desc": "The illusions of the Jazz Age begin to crumble as Gatsby's dreams collide with a tragic reality.", "cover": "🏎️"}
    ]

    all_volumes = []
    
    for vol_idx, (start_ch, end_ch) in enumerate(volume_ranges):
        pages = []
        for ch_idx in range(start_ch, min(end_ch, len(chapters))):
            line_start = chapters[ch_idx]
            if ch_idx + 1 < len(chapters):
                line_end = chapters[ch_idx + 1]
            else:
                # Find end of book
                line_end = len(lines)
                for k in range(line_start, len(lines)):
                    if "*** END OF" in lines[k]:
                        line_end = k
                        break
            
            content = lines[line_start:line_end]
            chapter_title = "Chapter " + content[0].strip()
            # Title on its own page
            current_page = [f"<h3>{chapter_title}</h3>"]
            
            for line in content[1:]:
                clean = line.strip()
                if not clean: continue
                # Skip illustration markers if any
                if clean.startswith("[Illustration"): continue
                # Skip separator lines
                if clean.startswith("---"): continue
                
                current_page.append(f"<p>{clean}</p>")
                if len(current_page) >= 7:
                    pages.append("\n".join(current_page))
                    current_page = []
            
            if current_page:
                pages.append("\n".join(current_page))

        all_volumes.append({
            "title": volume_defs[vol_idx]["title"],
            "author": "F. Scott Fitzgerald",
            "level": "B2",
            "cover": volume_defs[vol_idx]["cover"],
            "color": "#c0c0c0", # Silver theme (Gatsby style)
            "description": volume_defs[vol_idx]["desc"],
            "pages": pages
        })

    os.makedirs("js", exist_ok=True)
    with open(output_js, "w", encoding="utf-8") as f:
        for vol in all_volumes:
            f.write("window.BOOK_DATA['B2'] = window.BOOK_DATA['B2'] || [];\n")
            f.write(f"window.BOOK_DATA['B2'].push({json.dumps(vol, ensure_ascii=False, indent=4)});\n\n")

    print(f"Generated {output_js}")
    for i, vol in enumerate(all_volumes):
        print(f"Vol {i+1}: {len(vol['pages'])} pages")

if __name__ == "__main__":
    process_book()
