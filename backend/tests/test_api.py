import os
import tempfile
import time
from datetime import date, timedelta

os.environ["DATA_DIR"] = tempfile.mkdtemp()  # isolated DB, set before the app imports

import pytest
from fastapi.testclient import TestClient

from app import rules
from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Listing
from app.seed import seed

client = TestClient(app)
GUEST, OTHER_GUEST, HOST = {"X-User-Id": "6"}, {"X-User-Id": "7"}, {"X-User-Id": "1"}
D = lambda n: (date.today() + timedelta(days=n)).isoformat()  # noqa: E731


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


def new_listing(**over):
    body = dict(
        title="Test villa", description="A lovely test villa by the sea.", property_type="Villa", category="Beachfront",
        city="Goa", state="Goa", lat=15.5, lng=73.8, max_guests=4, bedrooms=2, beds=2, baths=2, base_price=1000,
        weekend_price=2000, cleaning_fee=500, weekly_discount_pct=10, min_nights=2, max_nights=10,
        photo_urls=["https://images.unsplash.com/photo-1"], amenity_ids=[1, 2],
    )
    body.update(over)
    r = client.post("/api/listings", json=body, headers=HOST)
    assert r.status_code == 201, r.text
    return r.json()


def test_pricing_weekend_discount_fees():
    listing = Listing(base_price=1000, weekend_price=2000, cleaning_fee=500, weekly_discount_pct=10, monthly_discount_pct=0)
    monday = date(2026, 10, 5)
    q = rules.quote(listing, monday, monday + timedelta(days=7))  # Mon..Sun: Fri+Sat at weekend price
    assert q["nightly_total"] == 5 * 1000 + 2 * 2000
    assert q["discount"] == 900
    assert q["service_fee"] == round((9000 - 900 + 500) * 0.14)
    assert q["total"] == 9000 - 900 + 500 + q["service_fee"]


def test_booking_blocks_overlaps_and_allows_back_to_back():
    lid = new_listing()["id"]
    r = client.post("/api/bookings", json={"listing_id": lid, "check_in": D(10), "check_out": D(13), "guests": 2}, headers=GUEST)
    assert r.status_code == 201, r.text
    overlap = {"listing_id": lid, "check_in": D(12), "check_out": D(14), "guests": 2}
    assert client.post("/api/bookings", json=overlap, headers=OTHER_GUEST).status_code == 409
    back_to_back = {"listing_id": lid, "check_in": D(13), "check_out": D(15), "guests": 2}
    assert client.post("/api/bookings", json=back_to_back, headers=OTHER_GUEST).status_code == 201

    # Search hides it for the taken dates, shows it after cancelling.
    ids = lambda: [i["id"] for i in client.get(f"/api/listings?check_in={D(10)}&check_out={D(12)}&page_size=48").json()["items"]]  # noqa: E731
    assert lid not in ids()
    assert client.post(f"/api/bookings/{r.json()['id']}/cancel", headers=GUEST).status_code == 200
    assert lid in ids()


def test_booking_validation_rules():
    lid = new_listing()["id"]
    cases = [
        ({"check_in": D(-1), "check_out": D(2), "guests": 1}, GUEST, 422),  # past
        ({"check_in": D(5), "check_out": D(6), "guests": 1}, GUEST, 422),  # below min nights
        ({"check_in": D(5), "check_out": D(20), "guests": 1}, GUEST, 422),  # above max nights
        ({"check_in": D(5), "check_out": D(7), "guests": 9}, GUEST, 422),  # too many guests
        ({"check_in": D(5), "check_out": D(7), "guests": 1}, HOST, 400),  # own listing
    ]
    for body, who, code in cases:
        assert client.post("/api/bookings", json={"listing_id": lid, **body}, headers=who).status_code == code, body


def test_host_block_hides_dates_and_rejects_bookings():
    lid = new_listing()["id"]
    assert client.post(f"/api/listings/{lid}/blocks", json={"start_date": D(20), "end_date": D(25)}, headers=HOST).status_code == 201
    assert client.post(f"/api/listings/{lid}/blocks", json={"start_date": D(20), "end_date": D(25)}, headers=GUEST).status_code == 403
    r = client.post("/api/bookings", json={"listing_id": lid, "check_in": D(22), "check_out": D(24), "guests": 1}, headers=GUEST)
    assert r.status_code == 409
    assert {"start": D(20), "end": D(25)} in client.get(f"/api/listings/{lid}/availability").json()


def test_automated_messages_render_and_schedule():
    lid = new_listing()["id"]
    client.post(f"/api/listings/{lid}/templates", json={"title": "Wifi", "body": "Hi {guest_name}, wifi is abc. {maps_link}", "trigger": "on_confirm"}, headers=HOST)
    client.post(f"/api/listings/{lid}/templates", json={"title": "Later", "body": "See you", "trigger": "day_before_checkin"}, headers=HOST)
    b = client.post("/api/bookings", json={"listing_id": lid, "check_in": D(10), "check_out": D(12), "guests": 1}, headers=GUEST).json()
    msgs = client.get(f"/api/bookings/{b['id']}/messages", headers=GUEST).json()
    assert [m["title"] for m in msgs] == ["Wifi"]  # the day-before one isn't due yet
    assert msgs[0]["body"].startswith("Hi Arjun, wifi is abc. https://maps.google.com/?q=15.5,73.8")
    assert client.get(f"/api/bookings/{b['id']}/messages", headers=OTHER_GUEST).status_code == 403


def test_last_minute_booking_orders_messages_after_confirmation():
    lid = new_listing(min_nights=1)["id"]
    client.post(f"/api/listings/{lid}/templates", json={"title": "Confirmed", "body": "In at {check_in_time}", "trigger": "on_confirm"}, headers=HOST)
    client.post(f"/api/listings/{lid}/templates", json={"title": "Day before", "body": "x", "trigger": "day_before_checkin"}, headers=HOST)
    b = client.post("/api/bookings", json={"listing_id": lid, "check_in": D(0), "check_out": D(1), "guests": 1}, headers=GUEST).json()
    time.sleep(1.1)  # the day-before message is scheduled 1s after confirmation
    msgs = client.get(f"/api/bookings/{b['id']}/messages", headers=GUEST).json()
    assert [m["title"] for m in msgs] == ["Confirmed", "Day before"]
    assert msgs[0]["body"] == "In at 2:00 PM"


def test_review_only_after_checkout_once():
    trips = client.get("/api/bookings/me", headers=GUEST).json()
    past = next(t for t in trips if t["check_out"] < D(0) and t["status"] == "confirmed" and not t["has_review"])
    future = next(t for t in trips if t["check_in"] > D(0) and t["status"] == "confirmed")
    body = {"rating": 5, "comment": "Great stay"}
    assert client.post(f"/api/bookings/{future['id']}/review", json=body, headers=GUEST).status_code == 400
    assert client.post(f"/api/bookings/{past['id']}/review", json=body, headers=GUEST).status_code == 201
    assert client.post(f"/api/bookings/{past['id']}/review", json=body, headers=GUEST).status_code == 409


def test_listing_crud_and_ownership():
    listing = new_listing()
    lid = listing["id"]
    assert listing["host"]["id"] == 1 and len(listing["amenities"]) == 2
    upd = {**{k: listing[k] for k in ("title", "description", "property_type", "category", "city", "state", "lat", "lng",
                                       "max_guests", "bedrooms", "beds", "baths")},
           "base_price": 1500, "photo_urls": ["https://x.com/a.jpg", "/uploads/b.png"], "amenity_ids": []}
    assert client.put(f"/api/listings/{lid}", json=upd, headers=GUEST).status_code == 403
    r = client.put(f"/api/listings/{lid}", json=upd, headers=HOST)
    assert r.status_code == 200 and r.json()["base_price"] == 1500 and len(r.json()["photos"]) == 2
    b = client.post("/api/bookings", json={"listing_id": lid, "check_in": D(3), "check_out": D(5), "guests": 1}, headers=GUEST).json()
    assert client.delete(f"/api/listings/{lid}", headers=HOST).status_code == 409  # upcoming reservation
    client.post(f"/api/bookings/{b['id']}/cancel", headers=GUEST)
    assert client.delete(f"/api/listings/{lid}", headers=HOST).status_code == 204
    assert b["id"] not in [t["id"] for t in client.get("/api/bookings/me", headers=GUEST).json()]  # DB cascade
    other = new_listing()["id"]
    assert client.delete(f"/api/listings/{other}", headers=HOST).status_code == 204
    assert client.get(f"/api/listings/{other}").status_code == 404


def test_search_filters_and_pagination():
    page = client.get("/api/listings?page_size=12").json()
    assert page["total"] == 39 and page["pages"] == 4  # one seeded listing is unlisted and len(page["items"]) == 12
    goa = client.get("/api/listings?location=goa").json()["items"]
    assert goa and all(i["state"] == "Goa" or "Goa" in i["title"] for i in goa)
    cheap = client.get("/api/listings?max_price=3000").json()["items"]
    assert all(i["base_price"] <= 3000 for i in cheap)
    pools = client.get("/api/listings?category=Amazing pools").json()["items"]
    assert pools and all(i["category"] == "Amazing pools" for i in pools)


def test_unlisted_notice_and_window_rules():
    lid = new_listing(min_nights=1, advance_notice_days=2, availability_window_days=90)["id"]
    book = lambda a, b: client.post("/api/bookings", json={"listing_id": lid, "check_in": D(a), "check_out": D(b), "guests": 1}, headers=GUEST)  # noqa: E731
    assert book(1, 2).status_code == 422  # less than 2 days' notice
    assert book(89, 91).status_code == 422  # beyond the 90-day window
    found = lambda: lid in [i["id"] for i in client.get(f"/api/listings?check_in={D(5)}&check_out={D(6)}&page_size=48").json()["items"]]  # noqa: E731
    assert found()
    listing = client.get(f"/api/listings/{lid}").json()
    body = {**{k: listing[k] for k in ("title", "description", "property_type", "category", "city", "state", "lat", "lng",
                                       "max_guests", "bedrooms", "beds", "baths", "base_price")},
            "photo_urls": [p["url"] for p in listing["photos"]], "is_listed": False}
    assert client.put(f"/api/listings/{lid}", json=body, headers=HOST).status_code == 200
    assert not found()
    assert book(5, 6).status_code == 422  # unlisted can't be booked


def test_inbox_and_profile_stats():
    me = client.get("/api/me", headers=GUEST).json()
    assert me["trip_count"] >= 1 and me["review_count"] >= 0
    threads = client.get("/api/bookings/inbox", headers=GUEST).json()
    assert threads and all(t["booking"]["guest"]["id"] == 6 and t["count"] >= 1 for t in threads)
    host_threads = client.get("/api/bookings/inbox?role=host", headers=HOST).json()
    assert host_threads and all(t["booking"]["listing"]["host"]["id"] == 1 for t in host_threads)
    b = threads[0]["booking"]["id"]
    assert client.get(f"/api/bookings/{b}", headers=GUEST).json()["listing"]["address"]
    assert client.get(f"/api/bookings/{b}", headers={"X-User-Id": "9"}).status_code == 403


def test_sync_schema_adds_new_columns_to_old_db():
    from sqlalchemy import inspect, text
    from app.db import sync_schema
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE listings DROP COLUMN is_listed"))
    sync_schema()
    assert "is_listed" in {c["name"] for c in inspect(engine).get_columns("listings")}
    assert client.get("/api/listings?page_size=1").json()["total"] > 0  # existing rows default to listed


def test_wishlist_toggle():
    assert client.post("/api/wishlist/5", headers=GUEST).status_code == 204
    assert client.post("/api/wishlist/5", headers=GUEST).status_code == 204  # idempotent
    assert 5 in client.get("/api/wishlist/ids", headers=GUEST).json()
    client.delete("/api/wishlist/5", headers=GUEST)
    assert 5 not in client.get("/api/wishlist/ids", headers=GUEST).json()
    assert client.get("/api/wishlist").status_code == 401
