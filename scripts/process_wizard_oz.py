
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
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE WONDERFUL WIZARD OF OZ ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE WONDERFUL WIZARD OF OZ ***"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx + len(start_marker):end_idx]
    
    # Normalize whitespace
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n+', '\n', text)
    
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return paragraphs

def create_pages_with_split(paragraphs, lines_per_page=7):
    # We want to identify the exact paragraph index for Chapter XII
    split_paragraph_idx = -1
    for i, p in enumerate(paragraphs):
        # Specific match for Chapter XII in Wizard of Oz
        if re.match(r'^Chapter XII$', p.strip(), re.IGNORECASE):
            split_paragraph_idx = i
            break
            
    if split_paragraph_idx == -1:
        print("Warning: Could not find Chapter XII for splitting. Falling back to midpoint split.")
        split_paragraph_idx = len(paragraphs) // 2

    # Split paragraphs into two sets
    vol1_paragraphs = paragraphs[:split_paragraph_idx]
    vol2_paragraphs = paragraphs[split_paragraph_idx:]
    
    def paginate(p_list):
        pages = []
        current_page = []
        for p in p_list:
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

    vol1_pages = paginate(vol1_paragraphs)
    vol2_pages = paginate(vol2_paragraphs)
    
    return vol1_pages, vol2_pages

def format_pages_html(pages_data):
    formatted_pages = []
    # Wizard of Oz headers: "Chapter X", "The Title of Chapter"
    header_pattern = re.compile(r'^(Chapter [IVXLCDM]+|[A-Z][a-z]+(\s+[A-Z][a-z]+)*)$')

    for page_lines in pages_data:
        page_content = ""
        if page_lines:
            # Check if first line is a chapter marker
            is_chapter = re.match(r'^Chapter [IVXLCDM]+$', page_lines[0].strip(), re.IGNORECASE)
            if is_chapter:
                page_content += f"<h3>{page_lines[0]}</h3>\n"
                lines_to_add = page_lines[1:]
            else:
                lines_to_add = page_lines
        else:
            lines_to_add = []

        for line in lines_to_add:
            # Check for inner chapter titles (often short, title case or all caps)
            # For simplistic formatting, let's treat anything that was a short line in Gutenberg as a potential p
            page_content += f"<p>{line}</p>\n"
                 
        formatted_pages.append(page_content)
    return formatted_pages

def main():
    url = "https://www.gutenberg.org/cache/epub/55/pg55.txt"
    print(f"Fetching {url}...")
    raw_text = fetch_text(url)
    
    if not raw_text:
        return

    paragraphs = clean_text(raw_text)
    print(f"Total paragraphs: {len(paragraphs)}")
    
    vol1_raw, vol2_raw = create_pages_with_split(paragraphs, lines_per_page=7)
    
    vol1_formatted = format_pages_html(vol1_raw)
    vol2_formatted = format_pages_html(vol2_raw)
    
    print(f"Volume 1: {len(vol1_formatted)} pages")
    print(f"Volume 2: {len(vol2_formatted)} pages")
    
    volumes = []
    base_title = "The Wonderful Wizard of Oz"
    
    # Volume 1
    volumes.append({
        "title": f"{base_title} - Vol 1",
        "author": "L. Frank Baum",
        "level": "B1",
        "cover": "🏰",
        "color": "#2ecc71",
        "description": "Follow Dorothy and her friends on their journey to the Emerald City.",
        "pages": vol1_formatted
    })
    
    # Volume 2
    volumes.append({
        "title": f"{base_title} - Vol 2",
        "author": "L. Frank Baum",
        "level": "B1",
        "cover": "🦁",
        "color": "#f1c40f",
        "description": "The search for the Wicked Witch and the truth about the Wizard.",
        "pages": vol2_formatted
    })

    with open("js/wizard_oz_books.js", "w", encoding="utf-8") as f:
        for book in volumes:
            f.write(f"window.BOOK_DATA['B1'].push({json.dumps(book, indent=4, ensure_ascii=False)});\n\n")
            
    print("Successfully generated js/wizard_oz_books.js")

if __name__ == "__main__":
    main()
