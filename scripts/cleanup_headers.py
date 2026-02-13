import re

new_book_titles = [
    "The Red Kitten's Adventure", "Our New Neighborhood", "A Trip to the Park",
    "The Mystery of the Old Clock", "A Weekend in the Mountains", "The Space Explorer's Diary",
    "The Future of Farming", "A Journey Through History", "The Robot Who Wanted to Paint",
    "The Psychology of Dreams", "Urban Legends of the 21st Century", "The Impact of Social Media on Youth",
    "Existentialism: A Modern Perspective", "The Evolution of Global Trade", "Quantum Physics for the Curious Mind"
]

def cleanup_headers():
    with open('js/books.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to find each book's pages array and clean it up
    for title in new_book_titles:
        # Find the book structure
        # We look for the title and then the pages: [ ... ]
        # This is a bit tricky with regex due to nested brackets, but since the structure is consistent:
        # pages: [\n        `...`,\n        `...` ... \n    ]
        
        # Build a regex to find the pages array for this specific book
        # We start searching from the title
        title_index = content.find(f'title: "{title}"')
        if title_index == -1:
            print(f"Book not found: {title}")
            continue
        
        pages_start = content.find('pages: [', title_index)
        if pages_start == -1:
            continue
        
        # Now find the end of the pages array (the matching ])
        # Since we know the structure has 90 pages and no nested arrays inside the strings (hopefully)
        # We look for the ] following the last backtick
        pages_end = content.find(']', pages_start)
        # But there are many ], we need the one that closes the pages array.
        # Since our pages array is followed by } and then );, we can look for that pattern.
        pages_end = content.find('\n    ]', pages_start) 
        
        pages_content = content[pages_start:pages_end]
        
        # Split into individual pages
        # Each page is wrapped in backticks and separated by comma and newline
        pages = re.findall(r'`([^`]*)`', pages_content)
        
        if len(pages) != 90:
            print(f"Warning: Book '{title}' has {len(pages)} pages instead of 90.")
        
        new_pages = []
        for i, page in enumerate(pages):
            page_num = i + 1
            # Keep header only for 1, 11, 21, 31, 41, 51, 61, 71, 81
            if page_num % 10 == 1:
                # Keep the header (it's already there)
                # But ensure it's at the very top (remove leading whitespace if any)
                page = page.lstrip()
                new_pages.append(page)
            else:
                # Remove the <h3>...</h3> part
                # Format: <h3>Page X: Subject</h3>\n<p>...</p>...
                new_page = re.sub(r'<h3>.*?</h3>\s*', '', page, flags=re.DOTALL).strip()
                new_pages.append(new_page)
        
        # Reconstruct the pages content
        new_pages_str = 'pages: [\n'
        for page in new_pages:
            new_pages_str += f'        `{page}`,\n'
        new_pages_str = new_pages_str.rstrip(',\n') + '\n' # Remove last comma and newline for the closing ] will be in content
        
        # Replace in original content
        content = content[:pages_start] + new_pages_str + content[pages_end:]

    with open('js/books.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_headers()
