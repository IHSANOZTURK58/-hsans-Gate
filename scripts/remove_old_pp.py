import os

file_path = "js/books.js"
target_string = '"title": "Pride and Prejudice - Vol 1"'
# We know the structure: window.BOOK_DATA['C1'].push({ ... "title": ...
# So we want to find the line with the Push, which is a few lines above the title.

try:
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    cut_index = -1
    for i, line in enumerate(lines):
        if target_string in line:
            # Found the title. The push start should be 1 line above (line i-1).
            # Let's check line i-1 for "push({" or similar.
            # Actually, looking at previous view_file, the title is on line 6360, and push is on 6359.
            # So we want to keep up to line 6358 (inclusive of index 6357 in 0-indexed list).
            # Let's verify.
            # If title is at index i.
            # We want to remove from index i-1 downwards?
            # Safe bet: find the index, then look backwards for "window.BOOK_DATA".
            
            for j in range(i, max(0, i-20), -1):
                if "window.BOOK_DATA['C1'].push({" in lines[j]:
                    cut_index = j
                    break
            break
            
    if cut_index != -1:
        print(f"Found start of P&P at line {cut_index + 1}. Truncating file...")
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(lines[:cut_index])
        print("Truncation successful.")
    else:
        print("Could not find Pride and Prejudice content to remove.")

except Exception as e:
    print(f"Error: {e}")
