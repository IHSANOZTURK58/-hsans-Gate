
import urllib.request
import re

url = "https://www.gutenberg.org/cache/epub/236/pg236.txt"
try:
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    headers = [
        "Mowgli’s Brothers",
        "Kaa’s Hunting",
        "“Tiger! Tiger!”",
        "The White Seal",
        "“Rikki-Tikki-Tavi”",
        "Toomai of the Elephants",
        "Her Majesty’s Servants"
    ]
    
    lines = text.split('\n')
    for i, l in enumerate(lines):
        for h in headers:
            if h in l:
                print(f"{i}: {h}")
except Exception as e:
    print(f"Error: {e}")
