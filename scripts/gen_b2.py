import os

def generate_b2_books():
    books = []
    
    # Book 1: The Psychology of Dreams
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Subconscious Realms</h3><p>Human dreams have fascinated researchers for decades.</p><p>They represent the complex landscapes of our minds.</p><p>During REM sleep, the brain is extremely active now.</p><p>Neurotransmitters regulate the flow of binary imagery.</p><p>Some theories suggest dreams help process emotions.</p><p>Others believe they are random neural firings today.</p><p>The study of dreams remains a profound mystery now.</p>"
        elif i <= 60: content += "Symbolism and Insight</h3><p>Archetypes often appear in our nocturnal visions now.</p><p>Common symbols include falling, flying, or water.</p><p>Interpreting these requires a deep understanding now.</p><p>Cultural context significantly influences the meaning.</p><p>Lucid dreaming allows individuals to take control today.</p><p>This phenomenon bridges the gap between worlds now.</p><p>Scientific inquiry continues to explore these depths.</p>"
        else: content += "Cognitive Consolidation</h3><p>Dreams play a crucial role in memory retention today.</p><p>The brain organizes information during the night.</p><p>Sleep deprivation leads to cognitive decline fast.</p><p>Consistent sleep patterns improve mental clarity now.</p><p>Integrating dream insights can enhance creativity.</p><p>Our minds are vast incubators for future ideas today.</p><p>Embrace the silence of the night for restoration.</p>"
        pages.append(content)
    
    books.append({
        "title": "The Psychology of Dreams",
        "author": "Antigravity",
        "level": "B2",
        "cover": "🌙",
        "color": "#2c3e50",
        "description": "A deep dive into the mechanisms and meanings of sleep.",
        "pages": pages
    })

    # Book 2: Urban Legends of the 21st Century
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "The Digital Phantom</h3><p>In the age of social media, legends evolve fast.</p><p>Stories of haunted apps and websites spread now.</p><p>People claim to see glitches in reality itself today.</p><p>The blurry line between physical and digital world.</p><p>Creepypastas have become the new folklore now today.</p><p>Anonymous users post cryptic messages at midnight.</p><p>The collective imagination creates new monsters today.</p>"
        elif i <= 60: content += "The Echo Chamber</h3><p>Rumors gain momentum through viral transmission now.</p><p>Confirmation bias fuels the belief in the weird.</p><p>Alleged sightings are captured on shaky cameras.</p><p>Debunkers try to explain the strange occurrences.</p><p>But the mystery persists in the dark corners today.</p><p>Atmospheric horror is redefined by the screens.</p><p>The psychological impact of these tales is real now.</p>"
        else: content += "The Forgotten Server</h3><p>Legend tells of a server that hosts lost data today.</p><p>Files that were deleted but never truly gone now.</p><p>Hackers speak of a gateway to an archived past.</p><p>A digital graveyard where secrets stay forever now.</p><p>Be careful what you download from the unknown today.</p><p>Some things are better left in the bitbucket now.</p><p>The 21st century has its own shadows and ghosts.</p>"
        pages.append(content)
    
    books.append({
        "title": "Urban Legends of the 21st Century",
        "author": "Antigravity",
        "level": "B2",
        "cover": "👻",
        "color": "#7f8c8d",
        "description": "Modern myths and digital folklore for the internet age.",
        "pages": pages
    })

    # Book 3: The Impact of Social Media on Youth
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Social Connectivity</h3><p>Smartphones have redefined human interaction today.</p><p>Younger generations are constantly connected now.</p><p>Peer validation is measured in likes and shares now.</p><p>This creates an unprecedented social environment.</p><p>The pressure to maintain a perfect image is high.</p><p>Instant gratification influences behavioral habits.</p><p>Digital identity becomes as important as real life.</p>"
        elif i <= 60: content += "The Filtered Reality</h3><p>Curated feeds present a distorted view of life today.</p><p>Comparison leads to feelings of inadequacy now fast.</p><p>Algorithm-driven content shapes personal opinions.</p><p>Critical thinking is essential in this digital era.</p><p>Cyberbullying remains a significant challenge today.</p><p>Empathy is sometimes lost in the text-based chat.</p><p>We must promote healthy digital citizenship now today.</p>"
        else: content += "Building Resilience</h3><p>Education is key to navigating the online world.</p><p>Developing a balanced relationship with technology.</p><p>Setting boundaries for screen time is necessary now.</p><p>Focusing on authentic real-world connections today.</p><p>Social media can be a tool for positive change now.</p><p>Youth are utilizing platforms for global activism.</p><p>The future depends on our digital literacy today now.</p>"
        pages.append(content)
    
    books.append({
        "title": "The Impact of Social Media on Youth",
        "author": "Antigravity",
        "level": "B2",
        "cover": "📱",
        "color": "#1abc9c",
        "description": "A sociological analysis of technology and society.",
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
    b2_books = generate_b2_books()
    with open("js/books.js", "a", encoding="utf-8") as f:
        for book in b2_books:
            f.write("\n" + format_js_book(book))
    print("B2 books generated and appended.")
