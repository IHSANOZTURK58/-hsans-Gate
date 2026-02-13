import urllib.request
import re

def find_headers():
    url = "https://www.gutenberg.org/cache/epub/1661/pg1661.txt"
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    lines = text.splitlines()
    
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
    
    found = []
    # Skip first 100 lines to avoid TOC
    for i in range(100, len(lines)):
        line = lines[i].strip()
        # Look for "X. TITLE"
        for title in potential_titles:
            if line.endswith(title):
                # Check if it starts with Roman numeral
                if re.match(r"^[IVXLCDM]+\.\s+" + re.escape(title) + r"$", line):
                    found.append((i, line))
                    break
    
    print(f"Found {len(found)} headers:")
    for idx, header in found:
        print(f"Line {idx}: {header}")

if __name__ == "__main__":
    find_headers()
