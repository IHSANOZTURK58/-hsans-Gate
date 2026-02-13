import os

file_path = "js/books.js"
target_string = '"title": "Peter Pan - Vol 1"'

try:
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    cut_index = -1
    for i, line in enumerate(lines):
        if target_string in line:
            # Found the title.
            # Look backwards for "window.BOOK_DATA['B2'].push({"
            for j in range(i, max(0, i-20), -1):
                if "window.BOOK_DATA['B2'].push({" in lines[j]:
                    cut_index = j
                    break
            break
            
    if cut_index != -1:
        print(f"Found start of Peter Pan at line {cut_index + 1}. Truncating file...")
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(lines[:cut_index])
        print("Truncation successful.")
    else:
        print("Could not find Peter Pan content to remove.")

except Exception as e:
    print(f"Error: {e}")
