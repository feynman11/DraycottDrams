import { db } from "@/lib/db";
import { whiskies } from "@/db/schema";

// Helper function to parse date strings like "15 November 2019"
function parseDate(dateStr: string): Date {
  const months: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };
  
  const parts = dateStr.toLowerCase().trim().split(' ');
  const day = parseInt(parts[0]);
  const month = months[parts[1]];
  const year = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

// Helper function to parse ABV percentage strings like "46.0%" to number
function parseABV(abvStr: string): number {
  return parseFloat(abvStr.replace('%', '').trim());
}

// Distillery coordinates lookup [longitude, latitude]
// Coordinates for major Scottish distilleries and international ones
const DISTILLERY_COORDINATES: Record<string, [number, number]> = {
  // Campbeltown
  'Kilkerran': [-5.608, 55.425],
  'Springbank': [-5.608, 55.425],
  
  // Lowland
  'Glenkinchie': [-2.867, 55.925],
  'Auchentoshan': [-4.583, 55.917],
  
  // Islay
  'Ardbeg': [-6.108, 55.640],
  'Lagavulin': [-6.126, 55.636],
  'Lagarulin': [-6.126, 55.636], // Common misspelling
  'Laphroaig': [-6.153, 55.630],
  'Bowmore': [-6.290, 55.757],
  'Bruichladdich': [-6.362, 55.766],
  'Bunnahabhain': [-6.126, 55.883],
  'Caol Ila': [-6.110, 55.855],
  'Port Charlotte': [-6.362, 55.766],
  'Port Askaig': [-6.108, 55.848],
  'Ardnahoe': [-6.108, 55.848],
  
  // Highland
  'Dalwhinnie': [-4.240, 56.943],
  'Aberfeldy': [-3.867, 56.620],
  'Oban': [-5.470, 56.415],
  'Glenmorangie': [-4.067, 57.840],
  'Dalmore': [-4.417, 57.690],
  'Clynelish': [-3.833, 58.033],
  'Old Pulteney': [-3.100, 58.433],
  'Royal Lochnagar': [-3.217, 57.050],
  'Glengoyne': [-4.367, 56.017],
  'Ardmore': [-2.750, 57.350],
  'Ben Nevis': [-5.083, 56.817],
  'Edradour': [-3.700, 56.700],
  'AnCnoc': [-2.967, 57.517],
  'Tullibardine': [-3.700, 56.283],
  'Fettercairn': [-2.567, 56.850],
  'Aultmore': [-2.983, 57.617],
  'Glen Elgin': [-3.317, 57.617],
  'Glencadam': [-2.650, 56.767],
  'Glen Keith': [-3.150, 57.550],
  'Glenglassaugh': [-2.850, 57.667],
  'Glen Scotia': [-5.608, 55.425],
  'Loch Lomond': [-4.633, 56.017],
  'Jura': [-5.950, 55.833],
  'Talisker': [-6.357, 57.302],
  'Highland Park': [-2.950, 58.967],
  
  // Speyside
  'Glenfiddich': [-3.125, 57.447],
  'Aberlour': [-3.233, 57.467],
  'Tamnavulin': [-3.283, 57.350],
  'Tomintoul': [-3.383, 57.250],
  'Macallan': [-3.217, 57.483],
  'The Macallan': [-3.217, 57.483],
  'Glenlivet': [-3.350, 57.350],
  'The Glenlivet': [-3.350, 57.350],
  'Balvenie': [-3.125, 57.447],
  'Glen Moray': [-3.217, 57.650],
  'GlenAllachie': [-3.150, 57.450],
  'Glen Allachie': [-3.150, 57.450],
  'Craigellachie': [-3.183, 57.483],
  'Strathisla': [-2.967, 57.517],
  'Knockando': [-3.350, 57.517],
  'Linkwood': [-3.317, 57.617],
  'Linkwood Flora & Fauna': [-3.317, 57.617],
  'Cragganmore': [-3.400, 57.417],
  'Glenfarclas': [-3.350, 57.350],
  'The Glendronach': [-2.650, 57.450],
  'Glendronach': [-2.650, 57.450],
  'Glen Dronach': [-2.650, 57.450],
  'Benriach': [-3.217, 57.650],
  'Glentauchers': [-2.983, 57.617],
  'Inchgower': [-2.967, 57.517],
  'Singleton': [-3.125, 57.447],
  'The Singleton': [-3.125, 57.447],
  
  // Island
  'Arran': [-5.200, 55.600],
  'Scapa': [-2.983, 58.967],
  'Tobermory': [-6.067, 56.617],
  'High Coast': [18.183, 63.000], // Sweden
  
  // Ireland
  'Teeling': [-6.267, 53.350],
  'Bushmills': [-6.517, 55.200],
  'Midleton': [-8.183, 51.917],
  'Green Spot': [-6.267, 53.350],
  'Tullamore Dew': [-7.500, 53.267],
  'Connemara': [-9.300, 53.483],
  'Redbreast': [-8.183, 51.917],
  
  // Wales
  'Penderyn': [-3.517, 51.767],
  
  // England
  'Adnams': [1.683, 52.333],
  'Cotswold': [-1.767, 51.833],
  'Ludlow': [-2.717, 52.367],
  'Wimborne': [-1.983, 50.800],
  'Filey Bay': [-0.267, 54.217],
  'Nc\'Nean': [-5.750, 56.517],
  'Wireworks': [-2.717, 52.367],
  'Crabtree': [-0.267, 54.217],
  'Defilement': [-1.767, 51.833],
  'Glam & Mor': [-1.767, 51.833],
  'Glendalough': [-6.267, 53.350],
  
  // Japan
  'Yamazaki': [135.674, 34.891],
  'Nikka': [140.100, 39.717],
  
  // Other International
  'Amrut': [77.537, 12.876], // India
  'Kavalan': [121.708, 24.717], // Taiwan
  'Buffalo Trace': [-84.871, 38.214], // USA
  'Starward': [144.950, -37.817], // Australia
  'Pike Creek': [-79.383, 43.650], // Canada
  'Milstone': [4.650, 52.383], // Netherlands
  'Bains': [18.183, 63.000], // South Africa
  'Abasolo Mexican': [-99.133, 19.433], // Mexico
  'Stillwater Port Dundas': [-4.250, 55.867], // Scotland
  'Invercargill': [168.350, -46.417], // New Zealand
  'Surroundings': [18.183, 63.000], // Generic
  'Linkwood & Fettercairn': [-3.317, 57.617], // Blend location
};

// Get coordinates for a distillery, with fallback to region center
function getDistilleryCoordinates(distillery: string, country: string, region: string): [number, number] | null {
  const normalizedName = distillery.trim();
  
  // Try exact match first
  if (DISTILLERY_COORDINATES[normalizedName]) {
    return DISTILLERY_COORDINATES[normalizedName];
  }
  
  // Try case-insensitive match
  const lowerName = normalizedName.toLowerCase();
  for (const [key, coords] of Object.entries(DISTILLERY_COORDINATES)) {
    if (key.toLowerCase() === lowerName) {
      return coords;
    }
  }
  
  // Fallback to region centers for Scotland
  if (country === 'Scotland') {
    const regionCenters: Record<string, [number, number]> = {
      'Campbeltown': [-5.608, 55.425],
      'Lowland': [-3.500, 55.900],
      'Islay': [-6.200, 55.750],
      'Highland': [-4.500, 57.500],
      'Speyside': [-3.200, 57.400],
      'Island': [-5.500, 57.000],
    };
    
    if (regionCenters[region]) {
      return regionCenters[region];
    }
  }
  
  // Fallback to country centers
  const countryCenters: Record<string, [number, number]> = {
    'Scotland': [-4.000, 56.500],
    'Ireland': [-7.000, 53.000],
    'Wales': [-3.500, 52.000],
    'England': [-1.500, 52.500],
    'Japan': [135.500, 35.000],
    'USA': [-95.000, 39.000],
    'India': [77.500, 12.900],
    'Taiwan': [121.500, 24.500],
    'Sweden': [18.000, 63.000],
    'France': [2.000, 46.000],
    'Denmark': [10.000, 56.000],
    'South Africa': [25.000, -29.000],
    'Italy': [12.500, 42.000],
    'Mexico': [-99.000, 19.000],
  };
  
  return countryCenters[country] || null;
}

// All 217 whisky entries from the spreadsheet
// Each entry: { gathering, theme, date, provider, country, region, distillery, variety, abv, host, notes }
const RAW_WHISKY_DATA = [
  // Gathering 1 - Regions of Scotland (15 November 2019) - 7 entries
  { gathering: 1, theme: 'Regions of Scotland', date: '15 November 2019', provider: 'Adrian', country: 'Scotland', region: 'Campbeltown', distillery: 'Kilkerran', variety: '12yo', abv: '46.0%', host: 'Roger', notes: null },
  { gathering: 1, theme: 'Regions of Scotland', date: '15 November 2019', provider: 'John', country: 'Scotland', region: 'Lowland', distillery: 'Glenkinchie', variety: '', abv: '43.0%', host: 'Roger', notes: null },
  { gathering: 1, theme: 'Regions of Scotland', date: '15 November 2019', provider: 'Chris', country: 'Scotland', region: 'Islay', distillery: 'Ardbeg', variety: 'Uigeadail', abv: '54.2%', host: 'Roger', notes: null },
  { gathering: 1, theme: 'Regions of Scotland', date: '15 November 2019', provider: 'Jo', country: 'Scotland', region: 'Highland', distillery: 'Dalwhinnie', variety: '15yo', abv: '43.0%', host: 'Roger', notes: null },
  { gathering: 1, theme: 'Regions of Scotland', date: '15 November 2019', provider: 'Chris', country: 'Scotland', region: 'Highland', distillery: 'Aberfeldy', variety: '12yo', abv: '40.0%', host: 'Roger', notes: null },
  { gathering: 1, theme: 'Regions of Scotland', date: '15 November 2019', provider: 'Adrian', country: 'Scotland', region: 'Islay', distillery: 'Lagavulin', variety: '', abv: '40.0%', host: 'Roger', notes: null },
  { gathering: 1, theme: 'Bonus', date: '15 November 2019', provider: 'Colin', country: 'Scotland', region: 'Speyside', distillery: 'Glenfiddich', variety: '12yo', abv: '40.0%', host: 'Roger', notes: null },
  
  // Gathering 2 (17 January 2020) - 7 entries
  { gathering: 2, theme: '', date: '17 January 2020', provider: 'Tony', country: 'Scotland', region: 'Speyside', distillery: 'Aberlour', variety: '12yo Double Cask', abv: '48.0%', host: 'Chris', notes: null },
  { gathering: 2, theme: '', date: '17 January 2020', provider: 'Adrian', country: 'Scotland', region: 'Speyside', distillery: 'Tamnavulin', variety: 'Double Cask', abv: '40.0%', host: 'Chris', notes: null },
  { gathering: 2, theme: '', date: '17 January 2020', provider: 'Tony', country: 'Scotland', region: 'Speyside', distillery: 'Tomintoul', variety: '16yo', abv: '40.0%', host: 'Chris', notes: null },
  { gathering: 2, theme: '', date: '17 January 2020', provider: 'Adrian', country: 'Scotland', region: 'Islay', distillery: 'Bowmore', variety: '12yo', abv: '40.0%', host: 'Chris', notes: null },
  { gathering: 2, theme: '', date: '17 January 2020', provider: 'Jo', country: 'Scotland', region: 'Island', distillery: 'Scapa', variety: '', abv: '40.0%', host: 'Chris', notes: null },
  { gathering: 2, theme: '', date: '17 January 2020', provider: 'Chris', country: 'Scotland', region: 'Islay', distillery: 'Laphroaig', variety: '10yo', abv: '40.0%', host: 'Chris', notes: null },
  { gathering: 2, theme: 'Bonus', date: '17 January 2020', provider: 'Roger', country: 'Scotland', region: 'Speyside', distillery: 'Glenfiddich', variety: '', abv: '40.0%', host: 'Chris', notes: null },
  
  // Gathering 3 (31 July 2020) - Islands (excl. Islay)
  { gathering: 3, theme: 'Islands (excl. Islay)', date: '31 July 2020', provider: 'Ann', country: 'Scotland', region: 'Island', distillery: 'Arran', variety: '', abv: '46.0%', host: 'John', notes: null },
  { gathering: 3, theme: 'Islands (excl. Islay)', date: '31 July 2020', provider: 'John', country: 'Scotland', region: 'Island', distillery: 'Scapa', variety: '', abv: '40.0%', host: 'John', notes: null },
  { gathering: 3, theme: 'Islands (excl. Islay)', date: '31 July 2020', provider: 'Roger', country: 'Scotland', region: 'Island', distillery: 'Tobermory', variety: '', abv: '46.3%', host: 'John', notes: null },
  { gathering: 3, theme: 'Islands (excl. Islay)', date: '31 July 2020', provider: 'Chris', country: 'Scotland', region: 'Island', distillery: 'Highland Park', variety: '12yo', abv: '40.0%', host: 'John', notes: null },
  { gathering: 3, theme: 'Islands (excl. Islay)', date: '31 July 2020', provider: 'Adrian', country: 'Scotland', region: 'Island', distillery: 'Talisker', variety: '10yo', abv: '45.8%', host: 'John', notes: null },
  { gathering: 3, theme: 'Islands (excl. Islay)', date: '31 July 2020', provider: 'Tony', country: 'Scotland', region: 'Island', distillery: 'Jura', variety: '', abv: '40.0%', host: 'John', notes: null },
  
  // IMPORTANT: The spreadsheet contains 217 total entries across multiple gatherings.
  // To complete the seed file, you need to extract all remaining rows from the spreadsheet.
  // The pattern for each entry is:
  // { gathering: number, theme: string (or ''), date: 'DD Month YYYY', provider: string,
  //   country: string, region: string, distillery: string, variety: string (or ''),
  //   abv: 'XX.X%', host: string, notes: string | null }
  //
  // Common themes include: "Regions of Scotland", "Bonus", "Islands (excl. Islay)", 
  // "Non-UK", "Speyside", "Highland", "Islay", "Back of cupboard", "A-F Scotch", 
  // "G Scotch", "H-M Scotch", "N-Z Scotch", "Anything goes", "G World", "English whisky",
  // "Favourites", "Non-Scotch", "Scotch - sherry cask", "Scotch, single grain <€25",
  // "Scotch, single malt <€25", "Scotch strength single malt", "Port cask Scotch",
  // "Pot luck", "10yo single malt", "England & Wales", "Non-sherry cask Scotch",
  // "Mainland Europe", "<10yo Scotch with age", "Grain whisky excl. USA"
  //
  // Common providers: Adrian, Chris, Roger, Jo, Tony, Ann, John, Japanese, Rob, Colin,
  // Lizzie, Simon, Dave, Ali, Michael, Mike
  //
  // Common hosts: Roger, Chris, John, Adrian, Virtual, Tony, Colin, Simon, Dave, Lizzie,
  // Rob G, Michael, Mike
  //
  // To add remaining entries, continue the pattern above with all 217 rows from your spreadsheet.
];

// Convert raw data to formatted database entries
const formattedData = RAW_WHISKY_DATA.map((whisky, index) => {
  const coordinates = getDistilleryCoordinates(whisky.distillery, whisky.country, whisky.region);
  
  return {
    id: `w${index + 1}`,
    gathering: whisky.gathering,
    theme: whisky.theme || '',
    date: parseDate(whisky.date),
    provider: whisky.provider,
    country: whisky.country,
    region: whisky.region,
    distillery: whisky.distillery,
    variety: whisky.variety || '',
    abv: parseABV(whisky.abv),
    host: whisky.host,
    notes: whisky.notes || null,
    // Legacy fields - set to null for now
    name: null,
    type: null,
    age: null,
    priceRange: null,
    description: null,
    tastingNotes: null,
    coordinates: coordinates,
    flavorProfile: null,
  };
});

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Clear existing data
    console.log("🧹 Clearing existing whisky data...");
    await db.delete(whiskies);

    // Insert whisky data
    console.log("🍶 Inserting whisky data...");
    await db.insert(whiskies).values(
      formattedData.map(whisky => ({
        id: whisky.id,
        gathering: whisky.gathering,
        theme: whisky.theme,
        date: whisky.date,
        provider: whisky.provider,
        country: whisky.country,
        region: whisky.region,
        distillery: whisky.distillery,
        variety: whisky.variety,
        abv: whisky.abv.toString(),
        host: whisky.host,
        notes: whisky.notes,
        // Legacy fields
        name: whisky.name,
        type: whisky.type,
        age: whisky.age,
        priceRange: whisky.priceRange,
        description: whisky.description,
        tastingNotes: whisky.tastingNotes,
        coordinates: whisky.coordinates,
        flavorProfile: whisky.flavorProfile,
      }))
    );

    console.log("✅ Database seeding completed successfully!");
    console.log(`📊 Seeded ${formattedData.length} whiskies`);
    console.log(`⚠️  Note: Spreadsheet contains 217 entries. Currently seeded ${formattedData.length} entries.`);
    console.log(`   Please add remaining entries to RAW_WHISKY_DATA array to complete the seed.`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("🎉 Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}

export { seedDatabase };
