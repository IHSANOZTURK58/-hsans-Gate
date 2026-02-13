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
    # Title: Old Mother West Wind
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK OLD MOTHER WEST WIND ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK OLD MOTHER WEST WIND ***"
    
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
    
    # Old Mother West Wind headers are usually chapter titles.
    # e.g., "I. Mrs. Redwing's Speckled Egg"
    # or just content.
    
    # Regex for Typical Headers in this book:
    # Roman numerals followed by title, or just title
    # e.g. "I" on one line, Title on next? Or "CHAPTER I"
    
    # Let's look for lines that are short and capitalized or start with Chapter/Roman Numeral
    
    header_pattern = re.compile(r'^(CHAPTER\s+[IVXLCDM]+|.*\bSTORY\b.*|[IVXLCDM]+\.?\s+[A-Z].*)', re.IGNORECASE)

    for i, page_lines in enumerate(pages_data):
        page_content = ""
        
        # Check first line for header
        if page_lines:
            match = header_pattern.match(page_lines[0])
            
            # Fallback: All Caps line that isn't too long
            is_header = match or (page_lines[0].strip().isupper() and len(page_lines[0].strip()) > 3 and len(page_lines[0].strip()) < 60)
            
            if is_header:
                page_content += f"<h3>{page_lines[0]}</h3>\n"
                lines_to_add = page_lines[1:]
            else:
                lines_to_add = page_lines
        else:
            lines_to_add = []

        for line in lines_to_add:
            # Check for inner headers
            if header_pattern.match(line) or (line.strip().isupper() and len(line.strip()) > 3 and len(line.strip()) < 60):
                 page_content += f"<h3>{line}</h3>\n"
            else:
                 page_content += f"<p>{line}</p>\n"
                 
        formatted_pages.append(page_content)
    return formatted_pages

def main():
    # Old Mother West Wind - Thornton W. Burgess
    url = "https://www.gutenberg.org/cache/epub/2557/pg2557.txt"
    print(f"Fetching {url}...")
    raw_text = fetch_text(url)
    
    if not raw_text:
        print("Failed to fetch text. Trying alternative...")
        url = "https://www.gutenberg.org/files/2557/2557-0.txt"
        raw_text = fetch_text(url)
        if not raw_text:
             return

    # Check for markers, fallback if needed
    if "*** START" not in raw_text and "Old Mother West Wind" in raw_text:
         # simple fallback
         pass

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
        
        base_title = "Mother West Wind"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        if num_vols > 1:
             vol_pages[0] = f"<h3>{display_title}</h3>\n" + vol_pages[0]
             
        volumes.append({
            "title": display_title,
            "author": "Thornton W. Burgess",
            "level": "A2",
            "cover": "🌬️" if i % 2 == 0 else "🐇",
            "color": "#a29bfe" if i % 2 == 0 else "#00b894",
            "description": "Stories about the merry little breezes.",
            "pages": vol_pages
        })

    # Output to JSON file
    with open("js/mother_west_wind_books.js", "w", encoding="utf-8") as f:
        for book in volumes:
            f.write(f"window.BOOK_DATA['A2'].push({json.dumps(book, indent=4, ensure_ascii=False)});\n\n")
            
    print("Successfully generated js/mother_west_wind_books.js")

if __name__ == "__main__":
    main()
