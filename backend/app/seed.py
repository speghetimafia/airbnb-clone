"""Seed demo data. `python -m app.seed` resets the DB; `--if-empty` only seeds a fresh DB (used on deploy).

Dates are relative to today so the demo always has upcoming and past trips.
"""
import random
import sys
from datetime import date, datetime, timedelta

from sqlalchemy import select

from . import rules
from .db import Base, SessionLocal, engine
from .models import Amenity, BlockedDate, Booking, Listing, ListingPhoto, MessageTemplate, Review, User, WishlistItem

U = "https://images.unsplash.com/photo-{}?auto=format&fit=crop&w=1200&q=80"
EXTERIORS = """1512917774080-9991f1c4c750 1564013799919-ab600027ffc6 1568605114967-8130f3a36994 1570129477492-45c003edd2be
1580587771525-78b9dba3b914 1600596542815-ffad4c1539a9 1600585154340-be6161a56a0c 1613490493576-7fde63acd811
1499793983690-e29da59ef1c2 1520250497591-112f2f40a3f4 1566073771259-6a8506099945 1542314831-068cd1dbfeeb
1551882547-ff40c63fe5fa 1571896349842-33c89424de2d 1449158743715-0a90ebb6d2d8 1510798831971-661eb04b3739
1518780664697-55e3ad937233 1523217582562-09d0def993a6 1576941089067-2de3c901e126 1598928506311-c55ded91a20c
1596394516093-501ba68a0ba6 1587061949409-02df41d5e562 1470770841072-f978cf4d019e 1475855581690-80accde3ae2b
1544984243-ec57ea16fe25 1602343168117-bb8ffe3e2e9f 1584132967334-10e028bd69f7 1602002418082-a4443e081dd1
1600047509807-ba8f99d2cdde 1599809275671-b5942cabc7a2 1605276374104-dee2a0ed3cd6 1613977257363-707ba9348227
1600585154526-990dced4db0d 1572120360610-d971b9d7767c 1583608205776-bfd35f0d9f83 1494526585095-c41746248156""".split()
INTERIORS = """1505691938895-1758d7feb511 1522708323590-d24dbb6b0267 1502672260266-1c1ef2d93688 1560448204-e02f11c3d0e2
1493809842364-78817add7ffb 1484154218962-a197022b5858 1586023492125-27b2c045efd7 1556020685-ae41abfc9365
1595526114035-0d45ed16cfbf 1540518614846-7eded433c457 1616594039964-ae9021a400a0 1600210492486-724fe5c67fb0
1600607687939-ce8a6c25118c 1600566753190-17f0baa2a6c3 1631049307264-da0ec9d70304 1582719478250-c89cae4dc85b
1590490360182-c33d57733427 1611892440504-42a792e24d32 1564501049412-61c2a3083791 1552321554-5fefe8c9ef14
1507089947368-19c1da9775ae 1513694203232-719a280e022f 1524758631624-e2822e304c36 1617806118233-18e1de247200
1588046130717-0eb0c9a3ba15 1560185007-cde436f6a4d0 1560185893-a55cbc8c57e8 1560184897-ae75f418493e
1574362848149-11496d93a7c7 1631049035182-249067d7618e 1600573472550-8090b5e0745e 1600607687644-c7171b42498f
1600566752355-35792bedcfea 1604014237800-1c9102c219da 1615873968403-89e068629265 1618221195710-dd6b41faaea6
1600121848594-d8644e57abab 1609766857041-ed402ea8069a 1578683010236-d716f9a3f461 1596178065887-1198b6148b2b
1559599238-308793637427 1561501900-3701fa6a0864 1566665797739-1674de7a421a 1578898886225-c7c894047899""".split()

AMENITIES = [
    ("Wifi", "wifi"), ("Kitchen", "kitchen"), ("Free parking", "parking"), ("Pool", "pool"),
    ("Air conditioning", "ac"), ("Washer", "washer"), ("TV", "tv"), ("Dedicated workspace", "workspace"),
    ("Hot tub", "hottub"), ("Beach access", "beach"), ("Mountain view", "mountain"), ("Fireplace", "fireplace"),
    ("Breakfast", "breakfast"), ("Pets allowed", "pets"), ("Self check-in", "key"), ("BBQ grill", "grill"),
    ("Heating", "heating"), ("Lake access", "lake"), ("Gym", "gym"), ("Power backup", "power"),
]

HOSTS = [
    ("Ananya Sharma", True, "Goa-based architect. I restore old Portuguese homes and host them with love."),
    ("Rohan Mehta", True, "Ex-banker turned mountain host. Ask me for trek routes!"),
    ("Priya Nair", False, "Kerala girl, coffee planter's daughter. Homestays are my family business."),
    ("Vikram Singh", False, "Heritage havelis in Rajasthan, run by the family for four generations."),
    ("Meera Iyer", False, "Designer with a soft spot for slow travel and quiet hill towns."),
]
GUESTS = ["Arjun Kapoor", "Sneha Reddy", "Kabir Malhotra", "Isha Gupta", "Dev Patel", "Zoya Khan"]

# title, city, state, category, property_type, base price ₹, lat, lng, host index
LISTINGS = [
    ("Sunlit Portuguese villa with private pool", "Assagao", "Goa", "Amazing pools", "Villa", 18500, 15.5961, 73.7660, 0),
    ("Beach shack cottage steps from Palolem", "Palolem", "Goa", "Beachfront", "Cottage", 4200, 15.0100, 74.0232, 0),
    ("Boho studio near Anjuna flea market", "Anjuna", "Goa", "Trending", "Apartment", 2800, 15.5733, 73.7407, 0),
    ("Sea-view penthouse in Calangute", "Calangute", "Goa", "Beachfront", "Apartment", 7600, 15.5439, 73.7553, 0),
    ("Heritage home in Fontainhas, Panjim", "Panaji", "Goa", "Historical homes", "House", 6900, 15.4989, 73.8278, 0),
    ("Cliffside room above Gokarna's Om beach", "Gokarna", "Karnataka", "Beachfront", "Guesthouse", 3100, 14.5479, 74.3188, 0),
    ("Pinewood cabin with Himalayan views", "Old Manali", "Himachal Pradesh", "Cabins", "Cabin", 5200, 32.2550, 77.1800, 1),
    ("Apple orchard cottage in Manali", "Manali", "Himachal Pradesh", "Farms", "Cottage", 4500, 32.2396, 77.1887, 1),
    ("Riverside A-frame in Kasol", "Kasol", "Himachal Pradesh", "Cabins", "Cabin", 3800, 32.0098, 77.3150, 1),
    ("Colonial bungalow on the Shimla ridge", "Shimla", "Himachal Pradesh", "Historical homes", "House", 8800, 31.1048, 77.1734, 1),
    ("Ganga-facing yoga retreat room", "Rishikesh", "Uttarakhand", "Trending", "Guesthouse", 2500, 30.0869, 78.2676, 1),
    ("Cloud-level cottage in Mussoorie", "Mussoorie", "Uttarakhand", "Amazing views", "Cottage", 6100, 30.4598, 78.0644, 1),
    ("Lakeview chalet above Naini lake", "Nainital", "Uttarakhand", "Lakefront", "Chalet", 5600, 29.3803, 79.4636, 1),
    ("Tea estate bungalow in Darjeeling", "Darjeeling", "West Bengal", "Amazing views", "House", 7200, 27.0410, 88.2663, 1),
    ("Coffee estate homestay in Coorg", "Madikeri", "Karnataka", "Farms", "Farm stay", 5400, 12.4244, 75.7382, 2),
    ("Private houseboat on Alleppey backwaters", "Alleppey", "Kerala", "Tropical", "Boat", 9800, 9.4981, 76.3388, 2),
    ("Cliff-top villa over Varkala beach", "Varkala", "Kerala", "Beachfront", "Villa", 11200, 8.7379, 76.7163, 2),
    ("Misty tea-garden cottage in Munnar", "Munnar", "Kerala", "Amazing views", "Cottage", 4800, 10.0889, 77.0595, 2),
    ("Treehouse in the Wayanad rainforest", "Wayanad", "Kerala", "Treehouses", "Treehouse", 7900, 11.6854, 76.1320, 2),
    ("French Quarter townhouse, Pondicherry", "Puducherry", "Puducherry", "Historical homes", "House", 6400, 11.9416, 79.8083, 2),
    ("Bamboo eco-hut near Kabini", "Kabini", "Karnataka", "Countryside", "Hut", 3600, 11.9300, 76.3500, 2),
    ("Lake-facing nest in Kodaikanal", "Kodaikanal", "Tamil Nadu", "Lakefront", "Cottage", 5100, 10.2381, 77.4892, 2),
    ("Royal suite in a 200-year-old haveli", "Jaipur", "Rajasthan", "Historical homes", "Heritage haveli", 9500, 26.9124, 75.7873, 3),
    ("Lake Pichola rooftop apartment", "Udaipur", "Rajasthan", "Lakefront", "Apartment", 6800, 24.5854, 73.7125, 3),
    ("Desert camp under Jaisalmer stars", "Jaisalmer", "Rajasthan", "Camping", "Tent", 4400, 26.9157, 70.9083, 3),
    ("Fort-view room in Jodhpur's blue city", "Jodhpur", "Rajasthan", "Iconic cities", "Guesthouse", 3300, 26.2389, 73.0243, 3),
    ("Palace wing with courtyard pool", "Udaipur", "Rajasthan", "Amazing pools", "Villa", 21500, 24.5760, 73.6800, 3),
    ("Boulder-side cottage in Hampi", "Hampi", "Karnataka", "Countryside", "Cottage", 3900, 15.3350, 76.4600, 3),
    ("Pushkar lake courtyard home", "Pushkar", "Rajasthan", "Lakefront", "House", 4100, 26.4899, 74.5511, 3),
    ("Glass villa with infinity pool, Lonavala", "Lonavala", "Maharashtra", "Amazing pools", "Villa", 16500, 18.7546, 73.4062, 4),
    ("Beach bungalow in Alibaug", "Alibaug", "Maharashtra", "Beachfront", "House", 12500, 18.6414, 72.8722, 4),
    ("Designer loft in Bandra West", "Mumbai", "Maharashtra", "Iconic cities", "Apartment", 8400, 19.0596, 72.8295, 4),
    ("Leafy flat in Indiranagar", "Bengaluru", "Karnataka", "Iconic cities", "Apartment", 4300, 12.9784, 77.6408, 4),
    ("Hauz Khas village studio", "New Delhi", "Delhi", "Iconic cities", "Apartment", 3900, 28.5494, 77.2001, 4),
    ("Colonial cottage in the Ooty hills", "Ooty", "Tamil Nadu", "Amazing views", "Cottage", 5300, 11.4102, 76.6950, 4),
    ("Monastery-view homestay in Gangtok", "Gangtok", "Sikkim", "Amazing views", "Guesthouse", 3500, 27.3389, 88.6065, 4),
    ("Vineyard cottage in Nashik", "Nashik", "Maharashtra", "Farms", "Farm stay", 6200, 20.0059, 73.7900, 4),
    ("Mahabaleshwar strawberry farmhouse", "Mahabaleshwar", "Maharashtra", "Farms", "Farm stay", 5800, 17.9237, 73.6586, 4),
    ("Riverside tent at Rishikesh", "Rishikesh", "Uttarakhand", "Camping", "Tent", 2200, 30.1300, 78.3200, 1),
    ("Snow-view igloo stay in Sethan", "Manali", "Himachal Pradesh", "Trending", "Dome", 7400, 32.2200, 77.2600, 1),
]

TYPE_AMENITIES = {
    "Beachfront": ["Beach access"], "Amazing pools": ["Pool"], "Cabins": ["Mountain view", "Fireplace", "Heating"],
    "Amazing views": ["Mountain view", "Heating"], "Lakefront": ["Lake access"], "Farms": ["Breakfast", "Pets allowed"],
}

REVIEWS = [
    (5, "Absolutely loved our stay. The place looked exactly like the photos and the host was super responsive."),
    (5, "One of the best Airbnbs we've stayed in. Spotless, peaceful, and the view is unreal."),
    (4, "Great location and comfortable beds. Hot water took a while in the mornings but otherwise perfect."),
    (5, "Check-in was seamless and the welcome message had everything we needed. Would book again!"),
    (4, "Lovely, cosy home. A bit of road noise at night, but the host's local tips more than made up for it."),
    (5, "The photos don't do it justice. We extended our stay by two nights."),
    (3, "Nice place, but the Wi-Fi was patchy and we needed it for work. Host was apologetic and helpful."),
    (5, "Felt like home from the moment we walked in. Thoughtful touches everywhere."),
]

TEMPLATES = [
    ("Your booking is confirmed 🎉",
     "Hi {guest_name}! Thanks for booking {listing_title}. We can't wait to host you on {check_in}.\n\n"
     "📍 Address: {address}\n🗺️ Directions: {maps_link}\n\nReply here if you need anything. — {host_name}",
     "on_confirm"),
    ("Check-in details for tomorrow",
     "Hi {guest_name}, see you tomorrow! Check-in is from {check_in_time}.\n\n"
     "🔑 Self check-in: lockbox by the door, code 2580\n📶 Wi-Fi: StayHappy_5G / password: welcome@123\n"
     "🚗 Parking is free inside the gate.\n\nSafe travels! — {host_name}",
     "day_before_checkin"),
    ("Thanks for staying with us",
     "Hi {guest_name}, check-out is by {check_out_time} today. Please leave the keys in the lockbox.\n\n"
     "Hope you loved it. A quick review would mean the world to us! — {host_name}",
     "on_checkout"),
]


def avatar(i: int) -> str:
    return f"https://i.pravatar.cc/300?img={i}"


def seed(db):
    rng = random.Random(42)
    today = date.today()
    now = datetime.now()

    amenities = {name: Amenity(name=name, icon=icon) for name, icon in AMENITIES}
    db.add_all(amenities.values())

    hosts = [
        User(name=n, email=f"{n.split()[0].lower()}@host.demo", avatar_url=avatar(i + 1), bio=bio, is_superhost=s,
             joined_at=datetime(2016 + i, 3, 1))
        for i, (n, s, bio) in enumerate(HOSTS)
    ]
    guests = [
        User(name=n, email=f"{n.split()[0].lower()}@guest.demo", avatar_url=avatar(i + 11), joined_at=datetime(2021, 1 + i, 5))
        for i, n in enumerate(GUESTS)
    ]
    db.add_all(hosts + guests)
    db.flush()

    ext, inte = EXTERIORS[:], INTERIORS[:]
    listings = []
    for i, (title, city, state, cat, ptype, price, lat, lng, h) in enumerate(LISTINGS):
        bedrooms = rng.choice([1, 1, 2, 2, 3, 4]) if ptype not in ("Tent", "Hut", "Dome") else 1
        names = {"Wifi", "Kitchen", "Free parking", "Self check-in", "Power backup"} | set(TYPE_AMENITIES.get(cat, []))
        names |= set(rng.sample([a for a, _ in AMENITIES], 5))
        rng.shuffle(inte)
        photos = [ext[i % len(ext)], *inte[:4]]
        listing = Listing(
            host=hosts[h], title=title, category=cat, property_type=ptype, city=city, state=state,
            address=f"{rng.randint(3, 220)}, {city} Road, {city}, {state}",
            lat=lat, lng=lng, base_price=price,
            weekend_price=round(price * 1.2 / 100) * 100 if rng.random() < 0.7 else None,
            cleaning_fee=rng.choice([0, 500, 800, 1200, 1500]),
            weekly_discount_pct=rng.choice([0, 5, 10, 15]), monthly_discount_pct=rng.choice([0, 20, 25, 30]),
            min_nights=rng.choice([1, 1, 1, 2, 2, 3]), max_nights=rng.choice([14, 30, 60]),
            check_in_time=rng.choice(["13:00", "14:00", "15:00"]), check_out_time=rng.choice(["10:00", "11:00"]),
            max_guests=bedrooms * 2 + rng.choice([0, 1, 2]), bedrooms=bedrooms, beds=bedrooms + rng.choice([0, 1]),
            baths=max(1, bedrooms - rng.choice([0, 1])),
            description=(
                f"Welcome to our {ptype.lower()} in {city}. {title} is a calm, light-filled space made for slow mornings "
                f"and long conversations. Wake up to fresh air, explore {city}'s best cafés and sights during the day, "
                f"and come back to a home that's been cleaned and set up with care.\n\n"
                f"The space\nEach room is furnished with locally made pieces, fresh linen and blackout curtains. "
                f"The kitchen is fully stocked for home-cooked meals.\n\n"
                f"Getting around\nAuto-rickshaws and cabs are easy to find. We're happy to arrange airport or "
                f"station pickup on request."
            ),
            photos=[ListingPhoto(url=U.format(p), position=j) for j, p in enumerate(photos)],
            amenities=[amenities[n] for n in sorted(names)],
            templates=[MessageTemplate(title=t, body=b, trigger=tr) for t, b, tr in TEMPLATES],
        )
        listings.append(listing)
    db.add_all(listings)
    db.flush()

    def book(listing, guest, start, nights, guests=2, status="confirmed"):
        nights = max(nights, listing.min_nights)
        end = start + timedelta(days=nights)
        b = Booking(listing=listing, guest=guest, check_in=start, check_out=end,
                    guests=min(guests, listing.max_guests), status=status,
                    **{k: v for k, v in rules.quote(listing, start, end).items() if k not in ("avg_nightly", "discount_label")})
        b.messages = rules.render_messages(b, listing, guest.name, now)
        db.add(b)
        return b

    # Past stays with reviews on most listings, so ratings aggregate and look real.
    for listing in listings:
        cursor = today - timedelta(days=rng.randint(200, 300))
        for _ in range(rng.randint(2, 6)):
            if cursor > today - timedelta(days=30):
                break
            b = book(listing, rng.choice(guests), cursor, rng.randint(2, 4))
            rating, comment = rng.choice(REVIEWS)
            db.add(Review(booking=b, listing_id=listing.id, author=b.guest, rating=rating, comment=comment,
                          created_at=datetime.combine(b.check_out, datetime.min.time()) + timedelta(hours=15)))
            cursor = b.check_out + timedelta(days=rng.randint(10, 40))
        # Upcoming reservations so the calendar shows blocked dates.
        if rng.random() < 0.6:
            book(listing, rng.choice(guests[1:]), today + timedelta(days=rng.randint(5, 40)), 3)

    # Demo guest Arjun: upcoming trips, a past stay to review, and a cancelled trip.
    arjun = guests[0]
    book(listings[6], arjun, today + timedelta(days=1), 3)  # tomorrow → "day before check-in" message is visible
    book(listings[15], arjun, today + timedelta(days=60), 2)
    book(listings[0], arjun, today - timedelta(days=20), 4)  # past, no review yet → "Leave a review"
    book(listings[22], arjun, today + timedelta(days=90), 2, status="cancelled")
    db.flush()

    # Host blocks (maintenance / personal use).
    for listing in rng.sample(listings, 10):
        start = today + timedelta(days=rng.randint(45, 80))
        if rules.is_available(db, listing.id, start, start + timedelta(days=4)):
            db.add(BlockedDate(listing_id=listing.id, start_date=start, end_date=start + timedelta(days=4), note="Maintenance"))

    for listing in (listings[1], listings[16], listings[29]):
        db.add(WishlistItem(user_id=arjun.id, listing_id=listing.id))
    db.commit()
    return len(listings)


def main():
    if "--if-empty" in sys.argv:
        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            if db.scalar(select(User.id).limit(1)):
                print("DB already seeded")
                return
    else:
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
    with SessionLocal() as db:
        print(f"Seeded {seed(db)} listings")


if __name__ == "__main__":
    main()
