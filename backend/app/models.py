from datetime import date, datetime

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, DateTime, Float, ForeignKey, Index, Integer, String, Table, Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

listing_amenities = Table(
    "listing_amenities",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200), unique=True)
    avatar_url: Mapped[str] = mapped_column(String(500), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    is_superhost: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())



class Amenity(Base):
    __tablename__ = "amenities"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    icon: Mapped[str] = mapped_column(String(50), default="")


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint("base_price > 0"),
        CheckConstraint("min_nights >= 1 AND max_nights >= min_nights"),
        CheckConstraint("weekly_discount_pct BETWEEN 0 AND 90 AND monthly_discount_pct BETWEEN 0 AND 90"),
        Index("ix_listings_city", "city"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    property_type: Mapped[str] = mapped_column(String(50))  # House, Apartment, Villa, Cabin, ...
    category: Mapped[str] = mapped_column(String(50), index=True)  # Beachfront, Mountains, ... (the icon row)
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="India")
    address: Mapped[str] = mapped_column(String(300), default="")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    max_guests: Mapped[int] = mapped_column(Integer)
    bedrooms: Mapped[int] = mapped_column(Integer)
    beds: Mapped[int] = mapped_column(Integer)
    baths: Mapped[float] = mapped_column(Float)
    # Pricing rules (all in whole rupees)
    base_price: Mapped[int] = mapped_column(Integer)
    weekend_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cleaning_fee: Mapped[int] = mapped_column(Integer, default=0)
    weekly_discount_pct: Mapped[int] = mapped_column(Integer, default=0)
    monthly_discount_pct: Mapped[int] = mapped_column(Integer, default=0)
    # Calendar rules
    min_nights: Mapped[int] = mapped_column(Integer, default=1)
    max_nights: Mapped[int] = mapped_column(Integer, default=30)
    check_in_time: Mapped[str] = mapped_column(String(5), default="14:00")
    check_out_time: Mapped[str] = mapped_column(String(5), default="11:00")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    host: Mapped[User] = relationship()
    photos: Mapped[list["ListingPhoto"]] = relationship(
        order_by="ListingPhoto.position", cascade="all, delete-orphan", passive_deletes=True
    )
    amenities: Mapped[list[Amenity]] = relationship(secondary=listing_amenities, order_by=Amenity.name)
    blocks: Mapped[list["BlockedDate"]] = relationship(
        order_by="BlockedDate.start_date", cascade="all, delete-orphan", passive_deletes=True
    )
    templates: Mapped[list["MessageTemplate"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class ListingPhoto(Base):
    __tablename__ = "listing_photos"
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("check_out > check_in"),
        CheckConstraint("status IN ('confirmed', 'cancelled')"),
        Index("ix_bookings_listing_dates", "listing_id", "check_in", "check_out"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"))
    guest_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    check_in: Mapped[date] = mapped_column(Date)
    check_out: Mapped[date] = mapped_column(Date)  # exclusive: guest leaves this morning
    guests: Mapped[int] = mapped_column(Integer)
    # Price snapshot at booking time, so later host price edits never change past bookings.
    nights: Mapped[int] = mapped_column(Integer)
    nightly_total: Mapped[int] = mapped_column(Integer)
    discount: Mapped[int] = mapped_column(Integer, default=0)
    cleaning_fee: Mapped[int] = mapped_column(Integer, default=0)
    service_fee: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    listing: Mapped[Listing] = relationship()
    guest: Mapped[User] = relationship()
    review: Mapped["Review | None"] = relationship(back_populates="booking", uselist=False)
    messages: Mapped[list["Message"]] = relationship(order_by="Message.send_at", cascade="all, delete-orphan")


class BlockedDate(Base):
    """Dates the host closed manually (maintenance, personal use). Range is [start_date, end_date)."""
    __tablename__ = "blocked_dates"
    __table_args__ = (CheckConstraint("end_date > start_date"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    note: Mapped[str] = mapped_column(String(200), default="")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), unique=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    booking: Mapped[Booking] = relationship(back_populates="review")
    author: Mapped[User] = relationship()


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


TRIGGERS = ("on_confirm", "day_before_checkin", "on_checkout")


class MessageTemplate(Base):
    """Host-written automated message, e.g. Wi-Fi password or directions, sent per booking."""
    __tablename__ = "message_templates"
    __table_args__ = (CheckConstraint(f"trigger IN {TRIGGERS}"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    trigger: Mapped[str] = mapped_column(String(30))


class Message(Base):
    """A template rendered for one booking. Visible to the guest once send_at has passed."""
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("message_templates.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    send_at: Mapped[datetime] = mapped_column(DateTime)

