import json
import re

# File path
input_file = r"c:\Users\pc\OneDrive\Desktop\PROJELERİM\İhsansGAte\İhsans Gate\js\words.js"
output_file = "fix_vocab.json"

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract JSON array
    # Looking for 'const wordList = [...]' or similar
    match = re.search(r'=\s*(\[.*\]);', content, re.DOTALL)
    if not match:
        print("Could not find JSON array in words.js")
        exit(1)

    json_str = match.group(1)
    
    # Clean up trailing commas if any (common in JS)
    json_str = re.sub(r',\s*]', ']', json_str)
    json_str = re.sub(r',\s*}', '}', json_str)

    words = json.loads(json_str)
    
    issues = []
    for item in words:
        # Check if meaning is same as word (case insensitive and trimmed)
        if item['word'].strip().lower() == item['meaning'].strip().lower():
            issues.append(item)
            
    print(f"Found {len(issues)} words with identical meaning.")
    
    # Save to file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(issues, f, ensure_ascii=False, indent=4)
        
    print(f"Saved to {output_file}")

except Exception as e:
    print(f"Error: {e}")
