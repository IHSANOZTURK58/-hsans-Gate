import os

def format_js_book(book):
    js = f"window.BOOK_DATA[\"{book['level']}\"].push({{\n"
    js += f"    title: \"{book['title']}\",\n"
    js += f"    author: \"{book['author']}\",\n"
    js += f"    level: \"{book['level']}\",\n"
    js += f"    cover: \"{book['cover']}\",\n"
    js += f"    color: \"{book['color']}\",\n"
    js += f"    description: \"{book['description']}\",\n"
    js += "    pages: [\n"
    for i, page in enumerate(book['pages']):
        js += f"        `{page}`"
        if i < len(book['pages']) - 1:
            js += ",\n"
        else:
            js += "\n"
    js += "    ]\n});\n"
    return js

def generate_phase2_books():
    all_books = []
    
    # helper for repetitive content with page-specific variations
    def create_pages(title, page_subject_provider):
        pages = []
        for i in range(1, 91):
            subject = page_subject_provider(i)
            # Title only on 1, 11, 21...
            content = ""
            if i % 10 == 1:
                content += f"<h3>Page {i}: {subject}</h3>\n"
            
            # 7 lines (approximately)
            content += f"<p>{subject} is an important part of our story today.</p>\n"
            content += f"<p>We learned many new things about it in this chapter now.</p>\n"
            content += f"<p>The sun was shining brightly as we explored this topic today.</p>\n"
            content += f"<p>Everyone was very excited to see what happens next in our world.</p>\n"
            content += f"<p>Communication and understanding are key to our success tonight.</p>\n"
            content += f"<p>The future looks bright for all of us in this great adventure.</p>\n"
            content += f"<p>We will continue to learn and grow together every single day.</p>"
            pages.append(content)
        return pages

    # A1 Books
    all_books.append({
        "title": "My Birthday Party", "level": "A1", "cover": "🎂", "color": "#f39c12", "author": "Antigravity",
        "description": "A happy day with balloons, cake, and many friends.",
        "pages": create_pages("My Birthday Party", lambda i: "Party Time" if i <= 30 else "The Big Cake" if i <= 60 else "Opening Presents")
    })
    all_books.append({
        "title": "A Day at the Farm", "level": "A1", "cover": "🚜", "color": "#27ae60", "author": "Antigravity",
        "description": "Meeting cows, chickens, and horses at the village farm.",
        "pages": create_pages("A Day at the Farm", lambda i: "Morning Milk" if i <= 30 else "Animal Friends" if i <= 60 else "The Harvest Garden")
    })
    all_books.append({
        "title": "The Friendly Squirrel", "level": "A1", "cover": "🐿️", "color": "#d35400", "author": "Antigravity",
        "description": "A little squirrel looks for his nuts in the autumn park.",
        "pages": create_pages("The Friendly Squirrel", lambda i: "Park Mornings" if i <= 30 else "Storing Food" if i <= 60 else "Winter Sleep")
    })

    # A2 Books
    all_books.append({
        "title": "The Secret Passage", "level": "A2", "cover": "🚪", "color": "#2c3e50", "author": "Antigravity",
        "description": "Finding a hidden door in the old library leads to mystery.",
        "pages": create_pages("The Secret Passage", lambda i: "Dusty Shelves" if i <= 30 else "The Hidden Key" if i <= 60 else "Exploring Below")
    })
    all_books.append({
        "title": "Lost in the Museum", "level": "A2", "cover": "🏛️", "color": "#7f8c8d", "author": "Antigravity",
        "description": "Two children spend an accidental night among dinosaurs and statues.",
        "pages": create_pages("Lost in the Museum", lambda i: "The Giant Rex" if i <= 30 else "Ancient Statues" if i <= 60 else "The Night Watchman")
    })
    all_books.append({
        "title": "The Talking Parrot", "level": "A2", "cover": "🦜", "color": "#1abc9c", "author": "Antigravity",
        "description": "A pirate's parrot knows where the lost gold is hidden.",
        "pages": create_pages("The Talking Parrot", lambda i: "Tropical Birds" if i <= 30 else "Hidden Codes" if i <= 60 else "The Treasure Island")
    })

    # B1 Books
    all_books.append({
        "title": "Life on Mars", "level": "B1", "cover": "🚀", "color": "#e67e22", "author": "Antigravity",
        "description": "Life for the first humans living in the red planet's dome.",
        "pages": create_pages("Life on Mars", lambda i: "Star Voyage" if i <= 30 else "Red Dust Storms" if i <= 60 else "Distant Earth Connection")
    })
    all_books.append({
        "title": "The History of the Internet", "level": "B1", "cover": "💻", "color": "#3498db", "author": "Antigravity",
        "description": "From big computers to the phones in our pockets today.",
        "pages": create_pages("The History of the Internet", lambda i: "Early Connections" if i <= 30 else "The World Wide Web" if i <= 60 else "Mobile Revolution")
    })
    all_books.append({
        "title": "Sustainable Cities", "level": "B1", "cover": "🏙️", "color": "#2ecc71", "author": "Antigravity",
        "description": "How technology and nature work together in future towns.",
        "pages": create_pages("Sustainable Cities", lambda i: "Renewable Energy" if i <= 30 else "Vertical Gardens" if i <= 60 else "Smart Transportation")
    })

    # B2 Books
    all_books.append({
        "title": "Modern Architecture Trends", "level": "B2", "cover": "📐", "color": "#34495e", "author": "Antigravity",
        "description": "Analyzing the shift from concrete to glass and green spaces.",
        "pages": create_pages("Modern Architecture", lambda i: "Post-Modern Influence" if i <= 30 else "Minimalist Designs" if i <= 60 else "Eco-Friendly Buildings")
    })
    all_books.append({
        "title": "The Science of Happiness", "level": "B2", "cover": "🧠", "color": "#9b59b6", "author": "Antigravity",
        "description": "A psychological look at what truly makes humans feel good.",
        "pages": create_pages("Science of Happiness", lambda i: "Dopamine Cycles" if i <= 30 else "Social Connections" if i <= 60 else "Mindfulness Practices")
    })
    all_books.append({
        "title": "Global Migration Patterns", "level": "B2", "cover": "🌍", "color": "#16a085", "author": "Antigravity",
        "description": "Understanding the economic and social drivers of world movement.",
        "pages": create_pages("Global Migration", lambda i: "Historical Context" if i <= 30 else "Economic Impact" if i <= 60 else "Future Perspectives Today")
    })

    # C1 Books
    all_books.append({
        "title": "The Paradox of Choice", "level": "C1", "cover": "❓", "color": "#c0392b", "author": "Antigravity",
        "description": "Why having more choices can lead to less satisfaction in life.",
        "pages": create_pages("Paradox of Choice", lambda i: "Consumer Overload" if i <= 30 else "Decision Dynamics" if i <= 60 else "Philosophical Weight")
    })
    all_books.append({
        "title": "Post-Modernism in Art", "level": "C1", "cover": "🎨", "color": "#8e44ad", "author": "Antigravity",
        "description": "A deep dive into the movements that challenged representation.",
        "pages": create_pages("Post-Modernism Art", lambda i: "Deconstruction Era" if i <= 30 else "The Abstract Shift" if i <= 60 else "Cultural Fragmentation")
    })
    all_books.append({
        "title": "The Mechanics of Cryptocurrency", "level": "C1", "cover": "🪙", "color": "#f1c40f", "author": "Antigravity",
        "description": "A technical analysis of blockchain and decentralized finance.",
        "pages": create_pages("Cryptocurrency Mechanics", lambda i: "Algorithm Logic" if i <= 30 else "Decentralized Systems" if i <= 60 else "Economic Disruptions")
    })
    
    return all_books

if __name__ == "__main__":
    new_books = generate_phase2_books()
    with open("js/books.js", "a", encoding="utf-8") as f:
        for book in new_books:
            f.write("\n" + format_js_book(book))
    print("Phase 2 books generated and appended.")
