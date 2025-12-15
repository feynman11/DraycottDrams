/**
 * CSV parsing utilities for whisky data import
 */

export interface WhiskyCSVRow {
  gathering: number;
  theme: string;
  date: string;
  provider: string;
  country: string;
  region: string;
  distillery: string;
  variety: string;
  abv: string;
  host: string;
  notes: string | null;
}

export interface ParsedWhiskyData {
  data: WhiskyCSVRow[];
  errors: string[];
}

/**
 * Parse CSV text into whisky data rows
 */
export function parseCSV(csvText: string): ParsedWhiskyData {
  const errors: string[] = [];
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return { data: [], errors: ['CSV file must have at least a header row and one data row'] };
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  const expectedHeaders = ['Gathering', 'Theme', 'Date', 'Provider', 'Country', 'Region', 'Distillery', 'Variety', 'ABV', 'Host', 'Notes'];
  
  // Validate headers
  const headerMap: Record<string, number> = {};
  expectedHeaders.forEach((expected, idx) => {
    const foundIdx = header.findIndex(h => h.toLowerCase().trim() === expected.toLowerCase());
    if (foundIdx === -1) {
      errors.push(`Missing required column: ${expected}`);
    } else {
      headerMap[expected] = foundIdx;
    }
  });

  if (errors.length > 0) {
    return { data: [], errors };
  }

  // Parse data rows
  const data: WhiskyCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length < expectedHeaders.length) {
      errors.push(`Row ${i + 1}: Insufficient columns (expected ${expectedHeaders.length}, got ${values.length})`);
      continue;
    }

    try {
      const gathering = parseInt(values[headerMap['Gathering']]?.trim() || '0');
      if (isNaN(gathering) || gathering < 1) {
        errors.push(`Row ${i + 1}: Invalid gathering number`);
        continue;
      }

      const abv = values[headerMap['ABV']]?.trim() || '';
      if (abv && !/^\d+\.?\d*%?$/.test(abv.replace('%', ''))) {
        errors.push(`Row ${i + 1}: Invalid ABV format (expected number with optional %)`);
      }

      data.push({
        gathering,
        theme: values[headerMap['Theme']]?.trim() || '',
        date: values[headerMap['Date']]?.trim() || '',
        provider: values[headerMap['Provider']]?.trim() || '',
        country: values[headerMap['Country']]?.trim() || '',
        region: values[headerMap['Region']]?.trim() || '',
        distillery: values[headerMap['Distillery']]?.trim() || '',
        variety: values[headerMap['Variety']]?.trim() || '',
        abv: abv || '0%',
        host: values[headerMap['Host']]?.trim() || '',
        notes: values[headerMap['Notes']]?.trim() || null,
      });
    } catch (error) {
      errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { data, errors };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

/**
 * Generate CSV template content
 */
export function generateCSVTemplate(): string {
  const headers = ['Gathering', 'Theme', 'Date', 'Provider', 'Country', 'Region', 'Distillery', 'Variety', 'ABV', 'Host', 'Notes'];
  const exampleRow = ['1', 'Regions of Scotland', '15 November 2019', 'Adrian', 'Scotland', 'Campbeltown', 'Kilkerran', '12yo', '46.0%', 'Roger', ''];
  
  return [
    headers.join(','),
    exampleRow.join(','),
    '',
    '# Instructions:',
    '# - Gathering: Number identifying the tasting gathering',
    '# - Theme: Theme of the gathering (can be empty)',
    '# - Date: Date in format "DD Month YYYY" (e.g., "15 November 2019")',
    '# - Provider: Name of person who provided the whisky',
    '# - Country: Country of origin',
    '# - Region: Region within country (e.g., "Islay", "Speyside")',
    '# - Distillery: Name of the distillery',
    '# - Variety: Type/variety of whisky (e.g., "12yo", "Uigeadail")',
    '# - ABV: Alcohol by volume percentage (e.g., "46.0%")',
    '# - Host: Name of the host',
    '# - Notes: Additional notes (can be empty)',
  ].join('\n');
}

