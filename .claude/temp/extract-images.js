// Run this in browser console on the listing page
// It will copy all image URLs to clipboard

const images = [];

// Find all img tags
document.querySelectorAll('img').forEach(img => {
  if (img.src && img.src.startsWith('http')) {
    images.push(img.src);
  }
});

// Find all picture source tags
document.querySelectorAll('picture source').forEach(source => {
  if (source.srcset) {
    const urls = source.srcset.split(',').map(s => s.trim().split(' ')[0]);
    images.push(...urls.filter(u => u.startsWith('http')));
  }
});

// Find all style backgrounds
document.querySelectorAll('[style*="background"]').forEach(el => {
  const match = el.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
  if (match && match[1].startsWith('http')) {
    images.push(match[1]);
  }
});

// Remove duplicates and filter for property images (usually larger)
const uniqueImages = [...new Set(images)].filter(url =>
  url.includes('realestate.com.au') || url.includes('reastatic.net')
);

console.log('Found images:', uniqueImages);
copy(uniqueImages.join('\n'));
alert(`Copied ${uniqueImages.length} image URLs to clipboard!`);
