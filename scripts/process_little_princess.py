
import urllib.request
import re
import json
import ssl

# Bypass SSL verification if needed (for some systems)
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
    # Remove Project Gutenberg header/footer
    start_markers = ["*** START OF THE PROJECT GUTENBERG EBOOK A LITTLE PRINCESS ***", "*** START OF THIS PROJECT GUTENBERG EBOOK A LITTLE PRINCESS ***"]
    end_markers = ["*** END OF THE PROJECT GUTENBERG EBOOK A LITTLE PRINCESS ***", "*** END OF THIS PROJECT GUTENBERG EBOOK A LITTLE PRINCESS ***"]
    
    start_idx = -1
    for marker in start_markers:
        idx = text.find(marker)
        if idx != -1:
            start_idx = idx + len(marker)
            break
            
    end_idx = -1
    for marker in end_markers:
        idx = text.find(marker)
        if idx != -1:
            end_idx = idx
            break
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx:end_idx]
    
    # Normalize whitespace
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n+', '\n', text)
    
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return paragraphs

def create_pages(paragraphs, lines_per_page=9): # Increased lines slightly for B1
    pages = []
    current_page = []
    
    for p in paragraphs:
        # Split long paragraphs into sentences
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

def format_pages_html(pages_data):
    formatted_pages = []
    
    # Chapter headers usually look like "CHAPTER I" or "ARA CREWE"
    # We will try to detect them
    
    for page_lines in pages_data:
        page_content = ""
        lines_to_add = page_lines
        
        # Simple header detection: Short, uppercase line at start of page
        if page_lines and len(page_lines[0]) < 50 and page_lines[0].isupper():
             page_content += f"<h3>{page_lines[0]}</h3>\n"
             lines_to_add = page_lines[1:]

        for line in lines_to_add:
             # Check if internal line looks like a header (e.g. new chapter starts mid-page)
             if len(line) < 50 and line.isupper() and "CHAPTER" in line:
                  page_content += f"<h3>{line}</h3>\n"
             else:
                  page_content += f"<p>{line}</p>\n"
                  
        formatted_pages.append(page_content)
    return formatted_pages

def main():
    # A Little Princess by Frances Hodgson Burnett
    url = "https://www.gutenberg.org/cache/epub/146/pg146.txt"
    print(f"Fetching {url}...")
    
    raw_text = fetch_text(url)
    if not raw_text:
        return

    paragraphs = clean_text(raw_text)
    print(f"Total paragraphs found: {len(paragraphs)}")
    
    all_pages = create_pages(paragraphs, lines_per_page=9)
    total_pages = len(all_pages)
    print(f"Total pages created: {total_pages}")
    
    formatted_pages = format_pages_html(all_pages)
    
    # Updated splitting logic based on user feedback
    total_pages = len(formatted_pages)
    if total_pages <= 150:
        vol_size = total_pages + 1 # Force single volume
    else:
        vol_size = 1000 # Larger chunks for long books
        
    num_vols = (total_pages + vol_size - 1) // vol_size
    volumes = []
    
    for i in range(num_vols):
        start = i * vol_size
        end = start + vol_size
        vol_pages = formatted_pages[start:end]
        if not vol_pages: continue
        
        base_title = "A Little Princess"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        if num_vols > 1:
            vol_pages[0] = f"<h3>{display_title}</h3>\n" + vol_pages[0]
            
        volumes.append({
            "title": display_title,
            "author": "Frances Hodgson Burnett",
            "level": "B1",
            "cover": "👸" if i % 2 == 0 else "👑",
            "color": "#e056fd" if i % 2 == 0 else "#be2edd",
            "description": "Sara Crewe's story.",
            "pages": vol_pages
        })
    
    output_file = "js/little_princess_books.js"
    with open(output_file, "w", encoding="utf-8") as f:
        for vol in volumes:
            f.write(f"window.BOOK_DATA['B1'].push({json.dumps(vol, indent=4, ensure_ascii=False)});\n\n")
            
    print(f"Generated {output_file}")

if __name__ == "__main__":
    main()
