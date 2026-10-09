# Airbnb Clone — Design Spec (2026-10-09)

Hiring assignment: Airbnb clone. Market: India, INR (₹). Deadline: ~2 days.

## Stack
- `backend/`: FastAPI + SQLAlchemy 2 + SQLite, pytest. Swagger at `/docs`.
- `frontend/`: Next.js 14 App Router + TypeScript + Tailwind. Libs: react-day-picker + date-fns, react-leaflet, sonner.
- Deploy: Vercel (frontend) + Railway (backend, volume mounted at `/data` holding `airbnb.db` and `uploads/`).

## Core rule
Pricing and availability live only in the backend. Frontend calls `GET /api/listings/{id}/quote`; `POST /api/bookings` recomputes and snapshots prices.

## Auth (mocked)
Frontend stores the selected user id (localStorage) and sends `X-User-Id`. Profile menu has a user switcher. A host = user owning ≥1 listing; anyone can create a listing.

## Schema
- users(id, name, email unique, avatar_url, bio, is_superhost, joined_at)
- listings(id, host_id→users, title, description, property_type, category, city, state, address, lat, lng, max_guests, bedrooms, beds, baths, base_price, weekend_price nullable, cleaning_fee, weekly_discount_pct, monthly_discount_pct, min_nights, max_nights, check_in_time, check_out_time, created_at)
- listing_photos(id, listing_id→listings cascade, url, position)
- amenities(id, name unique, icon); listing_amenities(listing_id, amenity_id) PK both
- bookings(id, listing_id, guest_id, check_in, check_out, guests, nights, nightly_total, cleaning_fee, discount, service_fee, total, status confirmed|cancelled, created_at)
- blocked_dates(id, listing_id, start_date, end_date, note) — end exclusive
- reviews(id, booking_id unique, listing_id, author_id, rating 1–5, comment, created_at)
- wishlist_items(user_id, listing_id) PK both
- message_templates(id, listing_id, title, body, trigger on_confirm|day_before_checkin|on_checkout)
- messages(id, booking_id, template_id nullable, title, body, send_at)

All date ranges are half-open `[start, end)` (check-out day is free).

## Rules
- Overlap: `a.start < b.end AND a.end > b.start` against confirmed bookings and blocked_dates. Used in search and booking.
- Booking validation: check_in ≥ today, check_out > check_in, min_nights ≤ nights ≤ max_nights, guests ≤ max_guests, host cannot book own listing, no overlap.
- Pricing: each night priced individually; Fri/Sat nights use weekend_price (fallback base_price). Discount: monthly_pct if nights ≥ 28 else weekly_pct if nights ≥ 7, applied to nightly subtotal. Then + cleaning_fee, + service fee 14% of (subtotal − discount + cleaning). Integers (₹, rounded).
- Messages: on booking create, each template rendered (`{guest_name} {listing_title} {check_in} {check_out} {address} {maps_link} {check_in_time} {check_out_time} {host_name}`) and stored with send_at (on_confirm = now; day_before_checkin = check_in − 1 day 09:00; on_checkout = check_out 09:00). Guest sees messages where send_at ≤ now. No scheduler.
- Reviews: only by the booking's guest, after check_out ≤ today, booking not cancelled, one per booking.
- Cancel: guest cancels confirmed booking with check_in > today; dates free again.

## API (`/api`)
- `GET /users`, `GET /me`, `GET /amenities`
- `GET /listings` (location, check_in, check_out, guests, category, min_price, max_price, property_type, amenities, page, page_size) → {items, total, page, pages}
- `GET /listings/{id}`, `/listings/{id}/availability` (unavailable ranges), `/listings/{id}/quote`, `/listings/{id}/reviews`
- `POST /listings`, `PUT /listings/{id}`, `DELETE /listings/{id}` (owner only)
- `GET/POST /listings/{id}/blocks`, `DELETE /blocks/{id}` (owner)
- `GET/POST /listings/{id}/templates`, `PUT/DELETE /templates/{id}` (owner)
- `POST /bookings`, `GET /bookings/me`, `POST /bookings/{id}/cancel`, `GET /bookings/{id}/messages`, `POST /bookings/{id}/review`
- `GET /host/listings`, `GET /host/bookings`
- `GET /wishlist`, `POST /wishlist/{listing_id}`, `DELETE /wishlist/{listing_id}`
- `POST /uploads` → {url}; files served at `/uploads/...`

## Pages
`/`, `/rooms/[id]`, `/book/[id]`, `/trips`, `/wishlists`, `/hosting`, `/hosting/listings/new`, `/hosting/listings/[id]/edit`, `/coming-soon` (messages, verification).

## Seed
~40 listings across Goa, Manali, Jaipur, Udaipur, Coorg, Rishikesh, Kerala, Ooty, Lonavala etc., Unsplash photos, 5 hosts (2 superhosts), 6 guests, past+upcoming bookings, reviews, blocked dates, templates.

## Out of scope
Dark mode, cloud storage, real payments/auth/messaging/WhatsApp.
