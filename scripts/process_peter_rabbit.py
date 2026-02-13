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
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE TALE OF PETER RABBIT ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE TALE OF PETER RABBIT ***"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx + len(start_marker):end_idx]
    
    # Normalize newlines
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n+', '\n', text)
    
    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    return paragraphs

def create_pages(paragraphs, lines_per_page=7):
    pages = []
    current_page = []
    
    for p in paragraphs:
        # Avoid splitting common abbreviations
        text = p.replace("Mr.", "Mr_").replace("Mrs.", "Mrs_").replace("St.", "St_")
        sentences = re.split(r'(?<=[.!?]) +', text)
        for sentence in sentences:
            if not sentence.strip(): continue
            # Restore abbreviations
            clean_sentence = sentence.replace("Mr_", "Mr.").replace("Mrs_", "Mrs.").replace("St_", "St.")
            current_page.append(clean_sentence)
            if len(current_page) >= lines_per_page:
                pages.append(current_page)
                current_page = []
                
    if current_page:
        pages.append(current_page)
        
    return pages

def format_pages_html(pages_data):
    formatted_pages = []
    for page_lines in pages_data:
        html = "<div style='font-size: 1.1em; line-height: 1.6;'>\n"
        for line in page_lines:
            html += f"<p>{line}</p>\n"
        html += "</div>"
        formatted_pages.append(html)
    return formatted_pages

def main():
    url = "https://www.gutenberg.org/cache/epub/14838/pg14838.txt"
    print(f"Fetching {url}...")
    
    text = fetch_text(url)
    if not text: return
    
    paragraphs = clean_text(text)
    pages_data = create_pages(paragraphs, lines_per_page=7)
    formatted_pages = format_pages_html(pages_data)
    
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
        
        base_title = "The Tale of Peter Rabbit"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"
        
        # Add Title Page
        vol_pages.insert(0, f"<div style='text-align: center; margin-top: 20px;'><h3>{display_title}</h3><p>By Beatrix Potter</p></div>")

        volumes.append({
            "title": display_title,
            "author": "Beatrix Potter",
            "level": "A1",
            "cover": "🐰",
            "color": "#badc58",
            "description": "The famous story of a mischievous rabbit in Mr. McGregor's garden.",
            "pages": vol_pages
        })

    output_file = "js/peter_rabbit_books.js"
    with open(output_file, "w", encoding="utf-8") as f:
        for vol in volumes:
            f.write(f"window.BOOK_DATA['A1'].push({json.dumps(vol, indent=4, ensure_ascii=False)});\n\n")
            
    print(f"Generated {output_file} with {total_pages} content pages")

if __name__ == "__main__":
    main()
