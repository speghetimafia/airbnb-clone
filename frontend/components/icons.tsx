import {
  AirVent, Bath, Building2, Car, Castle, Coffee, CookingPot, DoorOpen, Dumbbell, Flame, Hotel, House, KeyRound, Laptop,
  Mountain, MountainSnow, PawPrint, Sailboat, Snowflake, Sparkles, Tent, Thermometer, Tractor, TreeDeciduous, TreePalm,
  TreePine, Trees, Tv, Umbrella, Utensils, Warehouse, WashingMachine, Waves, Wheat, Wifi, Zap, type LucideIcon,
} from "lucide-react";

/** The icon row on Explore. `title`/`blurb` are the highlight shown on a listing in that category. */
export const CATEGORIES: { name: string; icon: LucideIcon; title: string; blurb: string }[] = [
  { name: "Trending", icon: Flame, title: "Trending stay", blurb: "Guests have been booking this place a lot lately." },
  { name: "Beachfront", icon: Umbrella, title: "Beachfront", blurb: "Walk straight from the house onto the sand." },
  { name: "Amazing pools", icon: Waves, title: "Dive right in", blurb: "This is one of the few places in the area with a pool." },
  { name: "Cabins", icon: TreePine, title: "Cosy cabin", blurb: "A warm, wood-panelled retreat surrounded by nature." },
  { name: "Amazing views", icon: Mountain, title: "Amazing views", blurb: "Guests say the views from this home are unforgettable." },
  { name: "Historical homes", icon: Castle, title: "Historical home", blurb: "A home with heritage, character and stories to tell." },
  { name: "Lakefront", icon: Sailboat, title: "Lakefront", blurb: "Wake up by the water, just steps from the lake." },
  { name: "Tropical", icon: TreePalm, title: "Tropical escape", blurb: "Palm trees, warm weather and slow, easy days." },
  { name: "Farms", icon: Tractor, title: "Farm stay", blurb: "Fresh air, local produce and life on a working farm." },
  { name: "Countryside", icon: Wheat, title: "Countryside", blurb: "Quiet surroundings, open skies and space to unwind." },
  { name: "Treehouses", icon: TreeDeciduous, title: "Treehouse", blurb: "Sleep up in the trees for a one-of-a-kind stay." },
  { name: "Camping", icon: Tent, title: "Under the stars", blurb: "A camp-style stay for an outdoorsy trip." },
  { name: "Iconic cities", icon: Building2, title: "Iconic city", blurb: "Close to the city's best food, sights and nightlife." },
];

const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi, kitchen: CookingPot, parking: Car, pool: Waves, ac: AirVent, washer: WashingMachine, tv: Tv,
  workspace: Laptop, hottub: Bath, beach: Umbrella, mountain: MountainSnow, fireplace: Flame, breakfast: Coffee,
  pets: PawPrint, key: KeyRound, grill: Utensils, heating: Thermometer, lake: Sailboat, gym: Dumbbell, power: Zap,
};

export function AmenityIcon({ icon, size = 24 }: { icon: string; size?: number }) {
  const Icon = AMENITY_ICONS[icon] ?? Sparkles;
  return <Icon size={size} strokeWidth={1.5} />;
}

export const PROPERTY_ICONS: Record<string, LucideIcon> = {
  House, Apartment: Building2, Villa: Hotel, Cottage: Trees, Cabin: TreePine, Guesthouse: DoorOpen, "Farm stay": Tractor,
  "Heritage haveli": Castle, Treehouse: TreeDeciduous, Tent, Hut: Warehouse, Boat: Sailboat, Chalet: MountainSnow, Dome: Snowflake,
};
export const PROPERTY_TYPES = Object.keys(PROPERTY_ICONS);
