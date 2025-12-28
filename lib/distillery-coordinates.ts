/**
 * Distillery coordinates lookup
 * Coordinates for major Scottish distilleries and international ones
 */

// Distillery coordinates lookup [longitude, latitude]
export const DISTILLERY_COORDINATES: Record<string, [number, number]> = {
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
  'High Coast': [18.183, 63.000], // Sweden
};

/**
 * Get coordinates for a distillery, with fallback to region center
 */
export function getDistilleryCoordinates(distillery: string, country: string, region: string): [number, number] | null {
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




