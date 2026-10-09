"""Host-only tools: dashboard data, calendar blocks, automated message templates."""
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from .. import rules
from ..deps import DB, CurrentUser, owned_listing
from ..models import BlockedDate, Booking, Listing, MessageTemplate
from ..schemas import BlockIn, BlockOut, BookingOut, ListingCard, TemplateIn, TemplateOut
from .bookings import booking_query, to_out
from .listings import card_query, to_card

router = APIRouter(tags=["host"])


@router.get("/host/listings", response_model=list[ListingCard])
def my_listings(db: DB, user: CurrentUser):
    q = card_query()
    return [to_card(*r) for r in db.execute(q.where(Listing.host_id == user.id).order_by(Listing.id.desc()))]


@router.get("/host/bookings", response_model=list[BookingOut])
def my_reservations(db: DB, user: CurrentUser):
    rows = db.scalars(booking_query().join(Booking.listing).where(Listing.host_id == user.id).order_by(Booking.check_in))
    return [to_out(b) for b in rows.unique()]


# --- Calendar blocks ---

@router.get("/listings/{listing_id}/blocks", response_model=list[BlockOut])
def list_blocks(listing_id: int, db: DB, user: CurrentUser):
    return owned_listing(db, listing_id, user).blocks


@router.post("/listings/{listing_id}/blocks", response_model=BlockOut, status_code=201)
def add_block(listing_id: int, data: BlockIn, db: DB, user: CurrentUser):
    owned_listing(db, listing_id, user)
    if not rules.is_available(db, listing_id, data.start_date, data.end_date):
        raise HTTPException(409, "Those dates overlap a reservation or an existing block")
    block = BlockedDate(listing_id=listing_id, **data.model_dump())
    db.add(block)
    db.commit()
    return block


@router.delete("/blocks/{block_id}", status_code=204)
def delete_block(block_id: int, db: DB, user: CurrentUser):
    block = db.get(BlockedDate, block_id)
    if not block:
        raise HTTPException(404, "Block not found")
    owned_listing(db, block.listing_id, user)
    db.delete(block)
    db.commit()


# --- Automated message templates ---

@router.get("/listings/{listing_id}/templates", response_model=list[TemplateOut])
def list_templates(listing_id: int, db: DB, user: CurrentUser):
    return owned_listing(db, listing_id, user).templates


@router.post("/listings/{listing_id}/templates", response_model=TemplateOut, status_code=201)
def add_template(listing_id: int, data: TemplateIn, db: DB, user: CurrentUser):
    owned_listing(db, listing_id, user)
    t = MessageTemplate(listing_id=listing_id, **data.model_dump())
    db.add(t)
    db.commit()
    return t


def owned_template(db, template_id: int, user) -> MessageTemplate:
    t = db.get(MessageTemplate, template_id)
    if not t:
        raise HTTPException(404, "Template not found")
    owned_listing(db, t.listing_id, user)
    return t


@router.put("/templates/{template_id}", response_model=TemplateOut)
def update_template(template_id: int, data: TemplateIn, db: DB, user: CurrentUser):
    t = owned_template(db, template_id, user)
    for k, v in data.model_dump().items():
        setattr(t, k, v)
    db.commit()
    return t


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: int, db: DB, user: CurrentUser):
    db.delete(owned_template(db, template_id, user))
    db.commit()
