import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/174/pg174.txt"
    output_js = "js/dorian_gray_books.js"
    
    print(f"Fetching {url}...")
    try:
        # Use utf-8-sig to handle possible BOM
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8-sig')
    except Exception as e:
        print(f"Error fetching book: {e}")
        return

    lines = text.splitlines()
    
    # Detect all chapters and Preface
    # Headers: "THE PREFACE", "CHAPTER I.", etc.
    all_headers = []
    for i, line in enumerate(lines):
        clean_line = line.strip()
        # Ensure it's not indented (TOC is indented)
        if line.startswith(" "):
            continue
            
        if clean_line == "THE PREFACE" and i > 50:
            all_headers.append((i, "Preface"))
        elif re.match(r'^CHAPTER\s+[IVXLCDM]+\.$', clean_line) and i > 50:
            all_headers.append((i, clean_line))

    # Filter TOC
    chapters = []
    for idx, header in all_headers:
        if idx < 30: continue # TOC usually ends around line 33, Preface is 60
        chapters.append((idx, header))
    
    print(f"Found {len(chapters)} markers (Preface + Chapters).")
    if len(chapters) != 21: # Preface + 20 chapters
         print(f"Warning: Found {len(chapters)} markers. Expected 21.")

    # Split into 2 volumes
    # Vol 1: Preface + Ch 1-10 (Indices 0 to 10 in chapters list)
    # Vol 2: Ch 11-20 (Indices 11 to 20)
    volume_ranges = [
        (0, 11),
        (11, len(chapters))
    ]
    
    volume_defs = [
        {"title": "The Picture of Dorian Gray - Vol 1", "desc": "The artist Basil Hallward paints a portrait of the beautiful Dorian Gray, while Lord Henry Wotton introduces him to a world of hedonism.", "cover": "🖼️"},
        {"title": "The Picture of Dorian Gray - Vol 2", "desc": "As years pass, Dorian remains youthful while his portrait withers with the weight of his sins and secrets.", "cover": "🥀"}
    ]

    all_volumes = []
    
    for vol_idx, (start_idx, end_idx) in enumerate(volume_ranges):
        pages = []
        for c_idx in range(start_idx, min(end_idx, len(chapters))):
            line_start, raw_title = chapters[c_idx]
            if c_idx + 1 < len(chapters):
                line_end = chapters[c_idx + 1][0]
            else:
                # Find end of book
                line_end = len(lines)
                for k in range(line_start, len(lines)):
                    if "*** END OF" in lines[k]:
                        line_end = k
                        break
            
            content = lines[line_start:line_end]
            
            # Formatting title
            if raw_title == "Preface":
                chapter_title = "The Preface"
            else:
                # Convert "CHAPTER I." to "Chapter I"
                chapter_title = "Chapter " + raw_title.replace("CHAPTER ", "").replace(".", "").strip()
                
            # Title on its own page
            current_page = [f"<h3>{chapter_title}</h3>"]
            
            for line in content[1:]:
                clean = line.strip()
                if not clean: continue
                # Skip illustration markers
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
            "author": "Oscar Wilde",
            "level": "B2",
            "cover": volume_defs[vol_idx]["cover"],
            "color": "#005a32", # Emerald theme
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
