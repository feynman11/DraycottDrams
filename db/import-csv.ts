/**
 * Helper script to import CSV data into the seed file format
 * Usage: Create a CSV file with columns: Gathering,Theme,Date,Provider,Country,Region,Distillery,Variety,ABV,Host,Notes
 * Then run: tsx db/import-csv.ts < path/to/whisky-data.csv > db/whisky-data-imported.ts
 */

import * as fs from 'fs';
import * as readline from 'readline';

interface WhiskyRow {
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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function convertToSeedFormat(rows: WhiskyRow[]): string {
  let output = 'const RAW_WHISKY_DATA = [\n';
  
  rows.forEach((row, index) => {
    const theme = row.theme ? `'${row.theme.replace(/'/g, "\\'")}'` : '';
    const variety = row.variety ? `'${row.variety.replace(/'/g, "\\'")}'` : '';
    const notes = row.notes ? `'${row.notes.replace(/'/g, "\\'")}'` : 'null';
    
    output += `  { gathering: ${row.gathering}, theme: ${theme}, date: '${row.date}', provider: '${row.provider}', country: '${row.country}', region: '${row.region}', distillery: '${row.distillery}', variety: ${variety}, abv: '${row.abv}', host: '${row.host}', notes: ${notes} }`;
    
    if (index < rows.length - 1) {
      output += ',\n';
    } else {
      output += '\n';
    }
  });
  
  output += '];\n';
  return output;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  const rows: WhiskyRow[] = [];
  let headerSkipped = false;

  for await (const line of rl) {
    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }
    
    const values = parseCSVLine(line);
    if (values.length >= 11) {
      rows.push({
        gathering: parseInt(values[0]) || 0,
        theme: values[1] || '',
        date: values[2] || '',
        provider: values[3] || '',
        country: values[4] || '',
        region: values[5] || '',
        distillery: values[6] || '',
        variety: values[7] || '',
        abv: values[8] || '0%',
        host: values[9] || '',
        notes: values[10] || null,
      });
    }
  }

  console.log(convertToSeedFormat(rows));
  console.error(`\n✅ Converted ${rows.length} rows`);
}

main().catch(console.error);

