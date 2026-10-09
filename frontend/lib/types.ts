export type User = {
  id: number;
  name: string;
  avatar_url: string;
  is_superhost: boolean;
};

export type UserDetail = User & {
  email: string;
  bio: string;
  joined_at: string;
  is_host: boolean;
};

export type Amenity = { id: number; name: string; icon: string };

export type ListingCard = {
  id: number;
  title: string;
  city: string;
  state: string;
  property_type: string;
  category: string;
  lat: number;
  lng: number;
  base_price: number;
  photos: string[];
  rating: number | null;
  review_count: number;
  host_is_superhost: boolean;
  stay_total?: number | null;
};

export type Page = { items: ListingCard[]; total: number; page: number; pages: number };

export type ListingDetail = {
  id: number;
  title: string;
  description: string;
  property_type: string;
  category: string;
  city: string;
  state: string;
  country: string;
  address: string;
  lat: number;
  lng: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  base_price: number;
  weekend_price: number | null;
  cleaning_fee: number;
  weekly_discount_pct: number;
  monthly_discount_pct: number;
  min_nights: number;
  max_nights: number;
  check_in_time: string;
  check_out_time: string;
  created_at: string;
  host: UserDetail;
  photos: { id: number; url: string }[];
  amenities: Amenity[];
  rating: number | null;
  review_count: number;
};

export type ListingInput = Omit<
  ListingDetail,
  "id" | "country" | "created_at" | "host" | "photos" | "amenities" | "rating" | "review_count"
> & { photo_urls: string[]; amenity_ids: number[] };

export type Quote = {
  nights: number;
  avg_nightly: number;
  nightly_total: number;
  discount: number;
  discount_label: string;
  cleaning_fee: number;
  service_fee: number;
  total: number;
};

export type Range = { start: string; end: string };

export type Review = { id: number; rating: number; comment: string; created_at: string; author: User };

export type Booking = {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  nightly_total: number;
  discount: number;
  cleaning_fee: number;
  service_fee: number;
  total: number;
  status: "confirmed" | "cancelled";
  created_at: string;
  has_review: boolean;
  guest: User;
  listing: {
    id: number;
    title: string;
    city: string;
    state: string;
    property_type: string;
    check_in_time: string;
    check_out_time: string;
    host: User;
    photos: { id: number; url: string }[];
  };
};

export type Message = { id: number; title: string; body: string; send_at: string };

export type Block = { id: number; start_date: string; end_date: string; note: string };

export type Trigger = "on_confirm" | "day_before_checkin" | "on_checkout";
export type Template = { id: number; title: string; body: string; trigger: Trigger };
