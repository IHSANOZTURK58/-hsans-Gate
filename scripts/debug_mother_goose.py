import urllib.request
import re

def fetch_text(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return None

def normalize_title(title):
    return ' '.join(title.split()).upper()

def parse_rhymes(text):
    chunks = re.split(r'\n\s*\n', text)
    rhymes = []
    
    i = 0
    # Skipping the first few chunks if they contain metadata
    while i < len(chunks) and i < 50: 
        chunk = chunks[i].upper()
        if "PROJECT GUTENBERG" in chunk or "LICENSE" in chunk or "DISTRIBUTED" in chunk or "UNITED STATES" in chunk:
            i += 1
            print(f"Skipping metadata chunk {i}")
            continue
        break
        
    while i < len(chunks):
        chunk = chunks[i].strip()
        if not chunk:
            i += 1
            continue
            
        lines = chunk.split('\n')
        
        if "PROJECT GUTENBERG" in chunk.upper() or "END OF THE PROJECT" in chunk.upper():
             i+=1
             continue

        # Logic to detect title + body
        if len(lines) <= 2 and all(len(l) < 50 for l in lines) and chunk.isupper():
            title = chunk.replace("\n", " ")
            if i + 1 < len(chunks):
                body = chunks[i+1].strip()
                rhymes.append({'title': title, 'body': body})
                print(f"Title detected: '{title}' -> Normalized: '{normalize_title(title)}'")
                i += 2
                continue
        else:
            title = lines[0][:30] + "..." if len(lines[0]) > 30 else lines[0]
            rhymes.append({'title': title, 'body': chunk})
            print(f"Implicit title: '{title}' -> Normalized: '{normalize_title(title)}'")
            i += 1
            
    return rhymes

url = "https://www.gutenberg.org/cache/epub/10607/pg10607.txt"
text = fetch_text(url)
# Just take the first 20000 chars
text = text[:20000]

rhymes = parse_rhymes(text)
