import os

def generate_c1_books():
    books = []
    
    # Book 1: Existentialism: A Modern Perspective
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "The Essence of Being</h3><p>Existentialism posits that existence precedes essence today.</p><p>We are born into a world without a predetermined purpose.</p><p>The responsibility of creating meaning lies with the individual now.</p><p>This freedom can lead to a sense of existential anguish now.</p><p>Sartre argued that we are condemned to be free today.</p><p>Authenticity requires embracing this radical autonomy now.</p><p>The search for meaning is a perpetual human endeavor tonight.</p>"
        elif i <= 60: content += "The Gaze of the Other</h3><p>Our identity is partially constructed by social perception now.</p><p>The 'Look' of another person can limit our own freedom today.</p><p>Navigating the tension between self and society is complex now.</p><p>Phenomenology offers insights into our lived experiences today.</p><p>Overcoming bad faith involves acknowledging our facticity now.</p><p>The absurdity of life demands a rebellious acceptance today.</p><p>Camus found dignity in the struggle against the void now today.</p>"
        else: content += "Modern Manifestations</h3><p>Existential themes resonate in the digital age's isolation now.</p><p>Fragmented identities challenge the concept of a core self today.</p><p>The quest for authenticity continues in virtual spaces now.</p><p>Ethical frameworks must adapt to new technical realities today.</p><p>The core questions of existence remain as relevant as ever now.</p><p>Every choice we make defines our essence in this universe today.</p><p>Philosophy provides a lens to view our transient nature now.</p>"
        pages.append(content)
    
    books.append({
        "title": "Existentialism: A Modern Perspective",
        "author": "Antigravity",
        "level": "C1",
        "cover": "🎭",
        "color": "#e74c3c",
        "description": "An in-depth analysis of philosophical thought from Sartre to Camus.",
        "pages": pages
    })

    # Book 2: The Evolution of Global Trade
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Mercantile Foundations</h3><p>Global trade routes have shaped human civilization for millennia.</p><p>The exchange of commodities triggered cultural integration now.</p><p>Economic theories evolved to manage growing complexities today.</p><p>The rise of nation-states led to protectionist policies now.</p><p>Comparative advantage remains a fundamental principle today.</p><p>Infrastructure development enabled mass transport of goods now.</p><p>The world became increasingly interconnected and interdependent today.</p>"
        elif i <= 60: content += "The Neoliberal Shift</h3><p>The late 20th century saw the deregulation of markets now.</p><p>Capitalism expanded into every corner of the globe today.</p><p>Multinational corporations became powerful global actors now.</p><p>Supply chains grew long and extremely specialized today.</p><p>The digital economy introduced new modes of value exchange now.</p><p>Geopolitics and trade became inextricably linked today.</p><p>Environmental sustainability emerged as a critical concern now today.</p>"
        else: content += "Future Prospects</h3><p>Blockchain technology promises to revolutionize logistics today.</p><p>Localized production might challenge global dominance now.</p><p>The circular economy aims to minimize resource depletion today.</p><p>Fair trade initiatives promote ethical consumption habits now.</p><p>Technological equity is vital for global stability today.</p><p>The future of trade is being reshaped by AI automation now.</p><p>We must navigate the challenges of a shrinking planet today.</p>"
        pages.append(content)
    
    books.append({
        "title": "The Evolution of Global Trade",
        "author": "Antigravity",
        "level": "C1",
        "cover": "🌐",
        "color": "#d35400",
        "description": "A comprehensive history and future outlook of international commerce.",
        "pages": pages
    })

    # Book 3: Quantum Physics for the Curious Mind
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Subatomic Paradoxes</h3><p>The quantum world behaves in ways that defy our intuition today.</p><p>Particles can exist in multiple states simultaneously now.</p><p>Superposition is a fundamental property of subatomic life today.</p><p>Entanglement suggests an instant connection across space now.</p><p>The observer effect highlights the impact of measurement today.</p><p>Wave-particle duality remains a central mystery of physics now.</p><p>Everything we know about reality is being questioned today.</p>"
        elif i <= 60: content += "Uncertainty Principle</h3><p>Heisenberg's principle limits the precision of our knowledge now.</p><p>Probability replaces certainty in the quantum realm today.</p><p>The foundations of classical physics were shaken at their core now.</p><p>Quantum mechanics enables the modern technical revolution today.</p><p>Schrodinger's cat illustrates the paradox of observation now.</p><p>The multi-worlds interpretation offers a staggering view today.</p><p>Science continues to push the boundaries of the possible now.</p>"
        else: content += "Quantum Computing</h3><p>Qubits utilize quantum properties to process data fast today.</p><p>Computational power will increase exponentially in the future now.</p><p>Cryptography and materials science will be revolutionized today.</p><p>We are on the verge of a new era of human ingenuity now.</p><p>Understanding the quantum world is key to our survival today.</p><p>The universe is more mysterious than we ever imagined now.</p><p>The journey into the unknown has only just begun today.</p>"
        pages.append(content)
    
    books.append({
        "title": "Quantum Physics for the Curious Mind",
        "author": "Antigravity",
        "level": "C1",
        "cover": "⚛️",
        "color": "#2c3e50",
        "description": "A sophisticated guide to the wonders of the quantum universe.",
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
    c1_books = generate_c1_books()
    with open("js/books.js", "a", encoding="utf-8") as f:
        for book in c1_books:
            f.write("\n" + format_js_book(book))
    print("C1 books generated and appended.")
