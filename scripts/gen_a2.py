import os

def generate_a2_books():
    books = []
    
    # Book 1: The Mystery of the Old Clock
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "The Strange Sound</h3><p>Tom found an old clock in the attic yesterday.</p><p>The clock was very large and made of dark wood.</p><p>It did not work, but it made a ticking sound.</p><p>Tom was curious about the hidden mechanism inside.</p><p>He opened the back of the clock with a tool.</p><p>Inside, he found a small golden key today.</p><p>What did this mysterious key open in the house?</p>"
        elif i <= 60: content += "Hidden Secrets</h3><p>He tried the key on every door in the house.</p><p>Finally, he found a small box in the basement.</p><p>The key fit perfectly into the tiny lock today.</p><p>Inside the box, there was an old letter now.</p><p>The letter was from his grandfather many years ago.</p><p>It spoke of a treasure buried in the garden.</p><p>Tom felt like a real detective solving a case.</p>"
        else: content += "The Treasure Found</h3><p>Tom took a shovel to the big oak tree today.</p><p>He dug into the earth for almost an hour now.</p><p>He hit something hard with his metal shovel.</p><p>It was a small chest filled with old coins.</p><p>There were also some beautiful family photos.</p><p>The clock led him to a wonderful surprise today.</p><p>He placed the clock in his room proudly now.</p>"
        pages.append(content)
    
    books.append({
        "title": "The Mystery of the Old Clock",
        "author": "Antigravity",
        "level": "A2",
        "cover": "🕰️",
        "color": "#e67e22",
        "description": "Tom discovers a secret hidden inside an antique clock.",
        "pages": pages
    })

    # Book 2: A Weekend in the Mountains
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "The Long Drive</h3><p>We packed our bags for a trip to mountains.</p><p>The drive took five hours through the country.</p><p>I saw many cows and horses on the way today.</p><p>The air became fresher as we climbed higher.</p><p>We finally reached our small wooden cabin now.</p><p>It was very quiet and peaceful in the forest.</p><p>We started a fire in the fireplace tonight.</p>"
        elif i <= 60: content += "Climbing Higher</h3><p>We woke up early to go for a long hike today.</p><p>The trail was steep and full of grey rocks.</p><p>We saw a mountain goat on a high cliff today.</p><p>We reached the top and saw the whole valley.</p><p>The view was incredible from the mountain peak.</p><p>We ate our sandwiches while watching eagle.</p><p>Everything looked so small from up there today.</p>"
        else: content += "Starry Night</h3><p>The night sky was filled with bright stars.</p><p>We sat outside and looked at the Milky Way.</p><p>Father told us stories about the constellations.</p><p>It was cold, so we used warm blankets tonight.</p><p>I saw a shooting star and made a wish now.</p><p>The mountains are a magical place for a trip.</p><p>I want to stay here for another week today.</p>"
        pages.append(content)
    
    books.append({
        "title": "A Weekend in the Mountains",
        "author": "Antigravity",
        "level": "A2",
        "cover": "🏔️",
        "color": "#95a5a6",
        "description": "An adventurous weekend exploring nature and the peaks.",
        "pages": pages
    })

    # Book 3: The Space Explorer's Diary
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Launch Day</h3><p>Today is the day I leave Earth behind now.</p><p>The rocket is standing tall on the platform.</p><p>I feel nervous but also very brave today.</p><p>The engines started with a very loud roar.</p><p>Everything shook as we went into the clouds.</p><p>Suddenly, the sky turned black and quiet now.</p><p>I can see the blue Earth from my window today.</p>"
        elif i <= 60: content += "Zero Gravity</h3><p>Floating in the spaceship is very strange.</p><p>My food and water move in the air today.</p><p>I have to catch my spoon before it flies.</p><p>I looked at the Moon through the glass today.</p><p>The stars are much brighter without clouds.</p><p>I am moving towards the Red Planet now.</p><p>Mars is waiting for me to land there today.</p>"
        else: content += "The First Step</h3><p>Our spaceship landed on the dusty Mars now.</p><p>I stepped out onto the orange surface today.</p><p>The ground is covered in red and brown sand.</p><p>I placed a flag to show we were here today.</p><p>I collected some rocks for the scientists.</p><p>Being an astronaut is the best job ever now.</p><p>I will record everything in my diary today.</p>"
        pages.append(content)
    
    books.append({
        "title": "The Space Explorer's Diary",
        "author": "Antigravity",
        "level": "A2",
        "cover": "🚀",
        "color": "#2980b9",
        "description": "A personal account of a journey to the red planet.",
        "pages": pages
    })
    
    return books

def format_js_book(book):
    js = f"window.BOOK_DATA[\"{book['level']}\"].push({{\n"
    js += f"    title: \"{book['title']}\",\n"
    js += f"    author: \"{book['author']}\",\n"
    js += f"    level: \"{book['level']}\",\n"
    js += f"    cover: \"{book['cover']}\",\n"
    js += f"    color: \"{book['color']}\",\n"
    js += f"    description: \"{book['description']}\",\n"
    js += "    pages: [\n"
    for page in book['pages']:
        js += f"        `{page}`,\n"
    js = js.rstrip(',\n') + "\n    ]\n});\n"
    return js

if __name__ == "__main__":
    a2_books = generate_a2_books()
    with open("js/books.js", "a", encoding="utf-8") as f:
        for book in a2_books:
            f.write("\n" + format_js_book(book))
    print("A2 books generated and appended.")
