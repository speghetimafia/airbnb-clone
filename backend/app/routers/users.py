import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, UploadFile
from sqlalchemy import exists, func, select

from ..db import UPLOAD_DIR
from ..deps import DB, CurrentUser, get_listing
from ..models import Amenity, Booking, Listing, Review, User, WishlistItem
from ..schemas import AmenityOut, ListingCard, UserDetail
from .listings import card_query, to_card

router = APIRouter(tags=["users"])


def with_is_host(db, user: User) -> UserDetail:
    out = UserDetail.model_validate(user)
    out.is_host = db.scalar(select(exists().where(Listing.host_id == user.id)))
    return out


@router.get("/users", response_model=list[UserDetail])
def users(db: DB):
    """Everyone the mocked login switcher can pick from."""
    return [with_is_host(db, u) for u in db.scalars(select(User).order_by(User.id))]


@router.get("/me", response_model=UserDetail)
def me(db: DB, user: CurrentUser):
    out = with_is_host(db, user)
    out.trip_count = db.scalar(select(func.count()).where(
        Booking.guest_id == user.id, Booking.status == "confirmed", Booking.check_out <= date.today()))
    out.review_count = db.scalar(select(func.count()).where(Review.author_id == user.id))
    return out


@router.get("/amenities", response_model=list[AmenityOut])
def amenities(db: DB):
    return db.scalars(select(Amenity).order_by(Amenity.name)).all()


@router.get("/wishlist", response_model=list[ListingCard])
def wishlist(db: DB, user: CurrentUser):
    q = card_query()
    q = q.join(WishlistItem, WishlistItem.listing_id == Listing.id).where(WishlistItem.user_id == user.id)
    return [to_card(*r) for r in db.execute(q.order_by(WishlistItem.created_at.desc()))]


@router.get("/wishlist/ids", response_model=list[int])
def wishlist_ids(db: DB, user: CurrentUser):
    """Cheap lookup so every card's heart can render filled/empty."""
    return db.scalars(select(WishlistItem.listing_id).where(WishlistItem.user_id == user.id)).all()


@router.post("/wishlist/{listing_id}", status_code=204)
def save(listing_id: int, db: DB, user: CurrentUser):
    get_listing(db, listing_id)
    db.merge(WishlistItem(user_id=user.id, listing_id=listing_id))  # idempotent
    db.commit()


@router.delete("/wishlist/{listing_id}", status_code=204)
def unsave(listing_id: int, db: DB, user: CurrentUser):
    if item := db.get(WishlistItem, (user.id, listing_id)):
        db.delete(item)
        db.commit()


ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_BYTES = 5 * 1024 * 1024


@router.post("/uploads")
async def upload(file: UploadFile, user: CurrentUser):
    ext = ALLOWED.get(file.content_type or "")
    if not ext:
        raise HTTPException(415, "Upload a JPEG, PNG or WebP image")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Images must be under 5 MB")
    name = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    return {"url": f"/uploads/{name}"}
