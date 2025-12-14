export interface FlavorProfile {
  peat: number;
  fruit: number;
  floral: number;
  spice: number;
  wood: number;
  sweetness: number;
}

export interface Whisky {
  id: string;
  name: string;
  distillery: string;
  region: string;
  country: string;
  type: string;
  abv: number;
  age?: number;
  priceRange: string; // e.g. "£40-£60"
  description: string;
  tastingNotes: string[];
  coordinates: [number, number]; // [Longitude, Latitude] for D3
  flavorProfile: FlavorProfile;
}
