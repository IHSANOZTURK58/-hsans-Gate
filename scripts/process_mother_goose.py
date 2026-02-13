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
    # Aggressive start cleaning
    # Remove everything before the first actual rhyme or the generic "produced by" line if we can't find the marker.
    
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
            # Find the end of this line
            line_end = text.find('\n', idx)
            start_idx = line_end if line_end != -1 else idx + len(m)
            break
            
    if start_idx != -1:
        text = text[start_idx:]
    else:
        # Fallback: Look for the first known rhyme or "Contents"
        pass

    # End cleaning
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

def parse_rhymes(text):
    chunks = re.split(r'\n\s*\n', text)
    rhymes = []
    
    i = 0
    # Skipping the first few chunks if they contain metadata
    while i < len(chunks) and i < 50: # Check first 50 chunks for metadata
        chunk = chunks[i].upper()
        if "PROJECT GUTENBERG" in chunk or "LICENSE" in chunk or "DISTRIBUTED" in chunk or "UNITED STATES" in chunk:
            i += 1
            continue
        # Also skip Table of Contents if present in early chunks
        if "CONTENTS" in chunk or "ILLUSTRATIONS" in chunk:
            i += 1
            continue
        break
        
    while i < len(chunks):
        chunk = chunks[i].strip()
        if not chunk:
            i += 1
            continue
            
        # Is this a Title?
        lines = chunk.split('\n')
        
        # Filter out garbage
        if "PROJECT GUTENBERG" in chunk.upper() or "END OF THE PROJECT" in chunk.upper():
             i+=1
             continue

        # Logic to detect title + body
        # Titles in this file are often capitalized
        if len(lines) <= 2 and all(len(l) < 50 for l in lines) and chunk.isupper():
            title = chunk.replace("\n", " ")
            if i + 1 < len(chunks):
                body = chunks[i+1].strip()
                rhymes.append({'title': title, 'body': body})
                i += 2
                continue
        else:
            # Maybe just a rhyme without clear title separator, or title is part of chunk
            title = lines[0][:30] + "..." if len(lines[0]) > 30 else lines[0]
            rhymes.append({'title': title, 'body': chunk})
            i += 1
            
    return rhymes

def create_formatted_pages(rhymes):
    pages = []
    MAX_LINES_PER_PAGE = 7
    
    for rhyme in rhymes:
        title = rhyme['title']
        body = rhyme['body']
        
        # Clean title
        title = title.replace('_', '').strip()
        
        lines = body.split('\n')
        
        # Split into chunks of MAX_LINES_PER_PAGE
        for j in range(0, len(lines), MAX_LINES_PER_PAGE):
            chunk_lines = lines[j:j+MAX_LINES_PER_PAGE]
            
            # Determine title for this page
            page_title = title
            if j > 0:
                page_title += " (cont.)"
            
            html = f"<div style='text-align: center;'>\n<h3>{page_title}</h3>\n"
            for line in chunk_lines:
                line = line.strip()
                if line:
                    html += f"<p>{line}</p>\n"
                else:
                    html += "<br>\n"
            html += "</div>"
            
            pages.append(html)
            
    return pages

def normalize_title(title):
    return ' '.join(title.split()).upper()

def main():
    # Correct URL for The Real Mother Goose
    url = "https://www.gutenberg.org/cache/epub/10607/pg10607.txt"
    print(f"Fetching {url}...")
    
    text = fetch_text(url)
    if not text: return

    clean = clean_text(text)
    rhymes = parse_rhymes(clean)
    print(f"Found {len(rhymes)} rhymes.")
    
    # Filter out Contents, Illustrations, Lists
    # Normalize titles for checking
    filtered_rhymes = []
    start_collecting = False
    
    for r in rhymes:
        norm_title = normalize_title(r['title'])
        
        # Heuristic: The actual rhymes start with "LITTLE BO-PEEP"
        # We skip everything before that.
        if "LITTLE BO-PEEP" in norm_title:
             start_collecting = True
             
        if not start_collecting:
            continue
            
        if "CONTENTS" in norm_title: continue
        if "ILLUSTRATIONS" in norm_title: continue
        if "LIST OF THE RHYMES" in norm_title: continue
        if "LIST OF FIRST LINES" in norm_title: continue
        
        filtered_rhymes.append(r)
        
    rhymes = filtered_rhymes
    
    pages = create_formatted_pages(rhymes)
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
        
        # ... logic for Title Page ...
        if i > 0 or (num_vols > 1 and i == 0): # Add title page if it's a volume-based split
             if "Mother Goose" not in vol_pages[0]:
                 vol_pages.insert(0, f"<div style='text-align: center;'><h3>Mother Goose - Vol {i+1}</h3><p>Nursery Rhymes</p></div>")
        
        base_title = "Mother Goose"
        display_title = base_title if num_vols == 1 else f"{base_title} - Vol {i+1}"

        volumes.append({
            "title": display_title,
            "author": "Mother Goose",
            "level": "A1",
            "cover": "🪿",
            "color": "#00cec9" if i % 2 == 0 else "#81ecec",
            "description": "Classic Nursery Rhymes.",
            "pages": vol_pages
        })
        
    output_file = "js/mother_goose_books.js"
    with open(output_file, "w", encoding="utf-8") as f:
        for vol in volumes:
            f.write(f"window.BOOK_DATA['A1'].push({json.dumps(vol, indent=4, ensure_ascii=False)});\n\n")
            
    print(f"Generated {output_file}")

if __name__ == "__main__":
    main()
