# Airbnb Clone

A full-stack Airbnb clone for the Indian market (₹ INR). Guests can search homes, view listing details, book stays with live availability, and manage their trips. Hosts can create and manage listings, control their calendar, set pricing rules and schedule automated messages to guests.

- **Live demo:** https://airbnb-clone-beta-inky-92.vercel.app
- **API docs (Swagger):** https://backend-production-2fe98.up.railway.app/docs
- **Source:** https://github.com/speghetimafia/airbnb-clone

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| UI libraries | react-day-picker (date ranges), react-leaflet + OpenStreetMap (maps), sonner (toasts), lucide-react (icons) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2 |
| Database | SQLite (foreign keys on, cascades, CHECK constraints) |
| Tests | pytest + FastAPI TestClient |
| Hosting | Vercel (frontend), Railway with a persistent volume (backend + SQLite) |

## Features

The UI follows the Airbnb app on phones (bottom tab bar, bottom-sheet dialogs, swipeable photos) and airbnb.com on desktop. Guest and host modes each have their own navigation, with a "Switching to hosting" screen in between.

**Guests** (tabs: Explore, Wishlists, Trips, Messages, Profile)
- Explore: "Recently viewed" and "Popular homes in …" rows; searching or filtering switches to the grid with infinite scroll and a map with price pins
- Where / When / Who search, category icon row, and a filters modal (price, rooms and beds, property type, amenities)
- Listing page: photo gallery, category highlight, amenities, reviews with a rating breakdown, map, host card, house rules, and a calendar with unavailable nights greyed out
- Booking card with a live price quote (weekend pricing, discounts, cleaning and service fees), then "Confirm and pay" with a mocked card
- Trips: upcoming cards and "Where you've been"; each trip page has a map, a check-in/checkout timeline, the host's messages, directions, the receipt, cancel, and leave a review
- Messages inbox, Wishlists, and a Profile with trip and review counts

**Hosts** (tabs: Today, Calendar, Listings, Messages, Menu)
- Today: reservations checking in, staying or checking out, plus upcoming ones; host cancellation
- Calendar: price calendar per home with reserved nights and host blocks; tap a first and last night to block or reopen them
- Listings: grouped Listed / Unlisted / In progress; step-by-step "create a listing" flow (about your place → make it stand out → price and publish) with a resumable draft
- Listing editor ("Your space" and "Arrival guide"): photos, title, type, rooms, location pin, amenities, pricing (weekend price, cleaning fee), discounts, availability rules, listed/unlisted status, delete
- **Booking rules from real hosting:** min/max nights, advance notice, how far ahead guests can book, and check-in/checkout times
- **Scheduled messages:** Wi-Fi details, directions and check-in steps with placeholders like `{guest_name}` and `{maps_link}`, sent on confirmation, the day before check-in, or on checkout day
- Menu: this month's earnings and overall rating

**Placeholders ("Coming soon")**: replying to messages, identity verification, Experiences and Services, and real payments.

## Running locally

Prerequisites: Python 3.12+ and Node 20+.

```bash
# Backend: http://localhost:8000 (Swagger at /docs)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt   # app + test tools (production installs requirements.txt only)
python -m app.seed            # creates data/airbnb.db with demo data (re-run to reset)
uvicorn app.main:app --reload --port 8000
```

```bash
# Frontend: http://localhost:3000
cd frontend
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

```bash
# Tests
cd backend && pytest -q
```

**Demo accounts:** log in through the menu and pick any user. *Vaibhav Kawal* (the maker, hosting his real Gurugram flat *Shivghar.2001* among others) and *Rohan Mehta* are Superhosts with listings. *Arjun Kapoor* is a guest with an upcoming trip tomorrow (so the "day before check-in" message is visible), a past stay waiting for a review, and a cancelled trip.

## Architecture

```
frontend/ (Next.js, client-rendered pages)                backend/ (FastAPI)
  app/              guest: /, /rooms/[id], /book/[id],      app/main.py     app, CORS, routers, /uploads static
                    /trips/[id], /messages, /profile        app/routers/    listings · bookings · host · users
                    host: /hosting, /hosting/calendar,      app/rules.py    pricing, availability, validation,
                    /hosting/listings/(new|[id]), menu                      message rendering (pure, unit-tested)
  components/       Header (both navs), SearchBar,          app/models.py   SQLAlchemy schema
                    ListingCard, BookingCard, MapView,      app/schemas.py  Pydantic request/response models
                    ListingFields, Inbox, Modal (<dialog>)  app/deps.py     DB session, mocked auth, ownership
  lib/api.ts        fetch wrapper (adds X-User-Id)          app/db.py       engine + additive schema migration
  lib/user.tsx      session + wishlist context              app/seed.py     demo data
  lib/useApi.ts     GET + loading/error hook
  lib/storage.ts    recently viewed + listing draft (localStorage)
```

**Key decisions**
- **The backend is the only place prices and availability are calculated.** The listing page, search cards (when dates are set) and checkout all show numbers from `GET /listings/{id}/quote`, and `POST /bookings` recalculates them before saving. The price shown can never differ from the price charged.
- **Bookings store a copy of the price.** Each booking saves nightly total, discount, fees and total, so a later price change by the host never alters past bookings.
- **Date ranges are half-open `[check_in, check_out)`.** Two stays overlap when `a.start < b.end AND a.end > b.start`. The checkout day is free for the next check-in, so back-to-back bookings work. The same SQL `EXISTS` clause is used by search, quotes, bookings and host blocks.
- **Preventing double-booking:** the availability check and the insert run under one process-wide lock, so two concurrent requests can't both pass the check. This holds for a single server process; running more than one worker would need a database-level lock (e.g. `BEGIN IMMEDIATE`).
- **Messages need no background job.** On booking, each template is filled in and stored with a `send_at` time. The inbox only returns messages whose `send_at` has passed. A "day before check-in" message for a last-minute booking is sent right after the confirmation instead.
- **Mocked auth:** the frontend stores the chosen user id and sends `X-User-Id`. All authorization (owner-only edits, guest-only reviews, guest-or-host cancellation) is enforced on the server in `deps.py` and the routers. A user counts as a host once they own a listing.
- **Search state lives in the URL** (`/?location=Goa&check_in=…&category=…`), so searches can be shared and the back button works.
- **Schema changes without losing data:** on startup `sync_schema()` creates missing tables and adds missing columns with their defaults, which is how the live database picked up listing status and booking rules. Renames or drops would need Alembic.
- **Dialogs use the native `<dialog>` element**, so the browser traps focus, makes the page behind inert and handles Esc. Errors inside a dialog are shown in the dialog, because dialogs render above toasts.

## Database schema

```mermaid
erDiagram
    users ||--o{ listings : hosts
    users ||--o{ bookings : books
    users ||--o{ reviews : writes
    users ||--o{ wishlist_items : saves
    listings ||--o{ listing_photos : has
    listings }o--o{ amenities : "listing_amenities"
    listings ||--o{ bookings : receives
    listings ||--o{ blocked_dates : "host blocks"
    listings ||--o{ message_templates : "host writes"
    listings ||--o{ wishlist_items : "saved in"
    bookings ||--o| reviews : "reviewed by (1:1)"
    bookings ||--o{ messages : "gets"
    message_templates ||--o{ messages : "rendered into"
```

| Table | Columns (key ones) | Constraints |
|---|---|---|
| `users` | name, email, avatar_url, bio, is_superhost, joined_at | email unique |
| `listings` | host_id, title, description, property_type, category, city, state, address, lat, lng, max_guests, bedrooms, beds, baths, base_price, weekend_price, cleaning_fee, weekly_discount_pct, monthly_discount_pct, min_nights, max_nights, check_in_time, check_out_time, advance_notice_days, availability_window_days, is_listed | price > 0, min ≤ max nights, discounts 0–90, index on city |
| `listing_photos` | listing_id, url, position | cascade delete |
| `amenities`, `listing_amenities` | name, icon / (listing_id, amenity_id) | composite PK |
| `bookings` | listing_id, guest_id, check_in, check_out, guests, nights, nightly_total, discount, cleaning_fee, service_fee, total, status | check_out > check_in, status ∈ {confirmed, cancelled}, index (listing_id, check_in, check_out) |
| `blocked_dates` | listing_id, start_date, end_date, note | end > start |
| `reviews` | booking_id, listing_id, author_id, rating, comment | booking_id unique (one review per stay), rating 1–5 |
| `wishlist_items` | user_id, listing_id | composite PK, so it's idempotent |
| `message_templates` | listing_id, title, body, trigger | trigger ∈ {on_confirm, day_before_checkin, on_checkout} |
| `messages` | booking_id, template_id, title, body, send_at | template_id SET NULL on delete |

Ratings are computed from `reviews` (AVG/COUNT subquery) rather than stored on the listing, so they can never drift out of date.

## API overview

All routes are under `/api`. Interactive docs are at `/docs`. Requests that need a user send `X-User-Id`.

| Method & path | Purpose |
|---|---|
| `GET /listings` | Search (listed homes only): `location, check_in, check_out, guests, category, property_type, min_price, max_price, bedrooms, beds, amenities, page, page_size` → `{items, total, page, pages}` |
| `GET /listings/{id}` | Detail with host, photos, amenities, rating |
| `GET /listings/{id}/availability` | Booked + blocked ranges from today |
| `GET /listings/{id}/quote?check_in&check_out&guests` | Validated price breakdown (422 rule violation, 409 unavailable) |
| `GET /listings/{id}/reviews` | Reviews, newest first |
| `POST /listings`, `PUT /listings/{id}`, `DELETE /listings/{id}` | Host CRUD (owner only; delete blocked while upcoming reservations exist) |
| `GET/POST /listings/{id}/blocks`, `DELETE /blocks/{id}` | Host calendar blocks |
| `GET/POST /listings/{id}/templates`, `PUT/DELETE /templates/{id}` | Scheduled message templates |
| `POST /bookings` | Book (validates dates, min/max nights, advance notice, booking window, guests, listed status, own listing, overlap) |
| `GET /bookings/me` | My trips |
| `GET /bookings/{id}` | One booking (its guest or host) |
| `GET /bookings/inbox?role=guest\|host` | Message threads with the latest due message |
| `POST /bookings/{id}/cancel` | Guest or host cancels before check-in |
| `GET /bookings/{id}/messages` | Messages that are due |
| `POST /bookings/{id}/review` | Review after checkout, once |
| `GET /host/listings`, `GET /host/bookings` | Host dashboard data |
| `GET /wishlist`, `GET /wishlist/ids`, `POST/DELETE /wishlist/{listing_id}` | Wishlist |
| `GET /users`, `GET /me`, `GET /amenities` | Login switcher, session with trip/review counts, amenity list |
| `POST /uploads` | Image upload (JPEG/PNG/WebP, ≤ 5 MB) → `{url}` |

## Deployment

The frontend auto-deploys from GitHub on every push to `main`. The backend is deployed with `railway up` (it auto-deploys too once Railway's GitHub app is connected to the repo).

**Backend on Railway**: service root `/backend`, watch paths `/backend/**`.
- `railpack.json` sets the start command, `python -m app.main`, which seeds an empty database and then serves on `$PORT`.
- A volume is mounted at `/data`. Variables: `DATA_DIR=/data`, `CORS_ORIGINS=<the Vercel URL>`.

**Frontend on Vercel**: root directory `frontend`, production branch `main`.
- Variable: `NEXT_PUBLIC_API_URL=<the Railway URL>`.

## Assumptions and simplifications

- Payments are mocked. The card form only checks the format and nothing is charged. Cancelling before check-in gives a full refund.
- Auth is mocked with a user switcher, but every permission is still checked on the server.
- Prices are whole rupees. The service fee is a flat 14% of (nights − discount + cleaning). Taxes and GST are not modelled.
- Weekend nights are Friday and Saturday. Only one discount applies: the monthly discount for 28+ nights if the host set one, otherwise the weekly discount for 7+ nights.
- Search location is a case-insensitive match on city, state or title. There is no geocoding.
- The Airbnb Cereal font (© Airbnb, all rights reserved) is self-hosted for visual fidelity in this non-commercial demo.
- Uploaded images go on the backend's volume rather than cloud storage. Seed photos come from Unsplash and avatars from pravatar.cc.
- Seed dates are relative to the day the database was seeded, so the demo always has upcoming and past trips.
- Editing a template only affects future bookings, because messages are filled in when the booking is made.
