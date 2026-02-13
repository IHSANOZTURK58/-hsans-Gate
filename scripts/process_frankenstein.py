import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/84/pg84.txt"
    output_js = "js/frankenstein_books.js"
    
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8-sig')
    except Exception as e:
        print(f"Error fetching book: {e}")
        return

    lines = text.splitlines()
    
    # Detect all chapters and Letters
    all_headers = []
    for i, line in enumerate(lines):
        clean_line = line.strip()
        # Non-indented headers
        if line.startswith(" "):
            continue
            
        if re.match(r'^Letter\s+[0-9IVXLCDM]+$', clean_line, re.I) and i > 100:
            all_headers.append((i, clean_line))
        elif re.match(r'^Chapter\s+[0-9IVXLCDM]+$', clean_line, re.I) and i > 100:
            all_headers.append((i, clean_line))

    # TOC filter: Letter 1 usually appears early but isn't always in TOC
    # Let's find the first real Letter 1
    real_headers = []
    for idx, header in all_headers:
        if idx < 50: continue # Skip very early lines
        real_headers.append((idx, header))
        
    print(f"Found {len(real_headers)} markers.")

    # Split into 3 volumes
    # Vol 1: Letters + Ch 1-8
    # Vol 2: Ch 9-16
    # Vol 3: Ch 17-24
    volume_ranges = [
        (0, 11), # Letters (4) + Ch 1-7 = index 0 to 11
        (11, 19), # Ch 8-15 = index 11 to 19 (wait, let's check counts)
    ]
    
    # Better split based on the analysis output:
    # 0-3: Letters 1-4
    # 4-11: Ch 1-8 (Total 12 headers)
    # 12-19: Ch 9-16 (Total 8 headers)
    # 20-27: Ch 17-24 (Total 8 headers)
    
    volume_indices = [
        (0, 12),
        (12, 20),
        (20, len(real_headers))
    ]
    
    volume_defs = [
        {"title": "Frankenstein - Vol 1", "desc": "Victor Frankenstein discovers the secret of life and creates a sentient being, only to be horrified by his creation.", "cover": "⚡"},
        {"title": "Frankenstein - Vol 2", "desc": "The creature, rejected by society, shares his story of survival and demands a companion from his creator.", "cover": "🧟"},
        {"title": "Frankenstein - Vol 3", "desc": "Victor's pursuit of the creature leads to a tragic game of cat and mouse across the frozen arctic.", "cover": "🏔️"}
    ]

    all_volumes = []
    
    for vol_idx, (start_idx, end_idx) in enumerate(volume_indices):
        pages = []
        for h_idx in range(start_idx, min(end_idx, len(real_headers))):
            line_start, raw_title = real_headers[h_idx]
            if h_idx + 1 < len(real_headers):
                line_end = real_headers[h_idx + 1][0]
            else:
                line_end = len(lines)
                for k in range(line_start, len(lines)):
                    if "*** END OF" in lines[k]:
                        line_end = k
                        break
            
            content = lines[line_start:line_end]
            chapter_title = raw_title.capitalize()
            
            # Title page
            current_page = [f"<h3>{chapter_title}</h3>"]
            
            for line in content[1:]:
                clean = line.strip()
                if not clean: continue
                if clean.startswith("[Illustration"): continue
                if clean.startswith("---"): continue
                
                current_page.append(f"<p>{clean}</p>")
                if len(current_page) >= 7:
                    pages.append("\n".join(current_page))
                    current_page = []
            
            if current_page:
                pages.append("\n".join(current_page))

        all_volumes.append({
            "title": volume_defs[vol_idx]["title"],
            "author": "Mary Shelley",
            "level": "B2",
            "cover": volume_defs[vol_idx]["cover"],
            "color": "#3d3d3d", # Gothic Grey
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
