"""Mocked auth: the frontend's user switcher sends X-User-Id. Swap this module for JWT/session auth later."""
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from .models import Listing, User

DB = Annotated[Session, Depends(get_db)]


def current_user(db: DB, x_user_id: Annotated[int | None, Header()] = None) -> User:
    user = db.get(User, x_user_id) if x_user_id else None
    if not user:
        raise HTTPException(401, "Log in to continue")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def get_listing(db: Session, listing_id: int) -> Listing:
    listing = db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(404, "Listing not found")
    return listing


def owned_listing(db: Session, listing_id: int, user: User) -> Listing:
    listing = get_listing(db, listing_id)
    if listing.host_id != user.id:
        raise HTTPException(403, "You don't host this listing")
    return listing
