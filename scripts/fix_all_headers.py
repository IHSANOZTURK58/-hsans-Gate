import re
import os

def fix_all_book_headers():
    with open('js/books.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find each book block
    # Note: Handles variations in window.BOOK_DATA and spaces
    book_pattern = re.compile(r'(window\.)?BOOK_DATA\["([A-Z0-9]+)"\]\.push\(\{.*?title:\s*"([^"]+)"(.*?)pages:\s*\[(.*?)\]\s*\}\s*\);?', re.DOTALL)
    
    matches = list(book_pattern.finditer(content))
    print(f"Found {len(matches)} books.")
    
    # We will build the new content by replacing the pages blocks
    # We use a list of replacements (start, end, new_text) and apply them in reverse
    replacements = []
    
    for match in matches:
        title = match.group(3)
        pages_block = match.group(5)
        
        # Split pages_block into individual pages
        # Pages are typically wrapped in backticks
        pages = re.findall(r'`([^`]*)`', pages_block, re.DOTALL)
        
        if not pages:
            # Maybe they are not in backticks? Checking for double quotes
            pages = re.findall(r'"([^"]*)"', pages_block, re.DOTALL)
            
        if not pages:
            print(f"No pages found for book: {title}")
            continue
            
        new_pages = []
        for i, page in enumerate(pages):
            page_num = i + 1
            
            # Find any header like <h3>...</h3>, < h3 >...< / h3 >, etc.
            header_match = re.search(r'<\s*h3\s*>.*?</\s*h3\s*>', page, re.IGNORECASE | re.DOTALL)
            
            should_have_header = (page_num % 10 == 1)
            
            if should_have_header:
                if header_match:
                    header = header_match.group(0)
                    # Normalize header: remove spaces in tags and ensure at top
                    normalized_header = re.sub(r'<\s*/?\s*h3\s*>', lambda m: '<h3>' if '/' not in m.group(0) else '</h3>', header, flags=re.IGNORECASE)
                    # Remove the old header and spaces
                    page_body = page.replace(header, '').strip()
                    new_page = f"{normalized_header}\n{page_body}"
                else:
                    # Missing header! Create one
                    new_page = f"<h3>Page {page_num}: {title}</h3>\n{page.strip()}"
                new_pages.append(new_page)
            else:
                # Should NOT have a header
                if header_match:
                    new_page = page.replace(header_match.group(0), '').strip()
                else:
                    new_page = page.strip()
                new_pages.append(new_page)
        
        # Reconstruct the pages block
        new_pages_block = '\n'
        for p in new_pages:
            new_pages_block += f'        `{p}`,\n'
        new_pages_block = new_pages_block.rstrip(',\n') + '\n    '
        
        replacements.append((match.start(5), match.end(5), new_pages_block))

    # Apply replacements in reverse order
    new_content = content
    for start, end, new_text in sorted(replacements, key=lambda x: x[0], reverse=True):
        new_content = new_content[:start] + new_text + new_content[end:]

    with open('js/books.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("All books fixed.")

if __name__ == "__main__":
    fix_all_book_headers()
