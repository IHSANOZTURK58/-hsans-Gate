
import re

file_path = 'js/books.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match full push blocks: window.BOOK_DATA['...'].push({ ... });
# Non-greedy match for the content inside {}
pattern = r"window\.BOOK_DATA\['[A-Z0-9]+'\]\.push\(\{[\s\S]*?\}\);"

def replace_callback(match):
    block = match.group(0)
    if "Mother Goose" in block:
        print("Removing a Mother Goose entry...")
        return "" # Remove
    return block

new_content = re.sub(pattern, replace_callback, content)

# Clean up excessive newlines (more than 2)
new_content = re.sub(r'\n{3,}', '\n\n', new_content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Finished cleaning books.js")
