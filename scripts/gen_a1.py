import os

def generate_a1_books():
    books = []
    
    # Book 1: The Red Kitten's Adventure
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 10: content += "The Little Kitten</h3><p>Once there was a small red kitten.</p><p>His name was Sparky.</p><p>Sparky lived in a big house.</p><p>He had a soft blue bed.</p><p>Sparky loved to drink warm milk.</p><p>He played with a yellow ball.</p><p>Every morning he looked out the window.</p>"
        elif i <= 20: content += "The Garden Gate</h3><p>One day the door was open.</p><p>Sparky walked out into the garden.</p><p>The grass was green and soft.</p><p>He saw a colorful butterfly.</p><p>The butterfly flew over the gate.</p><p>Sparky wanted to catch it.</p><p>He hopped over the wooden fence.</p>"
        elif i <= 30: content += "Into the Woods</h3><p>Now Sparky was in the forest.</p><p>The trees were very tall.</p><p>He heard a bird singing.</p><p>The sun was behind the clouds.</p><p>Sparky walked on the brown leaves.</p><p>He felt a little bit cold.</p><p>Where was his warm house now?</p>"
        elif i <= 40: content += "A New Friend</h3><p>He met a friendly grey rabbit.</p><p>'Hello', said the little kitten.</p><p>The rabbit looked at his ears.</p><p>Do you want some carrots?'</p><p>'No thank you', said Sparky.</p><p>'I am looking for my home.'</p><p>The rabbit pointed to the hill.</p>"
        elif i <= 50: content += "The Rain Falls</h3><p>Suddenly the sky became dark.</p><p>Big raindrops started to fall.</p><p>Sparky found a large leaf.</p><p>He stayed under the dry leaf.</p><p>The rain made a loud sound.</p><p>He missed his blue bed.</p><p>He waited for the sun today.</p>"
        elif i <= 60: content += "The Night Sky</h3><p>The stars appeared in the sky.</p><p>The moon was big and white.</p><p>Sparky sat under a tree.</p><p>He was very tired and sleepy.</p><p>He dreamed of his mother cat.</p><p>A wise old owl watched him.</p><p>'Don't worry', the owl hooted.</p>"
        elif i <= 70: content += "Morning Light</h3><p>The sun came up over hills.</p><p>Sparky woke up very hungry.</p><p>He walked towards the river.</p><p>The water was clear and cold.</p><p>He saw his reflection there.</p><p>He was a brave little kitten.</p><p>He followed the silver water.</p>"
        elif i <= 80: content += "Finding the Way</h3><p>He saw a familiar red barn.</p><p>He knew that barn very well.</p><p>He ran as fast as he could.</p><p>His little legs were moving.</p><p>He could see his garden gate.</p><p>He jumped over the fence again.</p><p>He was finally back home now.</p>"
        else: content += "Back for Lunch</h3><p>His family was looking for him.</p><p>'Sparky! You are back!' they cried.</p><p>They gave him a bowl of milk.</p><p>He ate his food very quickly.</p><p>He went to his blue bed.</p><p>The kitten was very happy today.</p><p>Home is the best place ever.</p>"
        pages.append(content)
        
    books.append({
        "title": "The Red Kitten's Adventure",
        "author": "Antigravity",
        "level": "A1",
        "cover": "🐱",
        "color": "#e67e22",
        "description": "A heartwarming story about a kitten finding his way home.",
        "pages": pages
    })

    # Book 2: Our New Neighborhood
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "Moving In</h3><p>We have a new house today.</p><p>The house is white and blue.</p><p>It has a small front garden.</p><p>My room is on the second floor.</p><p>I have many boxes to open.</p><p>My toys are in the big box.</p><p>I am excited to live here.</p>"
        elif i <= 60: content += "Meeting Neighbors</h3><p>We went to the park nearby.</p><p>I saw a girl named Lily.</p><p>She has a friendly brown dog.</p><p>We played with a red ball.</p><p>The sun was very warm today.</p><p>The park has many tall trees.</p><p>We are good friends now today.</p>"
        else: content += "The Local Shop</h3><p>There is a bakery on corner.</p><p>It smells like fresh bread.</p><p>Mr. Smith is the kind baker.</p><p>He wears a clean white apron.</p><p>I buy a small cookie there.</p><p>My mother buys a big cake.</p><p>I love our new neighborhood now.</p>"
        pages.append(content)
    
    books.append({
        "title": "Our New Neighborhood",
        "author": "Antigravity",
        "level": "A1",
        "cover": "🏡",
        "color": "#2ecc71",
        "description": "Getting to know the people and places around a new home.",
        "pages": pages
    })

    # Book 3: A Trip to the Park
    pages = []
    for i in range(1, 91):
        content = f"<h3>Page {i}: "
        if i <= 30: content += "The Picnic Basket</h3><p>Today is a sunny Saturday morning.</p><p>My family is going to park.</p><p>Mother makes some cheese sandwiches today.</p><p>Father puts fruit in a basket.</p><p>I bring my favorite kite today.</p><p>We walk to the green park.</p><p>It is a beautiful day today.</p>"
        elif i <= 60: content += "Flying the Kite</h3><p>The wind is perfect for kites.</p><p>My kite is blue and yellow.</p><p>It flies high in the sky.</p><p>I run on the green grass.</p><p>Many people are watching me today.</p><p>The kite looks like a bird.</p><p>I am very happy right now.</p>"
        else: content += "The Ice Cream Van</h3><p>We hear a loud music now.</p><p>The ice cream van is here.</p><p>I want a chocolate ice cream.</p><p>Father buys it for me now.</p><p>It is very cold and sweet.</p><p>We sit on the wooden bench.</p><p>What a great trip today!</p>"
        pages.append(content)
    
    books.append({
        "title": "A Trip to the Park",
        "author": "Antigravity",
        "level": "A1",
        "cover": "🌳",
        "color": "#3498db",
        "description": "A fun family day out in the local park.",
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
    a1_books = generate_a1_books()
    with open("js/books.js", "a", encoding="utf-8") as f:
        for book in a1_books:
            f.write("\n" + format_js_book(book))
    print("A1 books generated and appended.")
