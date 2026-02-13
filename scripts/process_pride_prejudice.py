import urllib.request
import re
import json

def fetch_text(url):
    try:
        with urllib.request.urlopen(url) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return None

def clean_text(text):
    # Remove Project Gutenberg header/footer
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK PRIDE AND PREJUDICE ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK PRIDE AND PREJUDICE ***"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx + len(start_marker):end_idx]
    
    # Normalize whitespace
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n+', '\n', text)
    
    # Remove chapter headings (optional, but good for flow)
    # text = re.sub(r'Chapter \d+', '', text, flags=re.IGNORECASE)
    
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return paragraphs

def create_pages(paragraphs, lines_per_page=7):
    pages = []
    current_page = []
    
    for p in paragraphs:
        # Split long paragraphs into smaller chunks if needed? 
        # For now, let's treat each paragraph as a potential line or two.
        # Check paragraph length. If > 100 chars, maybe split?
        # Actually, simpler: just accumulate paragraphs until we hit 7 lines.
        
        # A really long paragraph might span multiple "lines" visually.
        # Let's just treat strictly as paragraphs = lines for now, or split by sentences.
        # Splitting by sentences is safer for "7 lines".
        
        sentences = re.split(r'(?<=[.!?]) +', p)
        for sentence in sentences:
            if not sentence.strip(): continue
            current_page.append(sentence)
            if len(current_page) >= lines_per_page:
                pages.append(current_page)
                current_page = []
                
    if current_page:
        pages.append(current_page)
        
    return pages

def format_pages_html(pages_data, start_page_num):
    formatted_pages = []
    
    # Simple chapter detection regex
    chapter_pattern = re.compile(r'^(CHAPTER|Chapter)\s+([IVXLCDM\d]+)', re.IGNORECASE)
    
    for i, page_lines in enumerate(pages_data):
        page_content = ""
        
        # Check first line for chapter heading
        if page_lines:
            match = chapter_pattern.match(page_lines[0])
            if match:
                page_content += f"<h3>{page_lines[0]}</h3>\n"
                # If we used the first line as header, should we still add it as p? 
                # Usually yes, or maybe not. Let's add it as a paragraph too for safety, 
                # or skip it if it's just the header.
                # Let's skip adding it as a <p> if we made it an <h3>
                lines_to_add = page_lines[1:]
            else:
                lines_to_add = page_lines
        else:
            lines_to_add = []

        for line in lines_to_add:
            # Check for inner chapter headings if they appear in middle of page (unlikely with our logic but possible)
            if chapter_pattern.match(line):
                 page_content += f"<h3>{line}</h3>\n"
            else:
                 page_content += f"<p>{line}</p>\n"
                 
        formatted_pages.append(page_content)
    return formatted_pages

def main():
    url = "https://www.gutenberg.org/files/1342/1342-0.txt"
    print(f"Fetching {url}...")
    raw_text = fetch_text(url)
    
    if not raw_text:
        print("Failed to fetch text. Using local manual dummy if needed or exit.")
        return

    paragraphs = clean_text(raw_text)
    print(f"Total paragraphs found: {len(paragraphs)}")
    
    all_pages = create_pages(paragraphs, lines_per_page=7)
    total_pages = len(all_pages)
    print(f"Total pages created: {total_pages}")
    
    # Updated splitting logic based on user feedback
    total_pages = len(all_pages)
    if total_pages <= 150:
        vol_size = total_pages + 1 # Force single volume
    else:
        vol_size = 1000 # Larger chunks for long books
        
    num_vols = (total_pages + vol_size - 1) // vol_size
    volumes = []
    
    for i in range(num_vols):
        start = i * vol_size
        end = start + vol_size
        vol_pages_data = all_pages[start:end]
        if not vol_pages_data: continue
        
        formatted_pages = format_pages_html(vol_pages_data, 1)
        
        base_title = "Pride and Prejudice"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        # Custom covers/colors
        covers = ["🎩", "👒", "🏰", "💍"]
        colors = ["#2c3e50", "#8e44ad", "#27ae60", "#c0392b"]
        
        book = {
            "title": display_title,
            "author": "Jane Austen",
            "level": "C1",
            "cover": covers[i % len(covers)],
            "color": colors[i % len(colors)],
            "description": "The classic novel exploring manners, upbringing, morality, education, and marriage.",
            "pages": formatted_pages
        }
        volumes.append(book)

    # Output to JSON file
    with open("js/pride_prejudice_books.js", "w", encoding="utf-8") as f:
        for book in volumes:
            f.write(f"window.BOOK_DATA['C1'].push({json.dumps(book, indent=4, ensure_ascii=False)});\n\n")
            
    print("Successfully generated js/pride_prejudice_books.js")

if __name__ == "__main__":
    main()
