import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/120/pg120.txt"
    output_js = "js/treasure_island_books.js"
    
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8-sig')
    except Exception as e:
        print(f"Error fetching book: {e}")
        return

    lines = text.splitlines()
    
    # Headers in Treasure Island:
    # "PART ONE--The Old Buccaneer"
    # "I" (Roman numeral for chapter)
    # "The Old Sea-dog at the Admiral Benbow" (Chapter title)
    
    all_markers = []
    part_pattern = r'^PART\s+(ONE|TWO|THREE|FOUR|FIVE|SIX)--'
    chapter_num_pattern = r'^[IVXLCDM]+$'
    
    for i, line in enumerate(lines):
        clean_line = line.strip()
        if i < 130: continue # Skip Project Gutenberg header and TOC
        
        if re.match(part_pattern, clean_line, re.I):
            all_markers.append((i, "PART", clean_line))
        elif re.match(chapter_num_pattern, clean_line):
            # Check if next line is a title or if it's within Part 1 start
            if i + 1 < len(lines) and lines[i+1].strip():
                # Potential chapter. Exclude obvious noise.
                title = lines[i+1].strip()
                if len(title) < 100:
                    all_markers.append((i, "CHAPTER", f"Chapter {clean_line}: {title}"))

    print(f"Found {len(all_markers)} markers (Parts + Chapters).")

    # Split into 3 volumes:
    # Vol 1: Parts 1 & 2
    # Vol 2: Parts 3 & 4
    # Vol 3: Parts 5 & 6
    
    # Identify indices of Parts
    part_indices = [i for i, m in enumerate(all_markers) if m[1] == "PART"]
    
    volume_indices = [
        (0, part_indices[2] if len(part_indices) > 2 else len(all_markers)),
        (part_indices[2], part_indices[4] if len(part_indices) > 4 else len(all_markers)),
        (part_indices[4], len(all_markers))
    ]
    
    volume_defs = [
        {"title": "Treasure Island - Vol 1", "desc": "Young Jim Hawkins discovers a treasure map and joins an expedition to find the legendary loot of Captain Flint.", "cover": "🏴‍☠️"},
        {"title": "Treasure Island - Vol 2", "desc": "Tensions rise aboard the Hispaniola as Jim discovers a mutiny plot led by the charismatic Long John Silver.", "cover": "🦜"},
        {"title": "Treasure Island - Vol 3", "desc": "In a climactic struggle on the island, Jim and his allies must outsmart the pirates to secure the treasure.", "cover": "💰"}
    ]

    all_volumes = []
    
    for vol_idx, (start_m_idx, end_m_idx) in enumerate(volume_indices):
        pages = []
        for m_idx in range(start_m_idx, min(end_m_idx, len(all_markers))):
            line_start, m_type, raw_title = all_markers[m_idx]
            
            # Find where this segment ends
            if m_idx + 1 < len(all_markers):
                line_end = all_markers[m_idx + 1][0]
            else:
                # End of book
                line_end = len(lines)
                for k in range(line_start, len(lines)):
                    if "*** END OF" in lines[k]:
                        line_end = k
                        break
            
            content = lines[line_start:line_end]
            
            # Formatting title
            if m_type == "PART":
                display_title = raw_title.replace("--", ": ")
            else:
                display_title = raw_title
                
            current_page = [f"<h3>{display_title}</h3>"]
            
            # Start from line 1 if PART (marker is part title), 
            # Start from line 2 if CHAPTER (marker is num, line+1 is title)
            offset = 1 if m_type == "PART" else 2
            
            for line in content[offset:]:
                clean = line.strip()
                if not clean: continue
                if clean.startswith("[Illustration"): continue
                
                current_page.append(f"<p>{clean}</p>")
                if len(current_page) >= 7:
                    pages.append("\n".join(current_page))
                    current_page = []
            
            if current_page:
                pages.append("\n".join(current_page))

        all_volumes.append({
            "title": volume_defs[vol_idx]["title"],
            "author": "Robert Louis Stevenson",
            "level": "B2",
            "cover": volume_defs[vol_idx]["cover"],
            "color": "#d4af37", # Pirate Gold
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
