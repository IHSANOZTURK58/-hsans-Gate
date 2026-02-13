import json
import re

# File path
input_file = r"c:\Users\pc\OneDrive\Desktop\PROJELERİM\İhsansGAte\İhsans Gate\js\words.js"
output_file = "fix_vocab_test.json"

try:
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract JSON array
    match = re.search(r'window\.WORD_DATA\s*=\s*(\[.*\]);', content, re.DOTALL)
    if not match:
        # Fallback for minified or different format
        match = re.search(r'=\s*(\[.*\]);', content, re.DOTALL)

    if not match:
        print("Could not find JSON array in words.js")
        exit(1)

    json_str = match.group(1)
    
    # Clean up trailing commas
    json_str = re.sub(r',\s*]', ']', json_str)
    json_str = re.sub(r',\s*}', '}', json_str)

    words = json.loads(json_str)
    
    issues = []
    # Iterate backwards to get the most recent additions
    for item in reversed(words):
        if item['word'].strip().lower() == item['meaning'].strip().lower():
            issues.append(item)
            if len(issues) >= 20:
                break
            
    print(f"Found {len(issues)} words for testing.")
    
    # Save to file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(issues, f, ensure_ascii=False, indent=4)
        
    print(f"Saved to {output_file}")

except Exception as e:
    print(f"Error: {e}")
