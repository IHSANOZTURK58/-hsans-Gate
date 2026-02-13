import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/1342/pg1342.txt"
    output_js = "js/pride_prejudice_books.js"
    
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching book: {e}")
        return

    lines = text.splitlines()
    
    # Detect all chapters
    chapters = []
    # Jane Austen chapters in this edition: "Chapter I", "Chapter II", etc. 
    # Sometimes with brackets like "Chapter I.]" or just "Chapter I."
    for i, line in enumerate(lines):
        clean_line = line.strip()
        # Look for "Chapter" followed by Roman numeral at the start of the line or with some symbols
        # re.I for case insensitivity is safer
        if re.search(r'^Chapter\s+[IVXLCDM]+', clean_line, re.I) and i > 600:
            # Avoid matching "Chapter" in the TOC or in illustrations lists
            # We already skipped first 600 lines which is the TOC/Preface
            chapters.append(i)
    
    print(f"Found {len(chapters)} chapters.")
    if len(chapters) < 61:
         print(f"Warning: Only found {len(chapters)} chapters. Expected 61.")

    # Split into 4 volumes
    # Vol 1: 1-15, Vol 2: 16-30, Vol 3: 31-45, Vol 4: 46-61
    volume_ranges = [
        (0, 15),
        (15, 30),
        (30, 45),
        (45, len(chapters))
    ]
    
    volume_defs = [
        {"title": "Pride and Prejudice - Vol 1", "desc": "The arrival of Mr. Bingley and Mr. Darcy at Netherfield sets the neighborhood—and the Bennet family—abuzz.", "cover": "🎩"},
        {"title": "Pride and Prejudice - Vol 2", "desc": "Misunderstandings deepen as Elizabeth learns more about Mr. Darcy and the charming Mr. Wickham.", "cover": "💌"},
        {"title": "Pride and Prejudice - Vol 3", "desc": "A visit to Pemberley and a shocking revelation change everything Elizabeth thought she knew.", "cover": "💍"},
        {"title": "Pride and Prejudice - Vol 4", "desc": "Family scandals and unexpected nobility lead to the ultimate resolution of pride and prejudice.", "cover": "🌹"}
    ]

    all_volumes = []
    
    for vol_idx, (start_ch, end_ch) in enumerate(volume_ranges):
        pages = []
        for ch_idx in range(start_ch, end_ch):
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
            chapter_title = content[0].strip()
            # Title on its own page
            current_page = [f"<h3>{chapter_title}</h3>"]
            
            for line in content[1:]:
                clean = line.strip()
                if not clean: continue
                # Skip illustration markers
                if clean.startswith("[Illustration"): continue
                
                current_page.append(f"<p>{clean}</p>")
                if len(current_page) >= 7:
                    pages.append("\n".join(current_page))
                    current_page = []
            
            if current_page:
                pages.append("\n".join(current_page))

        all_volumes.append({
            "title": volume_defs[vol_idx]["title"],
            "author": "Jane Austen",
            "level": "B2",
            "cover": volume_defs[vol_idx]["cover"],
            "color": "#d4af37", # Gold/Rose theme
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
