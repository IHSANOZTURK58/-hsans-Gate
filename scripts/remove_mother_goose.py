
import re

file_path = 'js/books.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to remove Mother Goose entries
# They look like: window.BOOK_DATA['A1'].push({ ... "title": "Mother Goose ... });
# utilizing a regex that captures the whole push statement.
# Warning: Regex on nested JSON is tricky.
# Simpler approach: Read lines, filter out lines/blocks belonging to Mother Goose.
# Since we write them as `window.BOOK_DATA...push({...});` blocks separated by newlines.

lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if "Mother Goose" in line and "window.BOOK_DATA" in line:
        skip = True
        # Check if it's a one-liner (it shouldn't be based on my previous script)
        # But my previous script wrote: f.write(f"window.BOOK_DATA['A1'].push({json.dumps(vol, ...)});\n\n")
        # json.dumps with indent=4 means multi-line.
        
    if skip:
        if line.strip() == ");" or line.strip() == "});":
            skip = False
        continue
        
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Removed old Mother Goose entries.")
