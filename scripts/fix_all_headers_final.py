import re

def find_matching_bracket(text, start_index):
    count = 0
    for i in range(start_index, len(text)):
        if text[i] == '[':
            count += 1
        elif text[i] == ']':
            count -= 1
            if count == 0:
                return i
    return -1

def fix_all_books():
    with open('js/books.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all books by searching for 'title:'
    books_data = []
    current_pos = 0
    while True:
        title_idx = content.find('title:', current_pos)
        if title_idx == -1:
            break
        
        # Find the pages: [ for this book
        pages_tag_idx = content.find('pages:', title_idx)
        if pages_tag_idx == -1:
            current_pos = title_idx + 6
            continue
            
        pages_start_bracket = content.find('[', pages_tag_idx)
        if pages_start_bracket == -1:
            current_pos = title_idx + 6
            continue
            
        pages_end_bracket = find_matching_bracket(content, pages_start_bracket)
        if pages_end_bracket == -1:
            current_pos = title_idx + 6
            continue
            
        # Get book title for header creation if missing
        title_match = re.search(r'title:\s*["\']([^"\']+)["\']', content[title_idx:pages_tag_idx])
        book_title = title_match.group(1) if title_match else "Story"
        
        books_data.append({
            "title": book_title,
            "start": pages_start_bracket + 1,
            "end": pages_end_bracket
        })
        current_pos = pages_end_bracket + 1

    print(f"Found {len(books_data)} books total.")
    
    # Process replacements from bottom to top
    new_content = content
    for book in reversed(books_data):
        pages_str = new_content[book['start']:book['end']]
        
        # Split into individual pages
        # Pages are wrapped in backticks
        pages = re.findall(r'`([^`]*)`', pages_str, re.DOTALL)
        
        if not pages:
            continue
            
        new_pages = []
        for i, page in enumerate(pages):
            page_num = i + 1
            should_have_header = (page_num % 10 == 1)
            
            # Find any header like <h3> or variations with spaces
            # <\s*h3\s*>.*?<\s*/\s*h3\s*>
            header_pattern = re.compile(r'<\s*h3\s*>.*?</\s*h3\s*>', re.IGNORECASE | re.DOTALL)
            header_match = header_pattern.search(page)
            
            if should_have_header:
                if header_match:
                    header_text = header_match.group(0)
                    # Normalize header: remove old text and create clean <h3>
                    # Actually, some might want to keep the subject.
                    # Let's extract subject: <h3>Page X: Subject</h3> -> Subject
                    subject_match = re.search(r'<\s*h3\s*>.*?:?\s*(.*?)</\s*h3\s*>', header_text, re.IGNORECASE | re.DOTALL)
                    subject = subject_match.group(1).strip() if subject_match else ""
                    # Remove "Page X:" prefix if it exists in subject
                    subject = re.sub(r'Page\s*\d+\s*:\s*', '', subject, flags=re.IGNORECASE).strip()
                    
                    if not subject: subject = book['title']
                    
                    clean_header = f"<h3>Page {page_num}: {subject}</h3>"
                    body = page.replace(header_text, '').strip()
                    new_page = f"{clean_header}\n{body}"
                else:
                    # Missing header
                    new_page = f"<h3>Page {page_num}: {book['title']}</h3>\n{page.strip()}"
                new_pages.append(new_page)
            else:
                # Remove header if exists
                if header_match:
                    new_page = page.replace(header_match.group(0), '').strip()
                else:
                    new_page = page.strip()
                new_pages.append(new_page)
        
        # Reconstruct pages block
        new_pages_str = '\n'
        for p in new_pages:
            new_pages_str += f'            `{p}`,\n'
        new_pages_str = new_pages_str.rstrip(',\n') + '\n        '
        
        new_content = new_content[:book['start']] + new_pages_str + new_content[book['end']:]

    with open('js/books.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Optimization complete.")

if __name__ == "__main__":
    fix_all_books()
