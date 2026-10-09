from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORM):
    id: int
    name: str
    avatar_url: str
    is_superhost: bool


class UserDetail(UserOut):
    email: str
    bio: str
    joined_at: datetime
    is_host: bool = False
    trip_count: int = 0  # completed stays; only filled by /me
    review_count: int = 0  # reviews written; only filled by /me


class AmenityOut(ORM):
    id: int
    name: str
    icon: str


class PhotoOut(ORM):
    id: int
    url: str


class ListingCard(BaseModel):
    id: int
    title: str
    city: str
    state: str
    property_type: str
    category: str
    lat: float
    lng: float
    base_price: int
    photos: list[str]
    rating: float | None
    review_count: int
    host_is_superhost: bool
    is_listed: bool = True
    stay_total: int | None = None  # full price incl. fees, only when searching with dates


class Page(BaseModel):
    items: list[ListingCard]
    total: int
    page: int
    pages: int


class ListingDetail(ORM):
    id: int
    title: str
    description: str
    property_type: str
    category: str
    city: str
    state: str
    country: str
    address: str
    lat: float
    lng: float
    max_guests: int
    bedrooms: int
    beds: int
    baths: float
    base_price: int
    weekend_price: int | None
    cleaning_fee: int
    weekly_discount_pct: int
    monthly_discount_pct: int
    min_nights: int
    max_nights: int
    check_in_time: str
    check_out_time: str
    advance_notice_days: int
    availability_window_days: int
    is_listed: bool
    created_at: datetime
    host: UserDetail
    photos: list[PhotoOut]
    amenities: list[AmenityOut]
    rating: float | None = None
    review_count: int = 0


TIME = r"^([01]\d|2[0-3]):[0-5]\d$"


class ListingIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    property_type: str = Field(min_length=2, max_length=50)
    category: str = Field(min_length=2, max_length=50)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    address: str = Field(default="", max_length=300)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    max_guests: int = Field(ge=1, le=50)
    bedrooms: int = Field(ge=0, le=50)
    beds: int = Field(ge=1, le=100)
    baths: float = Field(ge=0, le=50)
    base_price: int = Field(gt=0, le=10_000_000)
    weekend_price: int | None = Field(default=None, gt=0, le=10_000_000)
    cleaning_fee: int = Field(default=0, ge=0, le=1_000_000)
    weekly_discount_pct: int = Field(default=0, ge=0, le=90)
    monthly_discount_pct: int = Field(default=0, ge=0, le=90)
    min_nights: int = Field(default=1, ge=1, le=365)
    max_nights: int = Field(default=30, ge=1, le=1125)
    check_in_time: str = Field(default="14:00", pattern=TIME)
    check_out_time: str = Field(default="11:00", pattern=TIME)
    advance_notice_days: int = Field(default=0, ge=0, le=7)
    availability_window_days: int = Field(default=365, ge=30, le=730)
    is_listed: bool = True
    photo_urls: list[str] = Field(min_length=1, max_length=30)
    amenity_ids: list[int] = []

    @model_validator(mode="after")
    def _check(self):
        if self.max_nights < self.min_nights:
            raise ValueError("Maximum nights must be at least the minimum nights")
        for url in self.photo_urls:
            if not url.startswith("/uploads/"):
                HttpUrl(url)  # raises on junk
        return self


class Quote(BaseModel):
    nights: int
    avg_nightly: int
    nightly_total: int
    discount: int
    discount_label: str
    cleaning_fee: int
    service_fee: int
    total: int


class Range(BaseModel):
    start: date
    end: date  # exclusive


class BlockIn(BaseModel):
    start_date: date
    end_date: date
    note: str = Field(default="", max_length=200)

    @model_validator(mode="after")
    def _check(self):
        if self.end_date <= self.start_date:
            raise ValueError("End date must be after start date")
        return self


class BlockOut(ORM):
    id: int
    start_date: date
    end_date: date
    note: str


Trigger = Literal["on_confirm", "day_before_checkin", "on_checkout"]


class TemplateIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=4000)
    trigger: Trigger


class TemplateOut(ORM):
    id: int
    title: str
    body: str
    trigger: Trigger


class BookingIn(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests: int


class ListingMini(ORM):
    id: int
    title: str
    city: str
    state: str
    property_type: str
    check_in_time: str
    check_out_time: str
    address: str
    lat: float
    lng: float
    host: UserOut
    photos: list[PhotoOut]


class BookingOut(ORM):
    id: int
    check_in: date
    check_out: date
    guests: int
    nights: int
    nightly_total: int
    discount: int
    cleaning_fee: int
    service_fee: int
    total: int
    status: str
    created_at: datetime
    listing: ListingMini
    guest: UserOut
    has_review: bool = False


class MessageOut(ORM):
    id: int
    title: str
    body: str
    send_at: datetime


class Thread(BaseModel):
    """One booking's conversation in the inbox: the latest due message and how many there are."""
    booking: BookingOut
    last: MessageOut
    count: int


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=2000)


class ReviewOut(ORM):
    id: int
    rating: int
    comment: str
    created_at: datetime
    author: UserOut
