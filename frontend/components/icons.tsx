import {
  AirVent, Bath, Building2, Car, Castle, Coffee, CookingPot, Dumbbell, Flame, KeyRound, Laptop, Mountain,
  MountainSnow, PawPrint, Sailboat, Sparkles, Tent, Thermometer, Tractor, TreeDeciduous, TreePalm, TreePine,
  Tv, Umbrella, Utensils, WashingMachine, Waves, Wheat, Wifi, Zap, type LucideIcon,
} from "lucide-react";

export const CATEGORIES: { name: string; icon: LucideIcon }[] = [
  { name: "Trending", icon: Flame },
  { name: "Beachfront", icon: Umbrella },
  { name: "Amazing pools", icon: Waves },
  { name: "Cabins", icon: TreePine },
  { name: "Amazing views", icon: Mountain },
  { name: "Historical homes", icon: Castle },
  { name: "Lakefront", icon: Sailboat },
  { name: "Tropical", icon: TreePalm },
  { name: "Farms", icon: Tractor },
  { name: "Countryside", icon: Wheat },
  { name: "Treehouses", icon: TreeDeciduous },
  { name: "Camping", icon: Tent },
  { name: "Iconic cities", icon: Building2 },
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

export const PROPERTY_TYPES = [
  "House", "Apartment", "Villa", "Cottage", "Cabin", "Guesthouse", "Farm stay", "Heritage haveli", "Treehouse",
  "Tent", "Hut", "Boat", "Chalet", "Dome",
];
