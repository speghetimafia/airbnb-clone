import threading
from datetime import date, datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from .. import rules
from ..deps import DB, CurrentUser, get_listing
from ..models import Booking, Listing, Message, Review
from ..schemas import BookingIn, BookingOut, MessageOut, ReviewIn, ReviewOut

router = APIRouter(prefix="/bookings", tags=["bookings"])

# ponytail: one process-wide lock makes check-then-insert atomic; needs a DB-level lock if we run >1 worker.
_booking_lock = threading.Lock()


def booking_query():
    return select(Booking).options(
        joinedload(Booking.listing).joinedload(Listing.host),
        joinedload(Booking.listing).selectinload(Listing.photos),
        joinedload(Booking.guest),
        selectinload(Booking.review),
    )


def to_out(b: Booking) -> BookingOut:
    out = BookingOut.model_validate(b)
    out.has_review = b.review is not None
    return out


def get_booking(db, booking_id: int) -> Booking:
    b = db.scalar(booking_query().where(Booking.id == booking_id))
    if not b:
        raise HTTPException(404, "Booking not found")
    return b


@router.post("", response_model=BookingOut, status_code=201)
def create(data: BookingIn, db: DB, user: CurrentUser):
    listing = get_listing(db, data.listing_id)
    if listing.host_id == user.id:
        raise HTTPException(400, "You can't book your own listing")
    if err := rules.stay_error(listing, data.check_in, data.check_out, data.guests, date.today()):
        raise HTTPException(422, err)

    with _booking_lock:
        if not rules.is_available(db, listing.id, data.check_in, data.check_out):
            raise HTTPException(409, "Those dates were just booked. Pick different dates.")
        price = rules.quote(listing, data.check_in, data.check_out)
        price.pop("avg_nightly"), price.pop("discount_label")
        booking = Booking(
            listing_id=listing.id, guest_id=user.id, check_in=data.check_in, check_out=data.check_out,
            guests=data.guests, status="confirmed", **price,
        )
        booking.messages = rules.render_messages(booking, listing, user.name, datetime.now())
        db.add(booking)
        db.commit()
    return to_out(get_booking(db, booking.id))


@router.get("/me", response_model=list[BookingOut])
def my_trips(db: DB, user: CurrentUser):
    rows = db.scalars(booking_query().where(Booking.guest_id == user.id).order_by(Booking.check_in.desc()))
    return [to_out(b) for b in rows.unique()]


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel(booking_id: int, db: DB, user: CurrentUser):
    """Guest or the listing's host may cancel before check-in. The dates free up immediately."""
    b = get_booking(db, booking_id)
    if user.id not in (b.guest_id, b.listing.host_id):
        raise HTTPException(403, "Not your booking")
    if b.status != "confirmed":
        raise HTTPException(400, "Booking is already cancelled")
    if b.check_in <= date.today():
        raise HTTPException(400, "Stays that have started can't be cancelled")
    b.status = "cancelled"
    db.commit()
    return to_out(b)


@router.get("/{booking_id}/messages", response_model=list[MessageOut])
def messages(booking_id: int, db: DB, user: CurrentUser):
    """Host's automated messages that are due. Scheduled ones appear once send_at passes; no worker needed."""
    b = get_booking(db, booking_id)
    if user.id not in (b.guest_id, b.listing.host_id):
        raise HTTPException(403, "Not your booking")
    if b.status != "confirmed":
        return []
    return db.scalars(
        select(Message).where(Message.booking_id == b.id, Message.send_at <= datetime.now()).order_by(Message.send_at)
    ).all()


@router.post("/{booking_id}/review", response_model=ReviewOut, status_code=201)
def review(booking_id: int, data: ReviewIn, db: DB, user: CurrentUser):
    b = get_booking(db, booking_id)
    if b.guest_id != user.id:
        raise HTTPException(403, "Only the guest can review this stay")
    if b.status != "confirmed" or b.check_out > date.today():
        raise HTTPException(400, "You can review a stay after check-out")
    if b.review:
        raise HTTPException(409, "You already reviewed this stay")
    r = Review(booking_id=b.id, listing_id=b.listing_id, author_id=user.id, **data.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r, ["author"])
    return r
