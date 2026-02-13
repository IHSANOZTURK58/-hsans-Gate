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
    # Title: The Story of Doctor Dolittle
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE STORY OF DOCTOR DOLITTLE ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE STORY OF DOCTOR DOLITTLE ***"
    
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
    
    # "THE FIRST CHAPTER", "THE SECOND CHAPTER" etc. or "THE 1ST CHAPTER"
    # Or titles like "PROP.NO."
    # Let's check typical headers. 
    # Usually "THE [NUMBER] CHAPTER" or similar in this book.
    # regex for "CHAPTER" or "THE .* CHAPTER"
    
    header_pattern = re.compile(r'^(THE\s+.*CHAPTER|CHAPTER\s+.*)', re.IGNORECASE) 

    for i, page_lines in enumerate(pages_data):
        page_content = ""
        
        # Check first line for header
        if page_lines:
            match = header_pattern.match(page_lines[0])
            if match:
                page_content += f"<h3>{page_lines[0]}</h3>\n"
                lines_to_add = page_lines[1:]
            else:
                # Also check for all CAPS lines as fall back if they look like titles
                 if page_lines[0].isupper() and len(page_lines[0]) > 4 and len(page_lines[0]) < 50:
                      page_content += f"<h3>{page_lines[0]}</h3>\n"
                      lines_to_add = page_lines[1:]
                 else:
                      lines_to_add = page_lines
        else:
            lines_to_add = []

        for line in lines_to_add:
            # Check for inner headers
            if header_pattern.match(line):
                 page_content += f"<h3>{line}</h3>\n"
            elif line.isupper() and len(line) > 4 and len(line) < 50:
                 page_content += f"<h3>{line}</h3>\n"
            else:
                 page_content += f"<p>{line}</p>\n"
                 
        formatted_pages.append(page_content)
    return formatted_pages

def main():
    # The Story of Doctor Dolittle
    url = "https://www.gutenberg.org/cache/epub/50133/pg50133.txt"
    print(f"Fetching {url}...")
    raw_text = fetch_text(url)
    
    if not raw_text:
        print("Failed to fetch text. Trying alternative ID 157 (common one)")
        url = "https://www.gutenberg.org/files/4032/4032-0.txt" # ID 4032 is clearer text often
        raw_text = fetch_text(url)
        if not raw_text:
             return

    # Helper because sometimes markers differ by ID
    if "*** START" not in raw_text and "The Story of Doctor Dolittle" in raw_text:
         # Rough cut if markers fail
         start_idx = raw_text.find("THE FIRST CHAPTER")
         if start_idx != -1:
              raw_text = raw_text[start_idx:]

    paragraphs = clean_text(raw_text)
    if not paragraphs:
         # Fallback cleaning if markers failed
         paragraphs = [p.strip() for p in raw_text.split('\n') if p.strip()]

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
        
        base_title = "Doctor Dolittle"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        if num_vols > 1:
             vol_pages[0] = f"<h3>{display_title}</h3>\n" + vol_pages[0]
             
        volumes.append({
            "title": display_title,
            "author": "Hugh Lofting",
            "level": "A2",
            "cover": "👨‍⚕️" if i % 2 == 0 else "🦜",
            "color": "#f1c40f" if i % 2 == 0 else "#e67e22",
            "description": "The famous doctor who talks to animals.",
            "pages": vol_pages
        })

    # Output to JSON file
    with open("js/dolittle_books.js", "w", encoding="utf-8") as f:
        for book in volumes:
            f.write(f"window.BOOK_DATA['A2'].push({json.dumps(book, indent=4, ensure_ascii=False)});\n\n")
            
    print("Successfully generated js/dolittle_books.js")

if __name__ == "__main__":
    main()
