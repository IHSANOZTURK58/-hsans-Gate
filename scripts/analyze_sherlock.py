import urllib.request
import re

def analyze_sherlock():
    url = "https://www.gutenberg.org/cache/epub/1661/pg1661.txt"
    print(f"Fetching {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            text = response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching book: {e}")
        return

    lines = text.splitlines()
    
    # Story titles in The Adventures of Sherlock Holmes
    # The actual headers in pg1661.txt look like "ADVENTURE I. A SCANDAL IN BOHEMIA"
    # or just "A SCANDAL IN BOHEMIA" after the TOC.
    
    found_stories = []
    
    # First, let's find where the body starts to avoid TOC
    body_start = 0
    for i, line in enumerate(lines):
        if "ADVENTURE I. A SCANDAL IN BOHEMIA" in line:
            # Check if it's the one in the body (usually preceded by many empty lines or a start marker)
            # Let's just take the last one found for each if there are multiple (TOC + Body)
            pass
            
    # Professional way: Look for the pattern in the body.
    # The body headers are usually ALL CAPS in many Gutenberg books.
    
    potential_titles = [
        "A SCANDAL IN BOHEMIA",
        "THE RED-HEADED LEAGUE",
        "A CASE OF IDENTITY",
        "THE BOSCOMBE VALLEY MYSTERY",
        "THE FIVE ORANGE PIPS",
        "THE MAN WITH THE TWISTED LIP",
        "THE ADVENTURE OF THE BLUE CARBUNCLE",
        "THE ADVENTURE OF THE SPECKLED BAND",
        "THE ADVENTURE OF THE ENGINEER’S THUMB",
        "THE ADVENTURE OF THE NOBLE BACHELOR",
        "THE ADVENTURE OF THE BERYL CORONET",
        "THE ADVENTURE OF THE COPPER BEECHES"
    ]

    for i, line in enumerate(lines):
        clean_line = line.strip().upper()
        if not clean_line: continue
        
        # Check for ADVENTURE X pattern
        if clean_line.startswith("ADVENTURE ") and "INDEX" not in clean_line:
             # Verify it contains one of our titles
             if any(t in clean_line for t in potential_titles):
                 found_stories.append((i, line.strip()))

    # Filter out duplicates (TOC vs Body)
    # The body ones are usually farther down. 
    # Let's keep headers that are at least 300 lines apart if they are the same title, 
    # or just skip the first 300 lines for detection.
    
    body_stories = [s for s in found_stories if s[0] > 100]

    print(f"\nFound {len(body_stories)} body story headers:")
    for idx, header in body_stories:
        print(f"Line {idx}: {header}")

    for i in range(len(body_stories)):
        start = body_stories[i][0]
        end = body_stories[i+1][0] if i+1 < len(body_stories) else len(lines)
        story_lines = end - start
        pages = (story_lines + 6) // 7
        print(f"Story {i+1}: {body_stories[i][1]} -> ~{pages} pages")

if __name__ == "__main__":
    analyze_sherlock()
