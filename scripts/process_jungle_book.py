
import urllib.request
import json
import re
import os

def process_book():
    url = "https://www.gutenberg.org/cache/epub/236/pg236.txt"
    print(f"Fetching {url}...")
    
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    lines = text.split('\n')
    
    # Story start indices (skipping the TOC ones)
    # 52: Mowgli’s Brothers
    # 853: Kaa’s Hunting
    # 1835: “Tiger! Tiger!”
    # 2548: The White Seal
    # 3288: “Rikki-Tikki-Tavi”
    # 3941: Toomai of the Elephants
    # 4671: Her Majesty’s Servants
    
    story_defs = [
        {"title": "Mowgli’s Brothers", "start": 52},
        {"title": "Kaa’s Hunting", "start": 853},
        {"title": "“Tiger! Tiger!”", "start": 1835},
        {"title": "The White Seal", "start": 2548},
        {"title": "“Rikki-Tikki-Tavi”", "start": 3288},
        {"title": "Toomai of the Elephants", "start": 3941},
        {"title": "Her Majesty’s Servants", "start": 4671}
    ]
    
    stories = []
    for i in range(len(story_defs)):
        start = story_defs[i]["start"]
        end = story_defs[i+1]["start"] if i + 1 < len(story_defs) else len(lines)
        
        title = story_defs[i]["title"]
        # Join lines and clean up
        body = "\n".join(lines[start+1:end]).strip()
        stories.append((title, body))

    print(f"Captured {len(stories)} stories.")

    def paginate_text(title, text):
        # Format paragraph to pages (max 7 lines)
        # Handle poems and dialogue markers
        paragraphs = text.split('\n\n')
        all_lines = []
        
        for p in paragraphs:
            p = p.replace('\n', ' ').strip()
            if not p: continue
            
            words = p.split()
            current_line = []
            for w in words:
                current_line.append(w)
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
                line_wrapped = f"<h3>{title}</h3>\n" + line_wrapped
            
            current_page.append(line_wrapped)
            if len(current_page) >= 7:
                pages.append("\n".join(current_page))
                current_page = []
        
        if current_page:
            pages.append("\n".join(current_page))
            
        return pages

    # Define volumes
    volume_defs = [
        {"title": "The Jungle Book - Vol 1", "stories": [0, 1], "cover": "🐺", "color": "#27ae60", "desc": "The story of Mowgli's upbringing among the wolves and his training by Baloo and Bagheera."},
        {"title": "The Jungle Book - Vol 2", "stories": [2, 3], "cover": "🐯", "color": "#d35400", "desc": "Mowgli's final confrontation with Shere Khan and the adventures of the White Seal."},
        {"title": "The Jungle Book - Vol 3", "stories": [4, 5, 6], "cover": "🐍", "color": "#2c3e50", "desc": "The brave mongoose Rikki-Tikki-Tavi, Little Toomai, and the diverse animals of the jungle."}
    ]

    output_js = os.path.join("js", "jungle_book_books.js")
    with open(output_js, "w", encoding="utf-8") as f:
        for vol_info in volume_defs:
            all_pages = []
            for story_idx in vol_info["stories"]:
                if story_idx < len(stories):
                    title, text = stories[story_idx]
                    all_pages.extend(paginate_text(title, text))
            
            book_obj = {
                "title": vol_info["title"],
                "author": "Rudyard Kipling",
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
