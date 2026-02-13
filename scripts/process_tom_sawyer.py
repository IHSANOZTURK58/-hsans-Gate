import urllib.request
import re
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

def fetch_text(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return None

def clean_text(text):
    # Common markers
    markers = [
        "*** START OF THE PROJECT GUTENBERG EBOOK",
        "*** START OF THIS PROJECT GUTENBERG EBOOK",
        "***START OF THE PROJECT GUTENBERG EBOOK",
    ]
    
    start_idx = -1
    for m in markers:
        idx = text.find(m)
        if idx != -1:
            line_end = text.find('\n', idx)
            start_idx = line_end if line_end != -1 else idx + len(m)
            break
            
    if start_idx != -1:
        text = text[start_idx:]

    end_markers = [
        "*** END OF THE PROJECT GUTENBERG EBOOK",
        "*** END OF THIS PROJECT GUTENBERG EBOOK",
        "***END OF THE PROJECT GUTENBERG EBOOK",
    ]
    
    for m in end_markers:
        idx = text.find(m)
        if idx != -1:
            text = text[:idx]
            break

    return text

def parse_chapters(text):
    # Tom Sawyer chapters usually start with "CHAPTER I", "CHAPTER II", etc.
    # We'll split by "CHAPTER" and Roman numeral regex
    chapter_pattern = r'\n\s*(CHAPTER [IVXLCDM]+\.?.*?)\n'
    parts = re.split(chapter_pattern, text)
    
    chapters = []
    # parts[0] is everything before first chapter
    if parts[0].strip():
        chapters.append({'title': 'Intro', 'body': parts[0].strip()})
        
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        body = parts[i+1].strip() if i+1 < len(parts) else ""
        chapters.append({'title': title, 'body': body})
            
    return chapters

def create_formatted_pages(chapters):
    pages = []
    MAX_LINES_PER_PAGE = 7
    
    for chapter in chapters:
        title = chapter['title']
        body = chapter['body']
        
        # Split body into lines and preserve paragraphs roughly
        # but honor the 7-line limit strictly
        paragraphs = body.split('\n\n')
        all_lines = []
        for p in paragraphs:
            # Flatten paragraphs into lines but keep them together if short? 
            # No, let's just break them into lines naturally.
            lines = p.replace('\n', ' ').strip().split('. ')
            # More simple: just split into roughly readable chunks.
            # Let's try to keep 7 actual lines of text.
            temp_lines = p.split('\n')
            for tl in temp_lines:
                if tl.strip():
                    all_lines.append(tl.strip())
        
        # Split into chunks of MAX_LINES_PER_PAGE
        for j in range(0, len(all_lines), MAX_LINES_PER_PAGE):
            chunk_lines = all_lines[j:j+MAX_LINES_PER_PAGE]
            
            page_title = title
            if j > 0:
                page_title += " (cont.)"
            
            html = f"<div style='text-align: center;'>\n<h3>{page_title}</h3>\n"
            for line in chunk_lines:
                if line:
                    html += f"<p>{line}</p>\n"
            html += "</div>"
            
            pages.append(html)
            
    return pages

def main():
    url = "https://www.gutenberg.org/cache/epub/74/pg74.txt"
    print(f"Fetching {url}...")
    
    text = fetch_text(url)
    if not text: return

    clean = clean_text(text)
    chapters = parse_chapters(clean)
    print(f"Found {len(chapters)} chapters.")
    
    pages = create_formatted_pages(chapters)
    print(f"Total pages before split: {len(pages)}")
    
    # Updated splitting logic based on user feedback
    total_pages = len(pages)
    if total_pages <= 150:
        vol_size = total_pages + 1 # Force single volume
    else:
        vol_size = 1000 # Larger chunks for long books
        
    volumes = []
    num_vols = (total_pages + vol_size - 1) // vol_size
    
    for i in range(num_vols):
        start = i * vol_size
        end = start + vol_size
        vol_pages = pages[start:end]
        if not vol_pages: continue
        
        base_title = "Tom Sawyer"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        volumes.append({
            "title": display_title,
            "author": "Mark Twain",
            "level": "B1",
            "cover": "⛵",
            "color": "#e67e22" if i % 2 == 0 else "#d35400", # Orange tones
            "description": "The classic adventures of a boy on the Mississippi.",
            "pages": vol_pages
        })
        
    output_file = "js/tom_sawyer_books.js"
    with open(output_file, "w", encoding="utf-8") as f:
        # Initialize the array if it doesn't exist (it should, but safety)
        f.write("if(!window.BOOK_DATA['B1']) window.BOOK_DATA['B1'] = [];\n\n")
        for vol in volumes:
            f.write(f"window.BOOK_DATA['B1'].push({json.dumps(vol, indent=4, ensure_ascii=False)});\n\n")
            
    print(f"Generated {output_file}")

if __name__ == "__main__":
    main()
