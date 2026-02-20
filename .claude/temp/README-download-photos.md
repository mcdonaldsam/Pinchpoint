# Download Real Estate Listing Photos

The website has bot protection, so automated scraping won't work. Here are your options:

## 🎯 Option 1: Browser Console Method (RECOMMENDED - Most Reliable)

This is the easiest and most reliable method.

### Steps:

1. **Open the listing page in your browser:**
   ```
   https://www.realestate.com.au/property/13-bellevue-st-richmond-vic-3121/
   ```

2. **Open Developer Tools:**
   - Press `F12` or `Ctrl+Shift+I` (Windows)
   - Or right-click → "Inspect"

3. **Go to Console tab**

4. **Copy and paste the entire contents of `extract-images.js` into the console and press Enter**

5. **The script will:**
   - Find all images on the page
   - Copy URLs to your clipboard
   - Show an alert with count

6. **Paste the URLs into `urls.txt`** (one per line)

7. **Run the download script:**
   ```powershell
   cd "c:\Users\samcd\Projects\Git-Repos\Arete\.claude\temp"
   .\download-images.ps1 urls.txt
   ```

8. **Images will be downloaded to:** `.\property-images\`

---

## 🔧 Option 2: Node.js Attempt (May Be Blocked)

If you want to try the automated approach (likely to fail due to bot protection):

```bash
cd "c:\Users\samcd\Projects\Git-Repos\Arete\.claude\temp"
node scrape-listing.js
```

If it works, it will save URLs to `urls.txt`, then run:
```powershell
.\download-images.ps1 urls.txt
```

---

## 📋 Option 3: Manual URL Collection

1. Visit the listing page
2. Right-click on each photo → "Open image in new tab"
3. Copy each image URL from the address bar
4. Paste into `urls.txt` (one per line)
5. Run: `.\download-images.ps1 urls.txt`

---

## 🛠️ Troubleshooting

**PowerShell script won't run:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\download-images.ps1 urls.txt
```

**Images are too small/low quality:**
- Look for URLs with parameters like `w=1920` or `quality=80`
- Try removing query parameters or changing them to higher values

**Download fails:**
- Check your internet connection
- Some images may be protected or expired
- The script will skip failed downloads and continue

---

## 📁 Files Created

- `extract-images.js` - Browser console script to extract URLs
- `download-images.ps1` - PowerShell script to download images
- `urls.txt` - Template file for image URLs
- `scrape-listing.js` - Node.js scraping attempt (likely blocked)
- `property-images/` - Output folder (created automatically)

---

## ✅ Expected Result

After running successfully, you'll have:
- All listing photos downloaded to `property-images/` folder
- Original filenames preserved where possible
- Progress shown during download
- Summary of total images downloaded
