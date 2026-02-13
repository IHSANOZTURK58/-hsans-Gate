import json
import re

WORDS_FILE = r"c:\Users\pc\OneDrive\Desktop\PROJELERİM\İhsansGAte\İhsans Gate\js\words.js"
FIXED_FILE = "fixed_vocab.json"

try:
    # 1. Load Fixed Words
    with open(FIXED_FILE, 'r', encoding='utf-8') as f:
        fixed_words = json.load(f)
    
    fixed_map = {w['word']: w['meaning'] for w in fixed_words}
    print(f"Loaded {len(fixed_map)} fixed translations.")

    # 2. Load Original JS
    with open(WORDS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # 3. Parse JS Array
    match = re.search(r'window\.WORD_DATA\s*=\s*(\[.*\]);', content, re.DOTALL)
    if not match:
        match = re.search(r'=\s*(\[.*\]);', content, re.DOTALL)
    
    if not match:
        print("Could not parse words.js")
        exit(1)

    json_str = match.group(1)
    
    # Clean JS artifacts
    json_str_clean = re.sub(r',\s*]', ']', json_str)
    json_str_clean = re.sub(r',\s*}', '}', json_str_clean)

    words = json.loads(json_str_clean)
    
    # 4. Update Meanings
    updated_count = 0
    for item in words:
        if item['word'] in fixed_map:
            if item['meaning'] != fixed_map[item['word']]:
                item['meaning'] = fixed_map[item['word']]
                updated_count += 1
    
    print(f"Updated {updated_count} words.")

    # 5. Save back to JS
    new_json = json.dumps(words, ensure_ascii=False, indent=4)
    new_content = f"window.WORD_DATA = {new_json};"
    
    with open(WORDS_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"Successfully saved to {WORDS_FILE}")

except Exception as e:
    print(f"Error: {e}")
