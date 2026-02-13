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
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK PETER PAN ***"
    if start_marker not in text:
        start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK PETER AND WENDY ***"
        
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK PETER PAN ***"
    if end_marker not in text:
        end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK PETER AND WENDY ***"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx + len(start_marker):end_idx]
    
    # Normalize whitespace
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n+', '\n', text)
    
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return paragraphs

def create_pages(paragraphs, lines_per_page=7):
    pages = []
    current_page = []
    
    for p in paragraphs:
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
                lines_to_add = page_lines[1:]
            else:
                lines_to_add = page_lines
        else:
            lines_to_add = []

        for line in lines_to_add:
            # Check for inner chapter headings
            if chapter_pattern.match(line):
                 page_content += f"<h3>{line}</h3>\n"
            else:
                 page_content += f"<p>{line}</p>\n"
                 
        formatted_pages.append(page_content)
    return formatted_pages

def main():
    # Peter Pan (Peter and Wendy)
    url = "https://www.gutenberg.org/files/11/11-0.txt"
    print(f"Fetching {url}...")
    raw_text = fetch_text(url)
    
    if not raw_text:
        print("Failed to fetch text.")
        return

    paragraphs = clean_text(raw_text)
    print(f"Total paragraphs found: {len(paragraphs)}")
    
    all_pages = create_pages(paragraphs, lines_per_page=7)
    total_pages = len(all_pages)
    print(f"Total pages created: {total_pages}")
    
    all_formatted_pages = format_pages_html(all_pages, 1)
    
    # Updated splitting logic based on user feedback
    total_pages = len(all_formatted_pages)
    if total_pages <= 150:
        vol_size = total_pages + 1 # Force single volume
    else:
        vol_size = 1000 # Larger chunks for long books
        
    num_vols = (total_pages + vol_size - 1) // vol_size
    volumes = []
    
    for i in range(num_vols):
        start = i * vol_size
        end = start + vol_size
        vol_pages = all_formatted_pages[start:end]
        if not vol_pages: continue
        
        base_title = "Peter Pan"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        if num_vols > 1:
             vol_pages[0] = f"<h3>{display_title}</h3>\n" + vol_pages[0]
             
        volumes.append({
            "title": display_title,
            "author": "J.M. Barrie",
            "level": "B2",
            "cover": "🧚" if i % 2 == 0 else "🐊",
            "color": "#1abc9c" if i % 2 == 0 else "#9b59b6",
            "description": "The classic tale of the boy who wouldn't grow up.",
            "pages": vol_pages
        })

    # Output to JSON file
    with open("js/peter_pan_books.js", "w", encoding="utf-8") as f:
        for book in volumes:
            f.write(f"window.BOOK_DATA['B2'].push({json.dumps(book, indent=4, ensure_ascii=False)});\n\n")
            
    print("Successfully generated js/peter_pan_books.js")

if __name__ == "__main__":
    main()
