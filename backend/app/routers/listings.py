from datetime import date
from math import ceil

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from .. import rules
from ..deps import DB, CurrentUser, get_listing, owned_listing
from ..models import Amenity, BlockedDate, Booking, Listing, ListingPhoto, Review, listing_amenities
from ..schemas import ListingCard, ListingDetail, ListingIn, Page, Quote, Range, ReviewOut

router = APIRouter(prefix="/listings", tags=["listings"])


def rating_stats():
    return (
        select(Review.listing_id, func.avg(Review.rating).label("rating"), func.count().label("review_count"))
        .group_by(Review.listing_id)
        .subquery()
    )


def card_query():
    stats = rating_stats()
    q = (
        select(Listing, stats.c.rating, stats.c.review_count)
        .outerjoin(stats, stats.c.listing_id == Listing.id)
        .options(selectinload(Listing.photos), joinedload(Listing.host))
    )
    return q, stats


def to_card(listing: Listing, rating, review_count) -> ListingCard:
    return ListingCard(
        id=listing.id, title=listing.title, city=listing.city, state=listing.state,
        property_type=listing.property_type, category=listing.category, lat=listing.lat, lng=listing.lng,
        base_price=listing.base_price, photos=[p.url for p in listing.photos[:5]],
        rating=round(rating, 2) if rating else None, review_count=review_count or 0,
        host_is_superhost=listing.host.is_superhost,
    )


def parse_ids(csv: str | None) -> list[int]:
    try:
        return [int(x) for x in csv.split(",") if x.strip()] if csv else []
    except ValueError:
        raise HTTPException(422, "Expected comma-separated ids")


@router.get("", response_model=Page)
def search(
    db: DB,
    location: str | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    guests: int = Query(1, ge=1),
    category: str | None = None,
    property_type: str | None = Query(None, description="Comma-separated, e.g. Villa,Cabin"),
    min_price: int | None = Query(None, ge=0),
    max_price: int | None = Query(None, ge=0),
    bedrooms: int = Query(0, ge=0),
    beds: int = Query(0, ge=0),
    amenities: str | None = Query(None, description="Comma-separated amenity ids; listing must have all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=48),
):
    q, stats = card_query()
    filters = [Listing.max_guests >= guests, Listing.bedrooms >= bedrooms, Listing.beds >= beds]
    if location:
        like = f"%{location.strip()}%"
        filters.append(or_(Listing.city.ilike(like), Listing.state.ilike(like), Listing.title.ilike(like)))
    if check_in or check_out:
        if not (check_in and check_out) or check_out <= check_in:
            raise HTTPException(422, "Provide a valid check-in and check-out")
        nights = (check_out - check_in).days
        filters += [
            ~rules.unavailable_exists(Listing.id, check_in, check_out),
            Listing.min_nights <= nights,
            Listing.max_nights >= nights,
        ]
    if category:
        filters.append(Listing.category == category)
    if property_type:
        filters.append(Listing.property_type.in_(property_type.split(",")))
    if min_price is not None:
        filters.append(Listing.base_price >= min_price)
    if max_price is not None:
        filters.append(Listing.base_price <= max_price)
    for amenity_id in parse_ids(amenities):
        filters.append(Listing.id.in_(select(listing_amenities.c.listing_id).where(listing_amenities.c.amenity_id == amenity_id)))

    q = q.where(*filters)
    total = db.scalar(select(func.count()).select_from(select(Listing.id).where(*filters).subquery()))
    rows = db.execute(q.order_by(Listing.id).offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[to_card(*r) for r in rows], total=total, page=page, pages=ceil(total / page_size))


@router.get("/{listing_id}", response_model=ListingDetail)
def detail(listing_id: int, db: DB):
    q, stats = card_query()
    row = db.execute(q.where(Listing.id == listing_id).options(selectinload(Listing.amenities))).first()
    if not row:
        raise HTTPException(404, "Listing not found")
    listing, rating, count = row
    out = ListingDetail.model_validate(listing)
    out.rating, out.review_count, out.host.is_host = (round(rating, 2) if rating else None), count or 0, True
    return out


@router.get("/{listing_id}/availability", response_model=list[Range])
def availability(listing_id: int, db: DB):
    """Booked and host-blocked ranges from today on. The date picker greys these out."""
    get_listing(db, listing_id)
    today = date.today()
    booked = db.execute(
        select(Booking.check_in, Booking.check_out).where(
            Booking.listing_id == listing_id, Booking.status == "confirmed", Booking.check_out > today
        )
    ).all()
    blocked = db.execute(
        select(BlockedDate.start_date, BlockedDate.end_date).where(
            BlockedDate.listing_id == listing_id, BlockedDate.end_date > today
        )
    ).all()
    return sorted((Range(start=s, end=e) for s, e in [*booked, *blocked]), key=lambda r: r.start)


@router.get("/{listing_id}/quote", response_model=Quote)
def get_quote(listing_id: int, check_in: date, check_out: date, db: DB, guests: int = Query(1, ge=1)):
    listing = get_listing(db, listing_id)
    if err := rules.stay_error(listing, check_in, check_out, guests, date.today()):
        raise HTTPException(422, err)
    if not rules.is_available(db, listing_id, check_in, check_out):
        raise HTTPException(409, "Those dates are not available")
    return rules.quote(listing, check_in, check_out)


@router.get("/{listing_id}/reviews", response_model=list[ReviewOut])
def reviews(listing_id: int, db: DB):
    get_listing(db, listing_id)
    return db.scalars(
        select(Review).where(Review.listing_id == listing_id)
        .options(joinedload(Review.author)).order_by(Review.created_at.desc())
    ).all()


def apply(listing: Listing, data: ListingIn, db: Session):
    fields = data.model_dump(exclude={"photo_urls", "amenity_ids"})
    for k, v in fields.items():
        setattr(listing, k, v)
    listing.photos = [ListingPhoto(url=u, position=i) for i, u in enumerate(data.photo_urls)]
    listing.amenities = list(db.scalars(select(Amenity).where(Amenity.id.in_(data.amenity_ids))))


@router.post("", response_model=ListingDetail, status_code=201)
def create(data: ListingIn, db: DB, user: CurrentUser):
    listing = Listing(host_id=user.id)
    apply(listing, data, db)
    db.add(listing)
    db.commit()
    return detail(listing.id, db)


@router.put("/{listing_id}", response_model=ListingDetail)
def update(listing_id: int, data: ListingIn, db: DB, user: CurrentUser):
    listing = owned_listing(db, listing_id, user)
    apply(listing, data, db)
    db.commit()
    return detail(listing.id, db)


@router.delete("/{listing_id}", status_code=204)
def delete(listing_id: int, db: DB, user: CurrentUser):
    listing = owned_listing(db, listing_id, user)
    upcoming = db.scalar(
        select(func.count()).where(
            Booking.listing_id == listing_id, Booking.status == "confirmed", Booking.check_out > date.today()
        )
    )
    if upcoming:
        raise HTTPException(409, f"This listing has {upcoming} upcoming reservation(s). Cancel them first.")
    db.delete(listing)
    db.commit()
