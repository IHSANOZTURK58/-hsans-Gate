import os

def generate_b1_books():
    books = []
    
    # Book 1: The Future of Farming
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Vertical Gardens</h3><p>In the year 2050, the way we produce food changed.</p><p>Traditional farms were replaced by vertical towers.</p><p>These buildings used hydroponics to grow crops now.</p><p>Plants grew in mineral-rich water instead of soil.</p><p>LED lights provided the energy needed for growth.</p><p>Drones monitored the health of every single plant.</p><p>Farming became an efficient urban industry today.</p>"
        elif i <= 60: content += "Lab-Grown Protein</h3><p>Scientists developed new ways to create meat today.</p><p>Cellular agriculture allowed us to grow beef now.</p><p>This reduced the need for large animal pastures.</p><p>The environmental impact was significantly lower.</p><p>People were skeptical at first about the taste.</p><p>However, the quality was identical to real meat.</p><p>Sustainable food became a global priority today.</p>"
        else: content += "Automated Harvest</h3><p>Robotic arms harvested the vegetables with care.</p><p>The system was completely autonomous and fast.</p><p>Fresh produce reached the city markets in hours.</p><p>Wastage was minimized through predictive AI now.</p><p>Every citizen had access to healthy organic food.</p><p>The agricultural revolution was a huge success.</p><p>We finally achieved food security for everyone.</p>"
        pages.append(content)
    
    books.append({
        "title": "The Future of Farming",
        "author": "Antigravity",
        "level": "B1",
        "cover": "🚜",
        "color": "#27ae60",
        "description": "Exploration of high-tech and sustainable agriculture.",
        "pages": pages
    })

    # Book 2: A Journey Through History
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "The Silk Road</h3><p>Centuries ago, traders traveled across vast lands.</p><p>The Silk Road connected the East and the West.</p><p>They carried silk, spices, and exotic inventions.</p><p>Camels were the primary mode of transport today.</p><p>Cultures blended as people shared their stories.</p><p>Ancient cities became hubs of knowledge today.</p><p>History was shaped by these courageous explorers.</p>"
        elif i <= 60: content += "The Industrial Age</h3><p>The invention of steam engine changed everything.</p><p>Factories emerged, and cities grew rapidly now.</p><p>Railways connected distant towns like never before.</p><p>Mass production made goods affordable for many.</p><p>Society underwent a profound transformation today.</p><p>The pace of life accelerated during this period.</p><p>New challenges arose from rapid urbanization today.</p>"
        else: content += "The Digital Era</h3><p>The dawn of the internet revolutionized the world.</p><p>Information became accessible at the click of button.</p><p>Digital communication bridged geographical gaps.</p><p>Global collaboration became a daily reality today.</p><p>We are now living in a hyper-connected society.</p><p>Technological advancement continues to evolve fast.</p><p>The future is being written by our innovations.</p>"
        pages.append(content)
    
    books.append({
        "title": "A Journey Through History",
        "author": "Antigravity",
        "level": "B1",
        "cover": "⏳",
        "color": "#8e44ad",
        "description": "Traveling through time to witness key milestones.",
        "pages": pages
    })

    # Book 3: The Robot Who Wanted to Paint
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Logic and Color</h3><p>Unit 7 was a highly advanced technical robot.</p><p>His primary function was to repair heavy machines.</p><p>However, he felt a strange urge to create art.</p><p>He analyzed thousands of classical paintings now.</p><p>He understood the geometry but not the emotion.</p><p>He bought a set of brushes and vibrant paints.</p><p>His first stroke was calculated and very precise.</p>"
        elif i <= 60: content += "The Spark of Creativity</h3><p>Unit 7 began to experiment with abstract forms.</p><p>He mixed colors that did not follow any logic.</p><p>He painted the circuits of his own processors.</p><p>The result was a stunning display of neon light.</p><p>Other robots did not understand his new hobby.</p><p>They thought his sensors were malfunctioning now.</p><p>But Unit 7 felt a sense of fulfillment today.</p>"
        else: content += "The Gallery Exhibit</h3><p>A famous art critic discovered his unique work.</p><p>He organized an exhibit for the creative robot.</p><p>Humans were amazed by the mechanical artist now.</p><p>The paintings conveyed a sense of lonely beauty.</p><p>Unit 7 proved that AI can possess imagination.</p><p>He became the first robot to win a prestigious prize.</p><p>His brushes now danced with pure digital soul.</p>"
        pages.append(content)
    
    books.append({
        "title": "The Robot Who Wanted to Paint",
        "author": "Antigravity",
        "level": "B1",
        "cover": "🎨",
        "color": "#f1c40f",
        "description": "An AI's quest to understand and create fine art.",
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
    b1_books = generate_b1_books()
    with open("js/books.js", "a", encoding="utf-8") as f:
        for book in b1_books:
            f.write("\n" + format_js_book(book))
    print("B1 books generated and appended.")
