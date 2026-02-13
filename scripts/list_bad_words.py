import json
import re

WORDS_FILE = r"c:\Users\pc\OneDrive\Desktop\PROJELERİM\İhsansGAte\İhsans Gate\js\words.js"

try:
    with open(WORDS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Parse JS
    match = re.search(r'window\.WORD_DATA\s*=\s*(\[.*\]);', content, re.DOTALL)
    if not match:
        match = re.search(r'=\s*(\[.*\]);', content, re.DOTALL)
    
    if not match:
        print("Error: Could not parse words.js")
        exit(1)

    json_str = match.group(1)
    # Clean JS artifacts
    json_str_clean = re.sub(r',\s*]', ']', json_str)
    json_str_clean = re.sub(r',\s*}', '}', json_str_clean)

    words = json.loads(json_str_clean)
    
    bad_words = []
    for item in words:
        w = item.get('word', '').strip()
        m = item.get('meaning', '').strip()
        
        # Check if meaning is same as word (ignore case) or if meaning is empty
        if w and m and w.lower() == m.lower():
            bad_words.append(w)
            
    # Output total count and first 2000
    print(f"TOTAL_BAD_WORDS: {len(bad_words)}")
    print(json.dumps(bad_words[:2000], indent=2))

except Exception as e:
    print(f"Error: {e}")
