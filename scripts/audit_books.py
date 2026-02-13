import re
import json

def audit_books():
    with open('js/books.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all level arrays
    levels = ["A1", "A2", "B1", "B2", "C1"]
    report = []
    
    for level in levels:
        # This is a bit complex as books are pushed individually.
        # We'll look for all push({ ... }) blocks.
        # A simple way is to find all 'title: "..."' occurrences and then their pages.
        
        matches = re.finditer(r'title:\s*"([^"]+)"', content)
        for match in matches:
            title = match.group(1)
            title_pos = match.start()
            
            # Find the pages array for this book
            pages_match = re.search(r'pages:\s*\[', content[title_pos:])
            if not pages_match:
                continue
            
            pages_start = title_pos + pages_match.end()
            
            # Find the end of this pages array (approximate)
            # We look for the closing ] followed by } and then ); or window.BOOK_DATA
            pages_end_match = re.search(r'\]\s*\}\s*\);|\]\s*\}\s*,', content[pages_start:])
            if not pages_end_match:
                # Last book might not have a comma
                pages_end_match = re.search(r'\]\s*\}', content[pages_start:])
            
            if not pages_end_match:
                continue
                
            pages_end = pages_start + pages_end_match.start()
            pages_content = content[pages_start:pages_end]
            
            # Extract individual pages (strings between backticks)
            pages = re.findall(r'`([^`]*)`', pages_content, re.DOTALL)
            
            issues = []
            if not pages:
                issues.append("No pages found")
            else:
                # Check Page 1
                if '<h3>' not in pages[0]:
                    issues.append("Page 1 missing <h3> title")
                elif not pages[0].strip().startswith('<h3>'):
                    issues.append("Page 1 title not at the very top")
                
                # Check every 10th page (11, 21, etc.)
                for i in range(10, len(pages), 10):
                    page_num = i + 1
                    if '<h3>' not in pages[i]:
                        issues.append(f"Page {page_num} missing <h3> title")
                    elif not pages[i].strip().startswith('<h3>'):
                        issues.append(f"Page {page_num} title not at the very top")
            
            if issues:
                report.append({
                    "title": title,
                    "level": level, # Note: this level might be wrong if title is found in wrong section, but it's okay for reporting
                    "issues": issues
                })
    
    return report

if __name__ == "__main__":
    report = audit_books()
    if not report:
        print("No issues found.")
    else:
        print(f"Found {len(report)} books with issues:")
        print(json.dumps(report, indent=2))
