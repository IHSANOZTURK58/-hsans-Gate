import urllib.request

def debug_book():
    url = "https://www.gutenberg.org/cache/epub/1661/pg1661.txt"
    with urllib.request.urlopen(url) as response:
        text = response.read().decode('utf-8')
    
    lines = text.splitlines()
    print("--- FIRST 500 LINES ---")
    for i in range(min(len(lines), 500)):
        print(f"{i}: {lines[i]}")

if __name__ == "__main__":
    debug_book()
