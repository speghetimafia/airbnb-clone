"""Business rules shared by search, quotes and bookings: pricing, availability, stay validation, auto-messages.

All date ranges are half-open [start, end): the check-out day is free for the next guest.
"""
from datetime import date, datetime, time, timedelta

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from .models import BlockedDate, Booking, Listing, Message

SERVICE_FEE_PCT = 14
WEEKLY_NIGHTS = 7
MONTHLY_NIGHTS = 28


def nightly_rate(listing: Listing, night: date) -> int:
    # Friday and Saturday nights are the weekend nights.
    if listing.weekend_price and night.weekday() in (4, 5):
        return listing.weekend_price
    return listing.base_price


def quote(listing: Listing, check_in: date, check_out: date) -> dict:
    nights = (check_out - check_in).days
    nightly_total = sum(nightly_rate(listing, check_in + timedelta(d)) for d in range(nights))

    discount_pct, discount_label = 0, ""
    if nights >= MONTHLY_NIGHTS and listing.monthly_discount_pct:
        discount_pct, discount_label = listing.monthly_discount_pct, "Monthly stay discount"
    elif nights >= WEEKLY_NIGHTS and listing.weekly_discount_pct:
        discount_pct, discount_label = listing.weekly_discount_pct, "Weekly stay discount"
    discount = round(nightly_total * discount_pct / 100)

    cleaning_fee = listing.cleaning_fee
    service_fee = round((nightly_total - discount + cleaning_fee) * SERVICE_FEE_PCT / 100)
    return {
        "nights": nights,
        "avg_nightly": round(nightly_total / nights) if nights else 0,
        "nightly_total": nightly_total,
        "discount": discount,
        "discount_label": discount_label,
        "cleaning_fee": cleaning_fee,
        "service_fee": service_fee,
        "total": nightly_total - discount + cleaning_fee + service_fee,
    }


def unavailable_exists(listing_id_col, start: date, end: date):
    """SQL EXISTS clause: true when the listing has a confirmed booking or host block overlapping [start, end)."""
    booked = exists().where(
        Booking.listing_id == listing_id_col,
        Booking.status == "confirmed",
        Booking.check_in < end,
        Booking.check_out > start,
    )
    blocked = exists().where(
        BlockedDate.listing_id == listing_id_col,
        BlockedDate.start_date < end,
        BlockedDate.end_date > start,
    )
    return booked | blocked


def is_available(db: Session, listing_id: int, start: date, end: date) -> bool:
    return not db.scalar(select(unavailable_exists(listing_id, start, end)))


def stay_error(listing: Listing, check_in: date, check_out: date, guests: int, today: date) -> str | None:
    """Validation that doesn't need the DB. Returns a human message or None."""
    if check_in < today:
        return "Check-in can't be in the past"
    if check_out <= check_in:
        return "Check-out must be after check-in"
    nights = (check_out - check_in).days
    if nights < listing.min_nights:
        return f"Minimum stay is {listing.min_nights} night{'s' if listing.min_nights > 1 else ''}"
    if nights > listing.max_nights:
        return f"Maximum stay is {listing.max_nights} nights"
    if guests < 1:
        return "At least 1 guest is required"
    if guests > listing.max_guests:
        return f"This place allows a maximum of {listing.max_guests} guests"
    return None


def _send_at(trigger: str, booking: Booking, now: datetime) -> datetime:
    if trigger == "day_before_checkin":
        return datetime.combine(booking.check_in - timedelta(days=1), time(9))
    if trigger == "on_checkout":
        return datetime.combine(booking.check_out, time(9))
    return now


def render_messages(booking: Booking, listing: Listing, guest_name: str, now: datetime) -> list[Message]:
    """Fill each host template for this booking. Unknown {placeholders} are left as typed."""
    values = {
        "guest_name": guest_name.split()[0],
        "host_name": listing.host.name.split()[0],
        "listing_title": listing.title,
        "check_in": booking.check_in.strftime("%a, %d %b %Y"),
        "check_out": booking.check_out.strftime("%a, %d %b %Y"),
        "check_in_time": listing.check_in_time,
        "check_out_time": listing.check_out_time,
        "address": listing.address or f"{listing.city}, {listing.state}",
        "maps_link": f"https://maps.google.com/?q={listing.lat},{listing.lng}",
    }

    def fill(text: str) -> str:
        for k, v in values.items():
            text = text.replace("{" + k + "}", v)
        return text

    return [
        Message(template_id=t.id, title=fill(t.title), body=fill(t.body), send_at=_send_at(t.trigger, booking, now))
        for t in listing.templates
    ]
