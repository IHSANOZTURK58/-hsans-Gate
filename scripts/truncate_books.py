import os

file_path = "js/books.js"
limit = 6358

try:
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    if len(lines) > limit:
        with open(file_path, "w", encoding="utf-8") as f:
            f.writelines(lines[:limit])
        print(f"Truncated {file_path} to {limit} lines.")
    else:
        print(f"File {file_path} is already {len(lines)} lines long.")

except Exception as e:
    print(f"Error: {e}")
