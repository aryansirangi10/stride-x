import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'stridex.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force_reset=False):
    if force_reset and os.path.exists(DATABASE_PATH):
        try:
            os.remove(DATABASE_PATH)
        except Exception as e:
            print(f"Error removing old database: {e}")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Create Products table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        rating REAL DEFAULT 0.0,
        reviews_count INTEGER DEFAULT 0,
        sizes TEXT NOT NULL,
        colors TEXT NOT NULL,
        stock INTEGER NOT NULL
    )
    ''')

    # Create Orders table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        total_price REAL NOT NULL,
        status TEXT DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Create Order Items table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        size TEXT NOT NULL,
        color TEXT NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )
    ''')

    # Create Reviews table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        reviewer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id)
    )
    ''')

    conn.commit()

    # Check if products already exist
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)
    
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()

    # Product list with local image paths
    products = [
        (
            "AeroRun 300", "StrideTech", "Running", 129.99,
            "Engineered for high-performance and long-distance runs. Features a responsive nitrogen-infused foam midsole, highly breathable engineered mesh upper, and carbon-rubber traction outsole for optimal grip and shock absorption.",
            "/assets/images/aerorun_300.png", 4.5, 2, "7,8,9,10,11,12", "Ice White/Cobalt,Charcoal Black", 12
        ),
        (
            "TrailMaster X", "TerraFit", "Trail", 149.99,
            "Built for the rugged outdoors. Built with a tough water-resistant ripstop nylon upper, protective toe-bumper, and deep multi-directional outsole lugs that secure a firm foothold on mud, wet rocks, and loose dirt.",
            "/assets/images/trailmaster_x.png", 4.5, 2, "8,9,10,11,12", "Forest Green/Amber,Stealth Black", 8
        ),
        (
            "UrbanFlex Lo", "MetroStep", "Casual", 89.99,
            "A sleek, minimalist low-top sneaker for everyday city wear. Crafted with premium full-grain leather, subtle stitching accents, and an anatomical memory-foam insole providing superior all-day walking comfort.",
            "/assets/images/urbanflex_lo.png", 5.0, 2, "7,8,9,10,11", "Off-White/Tan,Cool Grey", 15
        ),
        (
            "CourtPro Elite", "VolleyEdge", "Sport", 119.99,
            "Designed for tennis, pickleball, and indoor court sports. Offers excellent lateral stability with a reinforced side wall, responsive heel gel cushioning, and a non-marking high-durability traction outsole.",
            "/assets/images/courtpro_elite.png", 4.5, 2, "8,9,10,11,12", "Midnight Black/Neon,White/Scarlet", 10
        ),
        (
            "ApexLift 500", "StrideTech", "Training", 139.99,
            "Engineered specifically for heavy lifting and cross-training. Features an ultra-flat, non-compressible solid rubber sole, heel cup stability clip, and an adjustable wide midfoot hook-and-loop lockdown strap.",
            "/assets/images/apexlift_500.png", 4.5, 2, "8,9,10,11,12", "Brushed Gold/Black,Obsidian Grey", 7
        ),
        (
            "ZenStride Glide", "MetroStep", "Casual", 99.99,
            "An ultra-lightweight slip-on walking shoe designed for quick wear and maximum breathability. Features a flexible stretch-knit upper, padded collar, and a cloud-like shock-absorbing EVA foam midsole.",
            "/assets/images/zenstride_glide.png", 5.0, 2, "7,8,9,10,11,12", "Platinum Grey,Midnight Navy", 20
        ),
        (
            "AquaDunk Hydro", "TerraFit", "Sport", 79.99,
            "High-performance amphibious shoe built for kayaking, paddleboarding, and wet terrain. Features built-in drainage ports throughout the outsole, quick-dry hydrophobic mesh, and sticky water-grip rubber.",
            "/assets/images/aquadunk_hydro.png", 4.5, 2, "8,9,10,11", "Teal/Marine Blue,Lime Glow", 14
        ),
        (
            "VeloSpeed Pro", "VolleyEdge", "Sport", 169.99,
            "Premium road and indoor cycling shoe. Equipped with a stiff carbon-reinforced outsole for maximum power transfer, dual dial fit adjustment system, and compatibility with standard 3-bolt road cleats.",
            "/assets/images/velospeed_pro.png", 5.0, 2, "7,8,9,10,11,12", "Gloss White/Red,Matte Blackout", 6
        )
    ]

    cursor.executemany('''
    INSERT INTO products (name, brand, category, price, description, image_url, rating, reviews_count, sizes, colors, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', products)

    # Preloaded reviews for each product to show professional reviews
    reviews = [
        # AeroRun 300 (Product ID 1)
        (1, "Marcus Vance (Marathon Coach)", 5, "I've run over 100 miles in the AeroRun 300 and they are incredibly springy. The foam midsole retains its rebound even on long 15-mile runs. Highly recommended for daily training."),
        (1, "Clara Zhang", 4, "Extremely breathable upper. Fits snugly around the midfoot. The toe box is a bit narrow, so consider half a size up if you like extra wiggle room. Excellent overall."),
        
        # TrailMaster X (Product ID 2)
        (2, "David K. (Trail Runner)", 5, "Unbelievable grip on wet granite and loose mud. The protective toe guard saved me from several rock stubs. The water-resistant upper kept my feet dry through minor stream crossings."),
        (2, "Rachel G.", 4, "Very sturdy and stable. It's a bit heavier than a normal road running shoe, but the traction and protection are absolutely worth the extra weight on technical terrain."),
        
        # UrbanFlex Lo (Product ID 3)
        (3, "Julian S. (Fashion Blogger)", 5, "This is the ultimate clean leather sneaker. It matches perfectly with linen pants, denim, and suits. The memory foam insole is so soft it feels like walking on air. Zero blister break-in period!"),
        (3, "Elena Rostova", 5, "Gorgeous full-grain leather that easily wipes clean with a damp cloth. Fits true to size. It's simple, elegant, and extremely well-made."),
        
        # CourtPro Elite (Product ID 4)
        (4, "Coach Terry", 5, "Great tennis shoe. The reinforced lateral wall is a lifesaver for aggressive baseline slide cuts. Outsole durability is top-tier compared to others I've worn this season."),
        (4, "Arthur Dent", 4, "Excellent heel lock and lateral stability. The rubber grip squeaks nicely and grabs court surfaces perfectly. Took about 2 sessions to fully break in the stiff side stabilizers."),
        
        # ApexLift 500 (Product ID 5)
        (5, "Danielle Strength", 5, "I squat and deadlift in these shoes and the stability is unmatched. The solid non-compressible sole ensures 100% force transmission to the floor. The midfoot strap is incredibly secure."),
        (5, "Ken Tanaka", 4, "The flat profile is perfect for squats and clean-and-jerks. Excellent build quality. Do not try to run or do cardio in these, as the stiff sole has no flex!"),
        
        # ZenStride Glide (Product ID 6)
        (6, "Grandpa Arthur", 5, "These are the easiest shoes to slip on and off. Perfect for airport security or walks around the block. Stretchy, breathable fabric, and extremely soft on the heels."),
        (6, "Sarah Jenkins", 5, "I use these for my 12-hour nursing shifts. My feet usually ache by hour 6, but with the ZenStride Glide, I get through the entire shift comfortably. Outstanding comfort."),
        
        # AquaDunk Hydro (Product ID 7)
        (7, "Nate River (Kayak Guide)", 5, "Essential gear for water sports. The drainage ports work perfectly—when you step out of the river, water pours out of the bottom immediately. Sticky rubber works great on wet canoe decks."),
        (7, "Maya Lin", 4, "Very snug glove-like fit which prevents sand and small pebbles from entering the shoe. Dries in about 30 minutes in the sun. Extremely flexible."),
        
        # VeloSpeed Pro (Product ID 8)
        (8, "VeloRider Pro", 5, "Stiffest sole I've ever ridden. The dual dial system allows micro-adjustments on the fly without stopping. Sleek design, matches my carbon road bike perfectly."),
        (8, "Jessica Miller", 5, "Amazing power transfer. The cleat setup was straightforward. Premium look and feel that easily competes with brands costing twice as much.")
    ]

    cursor.executemany('''
    INSERT INTO reviews (product_id, reviewer_name, rating, comment)
    VALUES (?, ?, ?, ?)
    ''', reviews)

    conn.commit()

if __name__ == '__main__':
    # Initialize the database file
    init_db()
    print("Database initialized and seeded successfully.")
