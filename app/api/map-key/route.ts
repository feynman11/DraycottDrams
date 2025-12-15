import { NextResponse } from 'next/server';

export async function GET() {
  // Get MapTiler API key from server-side environment variable
  const maptilerApiKey = process.env.MAPTILER_API_KEY || '';
  
  // Return the API key (or empty string if not set)
  return NextResponse.json({ apiKey: maptilerApiKey });
}

