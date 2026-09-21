import os
import sys
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import secrets

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import (
    User, UserRole,
    Category,
    Product, ProductImage, ProductVariant,
    Address,
    Cart,
    Wishlist,
    Order, OrderItem, Payment, Shipment, OrderStatus, PaymentStatus,
    Review, ReviewStatus,
    Coupon, CouponUsage, DiscountType
)

def run_seed():
    db = SessionLocal()
    try:
        print("Ensuring database tables exist...")
        Base.metadata.create_all(bind=engine)

        print("Checking if database already seeded...")
        existing_admin = db.query(User).filter(User.email == "admin@shopera.com").first()
        if existing_admin:
            print("Database already contains admin user. Proceeding to update/verify seed data...")

        # 1. CREATE USERS
        print("Seeding users (Admin & Customers)...")
        admin_pass = get_password_hash("Admin@Shopera2026!")
        customer_pass = get_password_hash("Customer@1234")

        admin_user = db.query(User).filter(User.email == "admin@shopera.com").first()
        if not admin_user:
            admin_user = User(
                first_name="Alexander",
                last_name="Wright",
                email="admin@shopera.com",
                phone="+1 (555) 019-2834",
                password_hash=admin_pass,
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True
            )
            db.add(admin_user)
            db.flush()
            db.add(Cart(user_id=admin_user.id))
            db.add(Wishlist(user_id=admin_user.id))

        customer1 = db.query(User).filter(User.email == "sarah.jenkins@example.com").first()
        if not customer1:
            customer1 = User(
                first_name="Sarah",
                last_name="Jenkins",
                email="sarah.jenkins@example.com",
                phone="+1 (555) 234-5678",
                password_hash=customer_pass,
                role=UserRole.CUSTOMER,
                is_active=True,
                is_verified=True
            )
            db.add(customer1)
            db.flush()
            db.add(Cart(user_id=customer1.id))
            db.add(Wishlist(user_id=customer1.id))

        customer2 = db.query(User).filter(User.email == "marcus.vance@example.com").first()
        if not customer2:
            customer2 = User(
                first_name="Marcus",
                last_name="Vance",
                email="marcus.vance@example.com",
                phone="+1 (555) 345-6789",
                password_hash=customer_pass,
                role=UserRole.CUSTOMER,
                is_active=True,
                is_verified=True
            )
            db.add(customer2)
            db.flush()
            db.add(Cart(user_id=customer2.id))
            db.add(Wishlist(user_id=customer2.id))

        customer3 = db.query(User).filter(User.email == "elena.rostova@example.com").first()
        if not customer3:
            customer3 = User(
                first_name="Elena",
                last_name="Rostova",
                email="elena.rostova@example.com",
                phone="+1 (555) 456-7890",
                password_hash=customer_pass,
                role=UserRole.CUSTOMER,
                is_active=True,
                is_verified=True
            )
            db.add(customer3)
            db.flush()
            db.add(Cart(user_id=customer3.id))
            db.add(Wishlist(user_id=customer3.id))

        db.commit()

        # Seed Addresses for Customer 1 & 2
        addr1 = db.query(Address).filter(Address.user_id == customer1.id).first()
        if not addr1:
            addr1 = Address(
                user_id=customer1.id,
                full_name="Sarah Jenkins",
                phone="+1 (555) 234-5678",
                address_line_1="742 Evergreen Terrace",
                address_line_2="Apt 4B",
                city="Springfield",
                state="Oregon",
                postal_code="97477",
                country="United States",
                is_default=True
            )
            db.add(addr1)
            db.commit()

        addr2 = db.query(Address).filter(Address.user_id == customer2.id).first()
        if not addr2:
            addr2 = Address(
                user_id=customer2.id,
                full_name="Marcus Vance",
                phone="+1 (555) 345-6789",
                address_line_1="10880 Wilshire Boulevard",
                address_line_2="Suite 1400",
                city="Los Angeles",
                state="California",
                postal_code="90024",
                country="United States",
                is_default=True
            )
            db.add(addr2)
            db.commit()

        # 2. CREATE 10 CATEGORIES
        print("Seeding 10 Categories...")
        categories_data = [
            {
                "name": "Audio & Sound",
                "slug": "audio-and-sound",
                "description": "High-fidelity spatial headphones, true wireless earbuds, and acoustic monitors.",
                "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
                "display_order": 1
            },
            {
                "name": "Wearables & Watches",
                "slug": "wearables-and-watches",
                "description": "Precision mechanical chronographs, rugged outdoor sport watches, and smart trackers.",
                "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
                "display_order": 2
            },
            {
                "name": "Computers & Tech",
                "slug": "computers-and-tech",
                "description": "Minimalist mechanical keyboards, ergonomic studio mice, and ultra-high-resolution displays.",
                "image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
                "display_order": 3
            },
            {
                "name": "Home & Lighting",
                "slug": "home-and-lighting",
                "description": "Architectural desk lamps, ambient luminaires, and modern Scandinavian home objects.",
                "image_url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
                "display_order": 4
            },
            {
                "name": "Bags & Backpacks",
                "slug": "bags-and-backpacks",
                "description": "Weatherproof technical packs, waterproof rolltop commuters, and full-grain travel bags.",
                "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
                "display_order": 5
            },
            {
                "name": "Footwear",
                "slug": "footwear",
                "description": "Ergonomic trail runners, premium leather low-tops, and lightweight daily trainers.",
                "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
                "display_order": 6
            },
            {
                "name": "Apparel & Outerwear",
                "slug": "apparel-and-outerwear",
                "description": "Technical windbreakers, breathable merino wool layers, and relaxed tailored coats.",
                "image_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80",
                "display_order": 7
            },
            {
                "name": "Photography & Optics",
                "slug": "photography-and-optics",
                "description": "Compact prime mirrorless bodies, premium cine lenses, and precision filters.",
                "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
                "display_order": 8
            },
            {
                "name": "Travel & Outdoor",
                "slug": "travel-and-outdoor",
                "description": "Ultralight insulated thermoses, titanium camp equipment, and modular packing cubes.",
                "image_url": "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&q=80",
                "display_order": 9
            },
            {
                "name": "Workspace & Desk",
                "slug": "workspace-and-desk",
                "description": "Solid walnut desk shelves, anodized aluminum laptop stands, and felt wool desk pads.",
                "image_url": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80",
                "display_order": 10
            }
        ]

        cat_map = {}
        for c in categories_data:
            cat = db.query(Category).filter(Category.slug == c["slug"]).first()
            if not cat:
                cat = Category(**c)
                db.add(cat)
                db.flush()
            cat_map[c["slug"]] = cat
        db.commit()

        # 3. CREATE 30+ PRODUCTS WITH MULTIPLE IMAGES AND VARIANTS
        print("Seeding 32 Products with multiple external image URLs and variants...")
        products_data = [
            # Category: Audio & Sound
            {
                "category_slug": "audio-and-sound",
                "name": "Aether Pro Wireless ANC Headphones",
                "slug": "aether-pro-wireless-anc-headphones",
                "sku": "AUD-AET-001",
                "brand": "Aether",
                "short_description": "Studio-grade lossless wireless headphones with active noise cancellation and 40h battery.",
                "description": "Crafted with lightweight aerospace-grade aluminum and plush memory foam earcups, the Aether Pro represents the pinnacle of personal acoustics. Featuring custom 45mm neodymium drivers, dual hybrid noise cancelling mics, and ultra-low latency wireless streaming.",
                "price": Decimal("349.00"),
                "original_price": Decimal("399.00"),
                "discount_percentage": 12,
                "stock_quantity": 42,
                "low_stock_threshold": 8,
                "rating": 4.9,
                "review_count": 128,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", "alt_text": "Aether Pro in Cobalt Navy", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80", "alt_text": "Aether Pro Angle Profile", "is_primary": False},
                    {"image_url": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80", "alt_text": "Aether Pro Studio Laydown", "is_primary": False}
                ],
                "variants": [
                    {"variant_type": "Color", "variant_name": "Cobalt Navy", "price_modifier": Decimal("0.00"), "stock_quantity": 25},
                    {"variant_type": "Color", "variant_name": "Matte Obsidian", "price_modifier": Decimal("0.00"), "stock_quantity": 17}
                ]
            },
            {
                "category_slug": "audio-and-sound",
                "name": "Veloce Spatial Earbuds X",
                "slug": "veloce-spatial-earbuds-x",
                "sku": "AUD-VEL-002",
                "brand": "Veloce",
                "short_description": "Ultra-compact true wireless earbuds with dynamic head tracking spatial audio.",
                "description": "Zero bulk, maximum fidelity. The Veloce X earbuds deliver pristine acoustic balance and transparent pass-through mode so you never miss a beat of the city around you. IPX7 water-resistant for all-weather workouts.",
                "price": Decimal("189.00"),
                "original_price": Decimal("219.00"),
                "discount_percentage": 13,
                "stock_quantity": 65,
                "low_stock_threshold": 10,
                "rating": 4.7,
                "review_count": 89,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80", "alt_text": "Veloce Earbuds with Case", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&q=80", "alt_text": "Veloce Earbuds Close Up", "is_primary": False}
                ],
                "variants": [
                    {"variant_type": "Color", "variant_name": "Glacier White", "price_modifier": Decimal("0.00"), "stock_quantity": 35},
                    {"variant_type": "Color", "variant_name": "Graphite Grey", "price_modifier": Decimal("0.00"), "stock_quantity": 30}
                ]
            },
            {
                "category_slug": "audio-and-sound",
                "name": "Harmonia Sound Desk Monitor",
                "slug": "harmonia-sound-desk-monitor",
                "sku": "AUD-HAR-003",
                "brand": "Harmonia",
                "short_description": "Cast-aluminum acoustic desktop speaker with custom woven Kevlar cone.",
                "description": "Engineered for acoustic precision and desktop elegance. Tuned with an internal Class D digital amplifier to produce crystal-clear highs and authoritative bass without a separate subwoofer box.",
                "price": Decimal("279.00"),
                "original_price": Decimal("299.00"),
                "discount_percentage": 6,
                "stock_quantity": 18,
                "low_stock_threshold": 5,
                "rating": 4.8,
                "review_count": 45,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80", "alt_text": "Harmonia Desk Speaker", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Wearables & Watches
            {
                "category_slug": "wearables-and-watches",
                "name": "Chronos Apex Automatic Timepiece",
                "slug": "chronos-apex-automatic-timepiece",
                "sku": "WAT-CHR-001",
                "brand": "Chronos",
                "short_description": "Sapphire crystal mechanical watch with 42-hour power reserve and Italian leather strap.",
                "description": "Minimalist Bauhaus watch face meets precision Japanese automatic movement. Waterproof to 5 ATM, featuring an exhibition caseback and surgical 316L stainless steel enclosure.",
                "price": Decimal("495.00"),
                "original_price": Decimal("550.00"),
                "discount_percentage": 10,
                "stock_quantity": 12,
                "low_stock_threshold": 4,
                "rating": 4.9,
                "review_count": 72,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80", "alt_text": "Chronos Apex Minimalist Dial", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80", "alt_text": "Chronos Apex Wrist View", "is_primary": False}
                ],
                "variants": [
                    {"variant_type": "Strap", "variant_name": "Cognac Leather", "price_modifier": Decimal("0.00"), "stock_quantity": 7},
                    {"variant_type": "Strap", "variant_name": "Midnight Mesh", "price_modifier": Decimal("30.00"), "stock_quantity": 5}
                ]
            },
            {
                "category_slug": "wearables-and-watches",
                "name": "Terra Expedition Titanium Smartwatch",
                "slug": "terra-expedition-titanium-smartwatch",
                "sku": "WAT-TER-002",
                "brand": "Terra",
                "short_description": "Dual-frequency GPS, biometric sensors, solar sapphire glass, and 14-day battery.",
                "description": "Engineered for high-altitude mountain expeditions and daily performance training. Featuring topographical offline maps, multi-band GNSS, and grade 5 titanium bezel.",
                "price": Decimal("649.00"),
                "original_price": Decimal("699.00"),
                "discount_percentage": 7,
                "stock_quantity": 19,
                "low_stock_threshold": 5,
                "rating": 4.8,
                "review_count": 94,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80", "alt_text": "Terra Titanium Watch", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "wearables-and-watches",
                "name": "Lumina Ceramic Fitness Tracker",
                "slug": "lumina-ceramic-fitness-tracker",
                "sku": "WAT-LUM-003",
                "brand": "Lumina",
                "short_description": "Screenless zirconia ceramic health ring tracking sleep stages and HRV recovery.",
                "description": "Discreet biometric intelligence without screen distraction. Crafted with scratch-resistant biocompatible ceramic, delivering medical-grade sleep architecture and autonomic stress monitoring.",
                "price": Decimal("299.00"),
                "original_price": Decimal("299.00"),
                "discount_percentage": 0,
                "stock_quantity": 30,
                "low_stock_threshold": 6,
                "rating": 4.6,
                "review_count": 53,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80", "alt_text": "Lumina Ring Band", "is_primary": True}
                ],
                "variants": [
                    {"variant_type": "Size", "variant_name": "Size 8", "price_modifier": Decimal("0.00"), "stock_quantity": 10},
                    {"variant_type": "Size", "variant_name": "Size 10", "price_modifier": Decimal("0.00"), "stock_quantity": 10},
                    {"variant_type": "Size", "variant_name": "Size 12", "price_modifier": Decimal("0.00"), "stock_quantity": 10}
                ]
            },

            # Category: Computers & Tech
            {
                "category_slug": "computers-and-tech",
                "name": "Modena 75 Wireless Mechanical Keyboard",
                "slug": "modena-75-wireless-mechanical-keyboard",
                "sku": "TEC-MOD-001",
                "brand": "Modena",
                "short_description": "CNC aluminum gasket-mount keyboard with hot-swappable tactile switches and PBT keycaps.",
                "description": "An uncompromising typing experience. Gasket suspension system dampens vibration while acoustic poron foam delivers a deep, satisfying tactile response. Connect up to 3 Bluetooth devices simultaneously.",
                "price": Decimal("210.00"),
                "original_price": Decimal("240.00"),
                "discount_percentage": 12,
                "stock_quantity": 28,
                "low_stock_threshold": 5,
                "rating": 4.9,
                "review_count": 114,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80", "alt_text": "Modena 75 Mechanical Keyboard", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80", "alt_text": "Modena Keycaps Profile", "is_primary": False}
                ],
                "variants": [
                    {"variant_type": "Switch", "variant_name": "Linear Whisper", "price_modifier": Decimal("0.00"), "stock_quantity": 14},
                    {"variant_type": "Switch", "variant_name": "Tactile Marble", "price_modifier": Decimal("10.00"), "stock_quantity": 14}
                ]
            },
            {
                "category_slug": "computers-and-tech",
                "name": "Stratum Precision Ergonomic Mouse",
                "slug": "stratum-precision-ergonomic-mouse",
                "sku": "TEC-STR-002",
                "brand": "Stratum",
                "short_description": "Sculpted 57-degree vertical wireless mouse reducing forearm strain by 70%.",
                "description": "Promotes a neutral handshake posture to eliminate repetitive strain injuries. Equipped with silent acoustic micro-switches, customizable side thumb wheels, and 4000 DPI Darkfield tracking.",
                "price": Decimal("99.00"),
                "original_price": Decimal("119.00"),
                "discount_percentage": 16,
                "stock_quantity": 48,
                "low_stock_threshold": 10,
                "rating": 4.7,
                "review_count": 67,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80", "alt_text": "Stratum Ergonomic Mouse", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "computers-and-tech",
                "name": "Kroma 27-inch 4K Studio Display",
                "slug": "kroma-27-inch-4k-studio-display",
                "sku": "TEC-KRO-003",
                "brand": "Kroma",
                "short_description": "Nano-texture IPS panel with 99% DCI-P3 color gamut, 90W USB-C power delivery.",
                "description": "Designed for creative directors and software artisans. Ultra-narrow borderless bezel, factory color calibration delta-E < 1, and built-in studio grade speakers.",
                "price": Decimal("780.00"),
                "original_price": Decimal("850.00"),
                "discount_percentage": 8,
                "stock_quantity": 14,
                "low_stock_threshold": 3,
                "rating": 4.9,
                "review_count": 38,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80", "alt_text": "Kroma 4K Studio Display", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Home & Lighting
            {
                "category_slug": "home-and-lighting",
                "name": "Nordic Cantilever Task Lamp",
                "slug": "nordic-cantilever-task-lamp",
                "sku": "LGT-NOR-001",
                "brand": "Svallet Design",
                "short_description": "Matte charcoal desk lamp with articulated counter-balanced arm and warm LED tone.",
                "description": "Inspired by Scandinavian minimalist lighting philosophy. Features touch dimming with stepless 2700K-5000K circadian temperature tuning, machined brass pivot joints, and anti-glare honeycomb diffusion.",
                "price": Decimal("149.00"),
                "original_price": Decimal("180.00"),
                "discount_percentage": 17,
                "stock_quantity": 22,
                "low_stock_threshold": 6,
                "rating": 4.9,
                "review_count": 82,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80", "alt_text": "Nordic Cantilever Lamp", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80", "alt_text": "Nordic Lamp Desk View", "is_primary": False}
                ],
                "variants": [
                    {"variant_type": "Color", "variant_name": "Matte Charcoal", "price_modifier": Decimal("0.00"), "stock_quantity": 12},
                    {"variant_type": "Color", "variant_name": "Brushed Brass", "price_modifier": Decimal("25.00"), "stock_quantity": 10}
                ]
            },
            {
                "category_slug": "home-and-lighting",
                "name": "Solstice Ambient Glass Orb",
                "slug": "solstice-ambient-glass-orb",
                "sku": "LGT-SOL-002",
                "brand": "Solstice",
                "short_description": "Hand-blown frosted opal glass sphere with wireless induction charging base.",
                "description": "Portable radiant illumination. Take gentle warm light from bedside to patio table. Lasts up to 24 hours on a single charge with soft breathing candlelight modes.",
                "price": Decimal("120.00"),
                "original_price": Decimal("135.00"),
                "discount_percentage": 11,
                "stock_quantity": 35,
                "low_stock_threshold": 8,
                "rating": 4.8,
                "review_count": 59,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&q=80", "alt_text": "Solstice Glass Orb", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "home-and-lighting",
                "name": "Kyoto Ultrasonic Ceramic Diffuser",
                "slug": "kyoto-ultrasonic-ceramic-diffuser",
                "sku": "HOM-KYO-003",
                "brand": "Kyoto Living",
                "short_description": "Handcrafted matte porcelain aromatherapy diffuser with whisper-quiet misting.",
                "description": "Transforms essential oils into ultra-fine micro-mist without heat degradation. Shuts off automatically when water levels deplete, accompanied by subtle warm base illumination.",
                "price": Decimal("88.00"),
                "original_price": Decimal("98.00"),
                "discount_percentage": 10,
                "stock_quantity": 40,
                "low_stock_threshold": 10,
                "rating": 4.6,
                "review_count": 47,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80", "alt_text": "Kyoto Ceramic Diffuser", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Bags & Backpacks
            {
                "category_slug": "bags-and-backpacks",
                "name": "Summit Seeker Waterproof Pack 28L",
                "slug": "summit-seeker-waterproof-pack-28l",
                "sku": "BAG-SUM-001",
                "brand": "Trail Co.",
                "short_description": "X-Pac sailcloth commuter backpack with clamshell opening and padded 16-inch laptop chamber.",
                "description": "Built for relentless all-weather transit. Welded seams, YKK AquaGuard weatherproof zippers, magnetic Fidlock buckle closures, and an ergonomic air-mesh harness for all-day comfort.",
                "price": Decimal("195.00"),
                "original_price": Decimal("225.00"),
                "discount_percentage": 13,
                "stock_quantity": 25,
                "low_stock_threshold": 5,
                "rating": 4.9,
                "review_count": 140,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80", "alt_text": "Summit Seeker Backpack in Slate", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80", "alt_text": "Summit Seeker Interior View", "is_primary": False}
                ],
                "variants": [
                    {"variant_type": "Color", "variant_name": "Slate Grey", "price_modifier": Decimal("0.00"), "stock_quantity": 15},
                    {"variant_type": "Color", "variant_name": "Forest Sage", "price_modifier": Decimal("0.00"), "stock_quantity": 10}
                ]
            },
            {
                "category_slug": "bags-and-backpacks",
                "name": "Atelier Full-Grain Leather Weekender",
                "slug": "atelier-full-grain-leather-weekender",
                "sku": "BAG-ATE-002",
                "brand": "Atelier",
                "short_description": "Vegetable-tanned Tuscan leather travel bag with brass hardware and shoe pocket.",
                "description": "Heirloom craftsmanship designed to develop a rich, lustrous patina over years of travel. Features heavy-duty cotton twill lining, TSA compliant exterior document pocket, and reinforced handles.",
                "price": Decimal("480.00"),
                "original_price": Decimal("520.00"),
                "discount_percentage": 8,
                "stock_quantity": 8, # Low stock item
                "low_stock_threshold": 5,
                "rating": 5.0,
                "review_count": 31,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=800&q=80", "alt_text": "Atelier Leather Weekender", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "bags-and-backpacks",
                "name": "Transit Technical Sling 4L",
                "slug": "transit-technical-sling-4l",
                "sku": "BAG-TRA-003",
                "brand": "Trail Co.",
                "short_description": "Cordura ripstop crossbody sling with quick-release aluminum buckle.",
                "description": "The quintessential everyday carry companion. Sized perfectly for smartphone, passports, sunglasses, keys, and battery packs with micro-fleece scratch-free organizers.",
                "price": Decimal("75.00"),
                "original_price": Decimal("85.00"),
                "discount_percentage": 11,
                "stock_quantity": 55,
                "low_stock_threshold": 12,
                "rating": 4.7,
                "review_count": 64,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80", "alt_text": "Transit Technical Sling", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Footwear
            {
                "category_slug": "footwear",
                "name": "Strata Carbon-Plate Trail Runner",
                "slug": "strata-carbon-plate-trail-runner",
                "sku": "SH-STR-001",
                "brand": "Strata Lab",
                "short_description": "Full-length carbon fiber propulsion plate with Vibram Megagrip traction lug outsole.",
                "description": "Blistering pace across technical ridges and loose scree. Supercritical nitrogen-infused midsole foam returns explosive energy with every footstrike while the reinforced Kevlar upper resists abrasion.",
                "price": Decimal("220.00"),
                "original_price": Decimal("240.00"),
                "discount_percentage": 8,
                "stock_quantity": 34,
                "low_stock_threshold": 6,
                "rating": 4.8,
                "review_count": 87,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", "alt_text": "Strata Trail Runner Crimson", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80", "alt_text": "Strata Trail Outsole View", "is_primary": False}
                ],
                "variants": [
                    {"variant_type": "Size", "variant_name": "US 9", "price_modifier": Decimal("0.00"), "stock_quantity": 10},
                    {"variant_type": "Size", "variant_name": "US 10", "price_modifier": Decimal("0.00"), "stock_quantity": 14},
                    {"variant_type": "Size", "variant_name": "US 11", "price_modifier": Decimal("0.00"), "stock_quantity": 10}
                ]
            },
            {
                "category_slug": "footwear",
                "name": "Komorebi Minimalist Low-Top Sneaker",
                "slug": "komorebi-minimalist-low-top-sneaker",
                "sku": "SH-KOM-002",
                "brand": "Komorebi",
                "short_description": "Hand-stitched buttery calfskin leather sneaker with vulcanized Margom rubber cupsole.",
                "description": "Purist luxury aesthetics with no unnecessary logos. Soft calf leather lining ensures luxurious barefoot comfort from the first wear with reinforced heel stitching.",
                "price": Decimal("185.00"),
                "original_price": Decimal("210.00"),
                "discount_percentage": 11,
                "stock_quantity": 20,
                "low_stock_threshold": 5,
                "rating": 4.9,
                "review_count": 105,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80", "alt_text": "Komorebi Low-Top Sneaker", "is_primary": True}
                ],
                "variants": [
                    {"variant_type": "Size", "variant_name": "EU 42", "price_modifier": Decimal("0.00"), "stock_quantity": 10},
                    {"variant_type": "Size", "variant_name": "EU 43", "price_modifier": Decimal("0.00"), "stock_quantity": 10}
                ]
            },
            {
                "category_slug": "footwear",
                "name": "Boreal All-Weather Chelsea Boot",
                "slug": "boreal-all-weather-chelsea-boot",
                "sku": "SH-BOR-003",
                "brand": "Boreal",
                "short_description": "Waterproof waxed suede upper with Goodyear welt and lugged natural crepe rubber sole.",
                "description": "Transition effortlessly from drizzly city boulevards to rugged weekend trails. Breathable waterproof membrane keeps socks dry while double elastic gore allows effortless slip-on action.",
                "price": Decimal("245.00"),
                "original_price": Decimal("280.00"),
                "discount_percentage": 12,
                "stock_quantity": 16,
                "low_stock_threshold": 4,
                "rating": 4.7,
                "review_count": 42,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800&q=80", "alt_text": "Boreal Chelsea Boot", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Apparel & Outerwear
            {
                "category_slug": "apparel-and-outerwear",
                "name": "Nimbus 3-Layer GORE-TEX Shell",
                "slug": "nimbus-3-layer-gore-tex-shell",
                "sku": "APP-NIM-001",
                "brand": "Nimbus Lab",
                "short_description": "Fully taped expedition hard-shell waterproof jacket with articulated storm hood.",
                "description": "Engineered to withstand torrential alpine precipitation and gale-force ridge winds. Micro-grid backing increases breathability while underarm pit zips provide instantaneous thermal regulation.",
                "price": Decimal("380.00"),
                "original_price": Decimal("420.00"),
                "discount_percentage": 9,
                "stock_quantity": 17,
                "low_stock_threshold": 4,
                "rating": 4.9,
                "review_count": 56,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80", "alt_text": "Nimbus Hard-Shell Jacket", "is_primary": True}
                ],
                "variants": [
                    {"variant_type": "Size", "variant_name": "Medium", "price_modifier": Decimal("0.00"), "stock_quantity": 8},
                    {"variant_type": "Size", "variant_name": "Large", "price_modifier": Decimal("0.00"), "stock_quantity": 9}
                ]
            },
            {
                "category_slug": "apparel-and-outerwear",
                "name": "Alpine Merino Wool Thermal Hoodie",
                "slug": "alpine-merino-wool-thermal-hoodie",
                "sku": "APP-ALP-002",
                "brand": "Trail Co.",
                "short_description": "100% 260gsm non-mulesed New Zealand merino wool regulating temperature naturally.",
                "description": "Naturally antimicrobial and odor-resistant for multi-day trips. Flatlock anti-chafing seams, discreet thumbloops, and deep scuba hood deliver cozy warmth on chilly mornings.",
                "price": Decimal("145.00"),
                "original_price": Decimal("165.00"),
                "discount_percentage": 12,
                "stock_quantity": 38,
                "low_stock_threshold": 8,
                "rating": 4.8,
                "review_count": 78,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80", "alt_text": "Merino Wool Hoodie", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "apparel-and-outerwear",
                "name": "Kanso Relaxed Japanese Linen Shirt",
                "slug": "kanso-relaxed-japanese-linen-shirt",
                "sku": "APP-KAN-003",
                "brand": "Kanso",
                "short_description": "Pre-washed heavyweight French flax linen shirt with mother-of-pearl buttons.",
                "description": "Airy, breathable, and gracefully draped. Garment-dyed in small artisanal batches for a lived-in softness that improves with every rinse.",
                "price": Decimal("115.00"),
                "original_price": Decimal("130.00"),
                "discount_percentage": 11,
                "stock_quantity": 25,
                "low_stock_threshold": 5,
                "rating": 4.7,
                "review_count": 39,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80", "alt_text": "Linen Shirt", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Photography & Optics
            {
                "category_slug": "photography-and-optics",
                "name": "Lumina Rangefinder Digital Mirrorless",
                "slug": "lumina-rangefinder-digital-mirrorless",
                "sku": "OPT-LUM-001",
                "brand": "Lumina Optics",
                "short_description": "40MP BSI CMOS full-frame compact sensor in brass-machined rangefinder housing.",
                "description": "Tactile manual dial exposure controls and an optical hybrid viewfinder for purist documentary photographers. Uncompromising sharpness with dynamic range exceeding 15 stops.",
                "price": Decimal("1450.00"),
                "original_price": Decimal("1599.00"),
                "discount_percentage": 9,
                "stock_quantity": 6, # Low stock
                "low_stock_threshold": 3,
                "rating": 5.0,
                "review_count": 29,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80", "alt_text": "Rangefinder Camera", "is_primary": True},
                    {"image_url": "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80", "alt_text": "Lens Detail", "is_primary": False}
                ],
                "variants": []
            },
            {
                "category_slug": "photography-and-optics",
                "name": "Apex 35mm F/1.4 Cine Prime Lens",
                "slug": "apex-35mm-f14-cine-prime-lens",
                "sku": "OPT-APX-002",
                "brand": "Apex Cine",
                "short_description": "Stepless de-clicked aperture ring, 0.8 pitch geared focus throw, zero breathing.",
                "description": "Produces signature organic bokeh and velvety filmic roll-off across high-contrast daylight highlights. All-metal weather-sealed housing with hydrophobic front fluorine coating.",
                "price": Decimal("620.00"),
                "original_price": Decimal("680.00"),
                "discount_percentage": 8,
                "stock_quantity": 11,
                "low_stock_threshold": 4,
                "rating": 4.9,
                "review_count": 24,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=800&q=80", "alt_text": "Cine Prime Lens", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Travel & Outdoor
            {
                "category_slug": "travel-and-outdoor",
                "name": "Valence Double-Wall Titanium Thermos 750ml",
                "slug": "valence-double-wall-titanium-thermos-750ml",
                "sku": "TRV-VAL-001",
                "brand": "Valence Gear",
                "short_description": "Pure aerospace grade 1 titanium vacuum bottle keeping contents hot for 24 hours.",
                "description": "Weighs half as much as stainless steel with zero metallic aftertaste or chemical leaching. Features leakproof threaded cap and removable micro-mesh loose tea strainer.",
                "price": Decimal("89.00"),
                "original_price": Decimal("99.00"),
                "discount_percentage": 10,
                "stock_quantity": 45,
                "low_stock_threshold": 10,
                "rating": 4.8,
                "review_count": 92,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80", "alt_text": "Titanium Thermos", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "travel-and-outdoor",
                "name": "AeroShelter Ultralight 2-Person Tent",
                "slug": "aeroshelter-ultralight-2-person-tent",
                "sku": "TRV-AER-002",
                "brand": "Trail Co.",
                "short_description": "Dyneema composite fabric shelter weighing only 850 grams with DAC Featherlite poles.",
                "description": "The gold standard for long-distance thru-hikers. 100% waterproof without toxic DWR treatments, pitching in under two minutes with dual vestibules for gear stowage.",
                "price": Decimal("560.00"),
                "original_price": Decimal("620.00"),
                "discount_percentage": 9,
                "stock_quantity": 7, # Low stock
                "low_stock_threshold": 4,
                "rating": 4.9,
                "review_count": 41,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80", "alt_text": "Ultralight Tent", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "travel-and-outdoor",
                "name": "Roam Carbon Trekking Poles (Pair)",
                "slug": "roam-carbon-trekking-poles-pair",
                "sku": "TRV-ROA-003",
                "brand": "Trail Co.",
                "short_description": "Folding 3-section high-modulus carbon fiber poles with moisture-wicking cork grips.",
                "description": "Absorbs harsh impact shock along knee joints on grueling descents. Features aluminum cam lock tensioners and interchangeable carbide snow baskets.",
                "price": Decimal("135.00"),
                "original_price": Decimal("150.00"),
                "discount_percentage": 10,
                "stock_quantity": 30,
                "low_stock_threshold": 6,
                "rating": 4.7,
                "review_count": 68,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&q=80", "alt_text": "Trekking Poles", "is_primary": True}
                ],
                "variants": []
            },

            # Category: Workspace & Desk
            {
                "category_slug": "workspace-and-desk",
                "name": "Walnut Architectural Desk Riser",
                "slug": "walnut-architectural-desk-riser",
                "sku": "DSK-WAL-001",
                "brand": "Kanso Studio",
                "short_description": "Solid American black walnut monitor riser with integrated aluminum trays and cork feet.",
                "description": "Elevates your monitor to optimal ergonomic eye level while reclaiming valuable desk territory below for keyboards, notebooks, and audio interfaces.",
                "price": Decimal("165.00"),
                "original_price": Decimal("185.00"),
                "discount_percentage": 10,
                "stock_quantity": 22,
                "low_stock_threshold": 5,
                "rating": 4.9,
                "review_count": 118,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80", "alt_text": "Walnut Desk Riser", "is_primary": True}
                ],
                "variants": []
            },
            {
                "category_slug": "workspace-and-desk",
                "name": "Merino Wool Felt Oversized Desk Mat",
                "slug": "merino-wool-felt-oversized-desk-mat",
                "sku": "DSK-MER-002",
                "brand": "Kanso Studio",
                "short_description": "Natural German wool felt desk pad with non-slip cork underside. 90cm x 40cm.",
                "description": "Brings organic warmth and acoustic dampening to harsh glass or timber worktops. Mouse glides smoothly with crisp tactile precision.",
                "price": Decimal("58.00"),
                "original_price": Decimal("68.00"),
                "discount_percentage": 14,
                "stock_quantity": 50,
                "low_stock_threshold": 10,
                "rating": 4.8,
                "review_count": 84,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&q=80", "alt_text": "Wool Desk Mat", "is_primary": True}
                ],
                "variants": [
                    {"variant_type": "Color", "variant_name": "Heather Charcoal", "price_modifier": Decimal("0.00"), "stock_quantity": 25},
                    {"variant_type": "Color", "variant_name": "Oatmeal Grey", "price_modifier": Decimal("0.00"), "stock_quantity": 25}
                ]
            },
            {
                "category_slug": "workspace-and-desk",
                "name": "Anodized Aluminum Universal Laptop Stand",
                "slug": "anodized-aluminum-universal-laptop-stand",
                "sku": "DSK-ANO-003",
                "brand": "Modena",
                "short_description": "Precision sandblasted aluminum stand with heat dissipation airflow slots.",
                "description": "Seamlessly matches MacBook space grey finish. Elevates screen 15cm and angles keyboard for comfortable wrist typing posture.",
                "price": Decimal("64.00"),
                "original_price": Decimal("75.00"),
                "discount_percentage": 14,
                "stock_quantity": 40,
                "low_stock_threshold": 8,
                "rating": 4.7,
                "review_count": 61,
                "images": [
                    {"image_url": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80", "alt_text": "Laptop Stand", "is_primary": True}
                ],
                "variants": []
            }
        ]

        created_products = []
        for p_data in products_data:
            existing = db.query(Product).filter(Product.sku == p_data["sku"]).first()
            if not existing:
                cat = cat_map.get(p_data["category_slug"])
                product = Product(
                    category_id=cat.id if cat else None,
                    name=p_data["name"],
                    slug=p_data["slug"],
                    sku=p_data["sku"],
                    brand=p_data["brand"],
                    short_description=p_data["short_description"],
                    description=p_data["description"],
                    price=p_data["price"],
                    original_price=p_data["original_price"],
                    discount_percentage=p_data["discount_percentage"],
                    stock_quantity=p_data["stock_quantity"],
                    low_stock_threshold=p_data["low_stock_threshold"],
                    rating=p_data["rating"],
                    review_count=p_data["review_count"],
                    is_active=True
                )
                db.add(product)
                db.flush()

                for img_data in p_data["images"]:
                    img = ProductImage(
                        product_id=product.id,
                        image_url=img_data["image_url"],
                        alt_text=img_data["alt_text"],
                        is_primary=img_data["is_primary"]
                    )
                    db.add(img)

                for var_data in p_data["variants"]:
                    var = ProductVariant(
                        product_id=product.id,
                        variant_type=var_data["variant_type"],
                        variant_name=var_data["variant_name"],
                        price_modifier=var_data["price_modifier"],
                        stock_quantity=var_data["stock_quantity"],
                        sku=f"{product.sku}-{var_data['variant_name'].replace(' ', '_')}"
                    )
                    db.add(var)

                created_products.append(product)
        db.commit()

        # 4. CREATE COUPONS
        print("Seeding promotional coupons...")
        coupons = [
            {
                "code": "SHOPERA10",
                "discount_type": DiscountType.PERCENTAGE,
                "discount_value": Decimal("10.00"),
                "minimum_order": Decimal("50.00"),
                "maximum_discount": Decimal("50.00"),
                "usage_limit": 500,
                "used_count": 28,
                "is_active": True
            },
            {
                "code": "WELCOME20",
                "discount_type": DiscountType.PERCENTAGE,
                "discount_value": Decimal("20.00"),
                "minimum_order": Decimal("100.00"),
                "maximum_discount": Decimal("100.00"),
                "usage_limit": 200,
                "used_count": 14,
                "is_active": True
            },
            {
                "code": "VIP50",
                "discount_type": DiscountType.FIXED,
                "discount_value": Decimal("50.00"),
                "minimum_order": Decimal("250.00"),
                "maximum_discount": Decimal("50.00"),
                "usage_limit": 100,
                "used_count": 9,
                "is_active": True
            }
        ]
        for c_data in coupons:
            if not db.query(Coupon).filter(Coupon.code == c_data["code"]).first():
                db.add(Coupon(**c_data))
        db.commit()

        # 5. CREATE INITIAL ORDERS FOR REAL ANALYTICS
        print("Seeding initial orders & payments for live analytics metrics...")
        all_prods = db.query(Product).all()
        if all_prods and db.query(Order).count() == 0:
            now = datetime.now(timezone.utc)
            statuses = [
                OrderStatus.DELIVERED,
                OrderStatus.DELIVERED,
                OrderStatus.DELIVERED,
                OrderStatus.SHIPPED,
                OrderStatus.CONFIRMED,
                OrderStatus.PROCESSING
            ]

            customers = [customer1, customer2, customer3]

            for i in range(18):
                days_ago = (18 - i) * 1.5
                order_time = now - timedelta(days=days_ago)
                cust = customers[i % len(customers)]
                status = statuses[i % len(statuses)]
                prod1 = all_prods[i % len(all_prods)]
                prod2 = all_prods[(i + 3) % len(all_prods)]

                sub = prod1.price + (prod2.price if i % 2 == 0 else Decimal("0.00"))
                ship_fee = Decimal("0.00") if sub >= 100 else Decimal("15.00")
                tax_amt = (sub * Decimal("0.08")).quantize(Decimal("0.01"))
                grand_tot = sub + ship_fee + tax_amt

                order_num = f"SHP-{order_time.strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
                order = Order(
                    user_id=cust.id,
                    order_number=order_num,
                    subtotal=sub,
                    discount=Decimal("0.00"),
                    shipping=ship_fee,
                    tax=tax_amt,
                    total=grand_tot,
                    status=status,
                    payment_status=PaymentStatus.PAID,
                    shipping_address_id=addr1.id if addr1 else None,
                    billing_address_id=addr1.id if addr1 else None,
                    created_at=order_time,
                    updated_at=order_time
                )
                db.add(order)
                db.flush()

                # Add order items
                db.add(OrderItem(
                    order_id=order.id,
                    product_id=prod1.id,
                    product_name=prod1.name,
                    sku=prod1.sku,
                    quantity=1,
                    unit_price=prod1.price,
                    total_price=prod1.price
                ))
                if i % 2 == 0:
                    db.add(OrderItem(
                        order_id=order.id,
                        product_id=prod2.id,
                        product_name=prod2.name,
                        sku=prod2.sku,
                        quantity=1,
                        unit_price=prod2.price,
                        total_price=prod2.price
                    ))

                # Add payment
                db.add(Payment(
                    order_id=order.id,
                    payment_reference=f"SHP-PAY-{secrets.token_hex(6).upper()}",
                    payment_method="Credit/Debit Card",
                    amount=grand_tot,
                    status=PaymentStatus.PAID,
                    created_at=order_time
                ))

                # Add shipment
                db.add(Shipment(
                    order_id=order.id,
                    tracking_number=f"TRK-FDX-{secrets.token_hex(4).upper()}",
                    carrier="FedEx Express",
                    status="Delivered" if status == OrderStatus.DELIVERED else "In Transit",
                    shipped_at=order_time + timedelta(hours=6),
                    delivered_at=order_time + timedelta(days=2) if status == OrderStatus.DELIVERED else None
                ))

            db.commit()

        # 6. SEED REVIEWS
        print("Seeding initial reviews...")
        if all_prods and db.query(Review).count() == 0:
            reviews_data = [
                ("Aether Pro Wireless ANC Headphones", 5.0, "Absolute acoustic masterclass. Noise cancellation cancels out construction outside my studio, and the soundstage is expansive and warm.", customer1.id),
                ("Aether Pro Wireless ANC Headphones", 5.0, "The build quality with genuine memory foam earcups is incredible. Best purchase of this year.", customer2.id),
                ("Nordic Cantilever Task Lamp", 5.0, "The dimming dial has the most satisfying tactile resistance. Perfect warm tone for night reading.", customer3.id),
                ("Summit Seeker Waterproof Pack 28L", 5.0, "Rode through a torrential downpour in Seattle and my MacBook was bone dry inside. Highly recommended.", customer1.id),
                ("Modena 75 Wireless Mechanical Keyboard", 5.0, "The gasket mount feels like typing on clouds. Battery lasts for weeks on Bluetooth.", customer2.id)
            ]
            for p_name, rating, comment, u_id in reviews_data:
                prod = db.query(Product).filter(Product.name == p_name).first()
                if prod:
                    rev = Review(
                        user_id=u_id,
                        product_id=prod.id,
                        rating=rating,
                        comment=comment,
                        status=ReviewStatus.APPROVED,
                        created_at=datetime.now(timezone.utc) - timedelta(days=5)
                    )
                    db.add(rev)
            db.commit()

        print("\n=======================================================")
        print("DATABASE SEED COMPLETED SUCCESSFULLY!")
        print("Admin Account: admin@shopera.com | Password: Admin@Shopera2026!")
        print("Customer Account: sarah.jenkins@example.com | Password: Customer@1234")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
