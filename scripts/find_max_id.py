import re

def get_max_id():
    max_id = 0
    with open("js/words.js", "r", encoding="utf-8") as f:
        for line in f:
            match = re.search(r'\"id\":\s*(\d+)', line)
            if match:
                val = int(match.group(1))
                if val > max_id:
                    max_id = val
    return max_id

if __name__ == "__main__":
    print(get_max_id())
