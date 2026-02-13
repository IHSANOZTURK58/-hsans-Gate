
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
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK AESOP'S FABLES ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK AESOP'S FABLES ***"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx != -1:
        text = text[start_idx + len(start_marker):]
    if end_idx != -1:
        text = text[:end_idx]
        
    text = re.sub(r'\r\n', '\n', text)
    return text

def parse_stories(text):
    # Split by double newlines to get paragraphs/chunks
    chunks = re.split(r'\n\s*\n', text)
    stories = []
    
    # Heuristic:
    # Title is usually short (< 10 words), mostly Title Case.
    # Body starts immediately after.
    # We skip the TOC by identifying that "Stories" must be substantial.
    
    i = 0
    while i < len(chunks):
        chunk = chunks[i].strip()
        if not chunk:
            i += 1
            continue
            
        # Potential Title
        # Check if it looks like a title (short, not a sentence)
        words = chunk.split()
        is_title = len(words) < 15 and not chunk.endswith('.') and not chunk.endswith('"')
        
        if is_title:
            # Look ahead for body
            if i + 1 < len(chunks):
                body = chunks[i+1].strip()
                # Check if body looks like a story
                # Heuristic: Starts with Uppercase word like "A LION" or just standard sentence case.
                # Aesop stories often start with: "A WOLF...", "THE FOX...", "SOME...", "AN..."
                
                # Also check length. Stories are longer than titles.
                if len(body) > 50:
                    # Found a story!
                    stories.append({
                        'title': chunk,
                        'body': body
                    })
                    i += 2
                    continue
        
        i += 1
        
    return stories

def create_formatted_pages(stories, lines_per_page=7):
    all_formatted_pages = []
    
    for story in stories:
        title = story['title']
        body = story['body']
        
        # Normalize body whitespace
        body = re.sub(r'\s+', ' ', body)
        
        # Split into sentences for strict line control
        # "Title always currently at top of start page" -> handled by new page logic.
        # "Max 7 lines per page" -> we treat sentences/clauses as lines.
        
        # Split by sentence endings
        sentences = re.split(r'(?<=[.!?]) +', body)
        
        # Further split long sentences if needed (simple char limit)
        final_lines = []
        for s in sentences:
            if len(s) > 80: # If sentence is long, split it comma or space
                 parts = []
                 while len(s) > 80:
                     split_idx = s.rfind(' ', 0, 80)
                     if split_idx == -1: split_idx = 80
                     parts.append(s[:split_idx])
                     s = s[split_idx:].strip()
                 parts.append(s)
                 final_lines.extend(parts)
            else:
                 final_lines.append(s)
        
        current_page_idx = 0
        lines_on_page = 0
        page_content = ""
        
        # Start first page with Title
        page_content += f"<h3>{title}</h3>\n"
        
        for line in final_lines:
            if not line.strip(): continue
            
            page_content += f"<p>{line}</p>\n"
            lines_on_page += 1
            
            if lines_on_page >= lines_per_page:
                all_formatted_pages.append(page_content)
                page_content = "" # New Page
                lines_on_page = 0
        
        # Flush remaining
        if page_content:
            all_formatted_pages.append(page_content)
            
    return all_formatted_pages

def main():
    url = "https://www.gutenberg.org/cache/epub/21/pg21.txt"
    print(f"Fetching {url}...")
    
    text = fetch_text(url)
    if not text: return
    
    clean = clean_text(text)
    
    # Locate actual start of fables (skip TOC)
    # The TOC ends before "The Lion And The Mouse" typically.
    # We can just parse everything and filter out the TOC which is "List of titles".
    # TOC titles won't have a "Body" > 50 chars that looks like a story.
    
    stories = parse_stories(clean)
    print(f"Found {len(stories)} stories.")
    
    # Filter: remove things that are likely intros (Preface etc) if they slipped in
    stories = [s for s in stories if "PREFACE" not in s['title'].upper() and "LIFE OF" not in s['title'].upper()]
    
    pages = create_formatted_pages(stories, lines_per_page=7)
    print(f"Total pages created: {len(pages)}")
    
    # Split by count or Volume
    # If too many pages, split into 3 or 4 volumes?
    # Aesop is huge. Let's see count.
    
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
        
        base_title = "Aesop's Fables"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        # Add Header to first page of volume
        if num_vols > 1:
            if "<h3>" in vol_pages[0]:
                 # Just prepend Volume info
                 vol_pages[0] = f"<h3>{display_title}</h3>\n" + vol_pages[0]
            else:
                 vol_pages.insert(0, f"<h3>{display_title}</h3>\n<p>Collection {i+1}</p>")
             
        volumes.append({
            "title": display_title,
            "author": "Aesop",
            "level": "A1",
            "cover": "🦊",
            "color": "#ff9f43" if i % 2 == 0 else "#e1b12c",
            "description": f"Classic fables. Volume {i+1}.",
            "pages": vol_pages
        })

    output_file = "js/aesop_books.js"
    with open(output_file, "w", encoding="utf-8") as f:
        for vol in volumes:
            f.write(f"window.BOOK_DATA['A1'].push({json.dumps(vol, indent=4, ensure_ascii=False)});\n\n")
            
    print(f"Generated {output_file}")

if __name__ == "__main__":
    main()
