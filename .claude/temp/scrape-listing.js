// Node.js script to attempt scraping (may still be blocked)
// Usage: node scrape-listing.js

const https = require('https');
const fs = require('fs');

const url = 'https://www.realestate.com.au/property/13-bellevue-st-richmond-vic-3121/';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  }
};

console.log('Attempting to fetch listing page...');

https.get(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content length: ${data.length} bytes`);

    if (data.includes('KPSDK')) {
      console.log('\n❌ Bot protection detected. Please use the browser method instead.');
      console.log('See extract-images.js for instructions.\n');
      return;
    }

    // Extract image URLs
    const imgRegex = /https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp|gif)/gi;
    const matches = data.match(imgRegex) || [];

    const uniqueUrls = [...new Set(matches)].filter(url =>
      url.includes('realestate.com.au') || url.includes('reastatic.net')
    );

    console.log(`\nFound ${uniqueUrls.length} unique image URLs:\n`);
    uniqueUrls.forEach(url => console.log(url));

    // Save to file
    fs.writeFileSync('urls.txt', uniqueUrls.join('\n'));
    console.log('\n✓ URLs saved to urls.txt');
    console.log('Run: .\\download-images.ps1 urls.txt');
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
