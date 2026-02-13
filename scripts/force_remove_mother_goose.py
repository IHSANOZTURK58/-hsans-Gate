import os

file_path = 'js/books.js'
if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Split by the specific keyword used to start blocks
# Note: The first assignment also starts with window.BOOK_DATA
delimiter = 'window.BOOK_DATA'
parts = content.split(delimiter)
new_parts = []

print(f"Total parts found: {len(parts)}")

removed_count = 0

for part in parts:
    # If part is empty (start of file), keep it
    if not part:
        new_parts.append(part)
        continue
        
    # Check if this block is for Mother Goose
    # We look for the title definition
    if 'Mother Goose' in part:
        print("Found and removing Mother Goose block.")
        removed_count += 1
        continue
        
    new_parts.append(part)

if removed_count == 0:
    print("No Mother Goose entries found to remove.")
else:
    new_content = delimiter.join(new_parts)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Successfully removed {removed_count} Mother Goose entries.")
