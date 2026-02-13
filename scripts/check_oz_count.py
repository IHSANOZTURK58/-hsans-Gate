
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/55/pg55.txt"
try:
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK THE WONDERFUL WIZARD OF OZ ***"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK THE WONDERFUL WIZARD OF OZ ***"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        content = text[start_idx + len(start_marker):end_idx]
    else:
        content = text
        
    paragraphs = [p.strip() for p in content.split('\n') if p.strip()]
    total_lines = 0
    chapters = []
    
    # Roman numeral regex with optional spaces
    roman_regex = r'^Chapter\s+[IVXLCDM]+\..*$'
    
    for p in paragraphs:
        if re.match(roman_regex, p, re.IGNORECASE):
            chapters.append({"title": p, "start_line": total_lines})
            
        sentences = re.split(r'(?<=[.!?]) +', p)
        total_lines += len([s for s in sentences if s.strip()])
        
    print(f"Total Lines: {total_lines}")
    midpoint_line = total_lines // 2
    for i, ch in enumerate(chapters):
        if abs(ch['start_line'] - midpoint_line) < 1000: # Show a range around the middle
             print(f"Chapter: {ch['title']} at line {ch['start_line']} (Page {ch['start_line'] // 7 + 1})")
except Exception as e:
    print(f"Error: {e}")
