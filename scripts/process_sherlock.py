import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/1661/pg1661.txt"
    output_js = "js/sherlock_books.js"
    
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching book: {e}")
        return

    lines = text.splitlines()
    
    # Precise story markers for splitting
    story_markers = [
        {"title": "A Scandal in Bohemia", "line": 50},
        {"title": "The Red-Headed League", "line": 1130},
        {"title": "A Case of Identity", "line": 2166},
        {"title": "The Boscombe Valley Mystery", "line": 2917},
        {"title": "The Five Orange Pips", "line": 3971},
        {"title": "The Man with the Twisted Lip", "line": 4808},
        {"title": "The Adventure of the Blue Carbuncle", "line": 5850},
        {"title": "The Adventure of the Speckled Band", "line": 6778},
        {"title": "The Adventure of the Engineer’s Thumb", "line": 7917},
        {"title": "The Adventure of the Noble Bachelor", "line": 8826},
        {"title": "The Adventure of the Beryl Coronet", "line": 9803},
        {"title": "The Adventure of the Copper Beeches", "line": 10869}
    ]
    
    volume_defs = [
        {
            "title": "Adventures of Sherlock Holmes - Vol 1",
            "description": "Four classic cases: A Scandal in Bohemia, The Red-Headed League, A Case of Identity, and The Boscombe Valley Mystery.",
            "cover": "🔍",
            "color": "#4b0082", # Indigo
            "stories": story_markers[0:4]
        },
        {
            "title": "Adventures of Sherlock Holmes - Vol 2",
            "description": "Investigate the Five Orange Pips, the Twisted Lip, the Blue Carbuncle, and the terrifying Speckled Band.",
            "cover": "🧪",
            "color": "#191970", # MidnightBlue
            "stories": story_markers[4:8]
        },
        {
            "title": "Adventures of Sherlock Holmes - Vol 3",
            "description": "The Engineer’s Thumb, the Noble Bachelor, the Beryl Coronet, and the mysterious Copper Beeches.",
            "cover": "🏠",
            "color": "#2c3e50", # Slate
            "stories": story_markers[8:12]
        }
    ]

    all_volumes = []

    for vol_idx, v_def in enumerate(volume_defs):
        pages = []
        for i, story in enumerate(v_def["stories"]):
            start_line = story["line"]
            # End line is the start of next story in the global list
            global_idx = vol_idx * 4 + i
            if global_idx + 1 < len(story_markers):
                end_line = story_markers[global_idx + 1]["line"]
            else:
                # Last story goes until the end marker or EOF
                end_line = len(lines)
                for j in range(start_line, len(lines)):
                    if "*** END OF THE PROJECT GUTENBERG EBOOK" in lines[j]:
                        end_line = j
                        break
            
            story_content = lines[start_line:end_line]
            
            # First page of story starts with the title
            current_page = [f"<h3>{story['title']}</h3>"]
            
            for line in story_content:
                clean_line = line.strip()
                if not clean_line:
                    continue
                
                # Roman numeral markers within stories (parts)
                # If we see "I.", "II." etc on a line by itself, we might want to preserve it
                # But let's keep it simple for now.
                
                current_page.append(f"<p>{clean_line}</p>")
                
                if len(current_page) >= 7:
                    pages.append("\n".join(current_page))
                    current_page = []
            
            if current_page:
                pages.append("\n".join(current_page))
        
        all_volumes.append({
            "title": v_def["title"],
            "author": "Arthur Conan Doyle",
            "level": "B2",
            "cover": v_def["cover"],
            "color": v_def["color"],
            "description": v_def["description"],
            "pages": pages
        })

    # Ensure JS directory exists
    os.makedirs(os.path.dirname(output_js), exist_ok=True)
    
    with open(output_js, "w", encoding="utf-8") as f:
        for vol in all_volumes:
            f.write("window.BOOK_DATA['B2'] = window.BOOK_DATA['B2'] || [];\n")
            f.write(f"window.BOOK_DATA['B2'].push({json.dumps(vol, ensure_ascii=False, indent=4)});\n\n")
            
    print(f"Generated {output_js} with {len(all_volumes)} volumes.")
    for i, vol in enumerate(all_volumes):
        print(f"Vol {i+1}: {len(vol['pages'])} pages")

if __name__ == "__main__":
    process_book()
