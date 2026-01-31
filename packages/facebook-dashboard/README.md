# Facebook Page Dashboard

A beautiful dashboard to display Facebook page data for **Mayes for Texas**, deployed on Cloudflare Pages.

## Features

- Real-time Facebook page metrics (followers, likes, posts)
- Modern dark-themed UI
- Responsive design for all devices
- Screenshot capture of the page
- Raw JSON data viewer
- Posts and activity feed

## Project Structure

```
facebook-dashboard/
├── public/              # Static files served by Cloudflare Pages
│   ├── index.html       # Dashboard UI
│   └── page-data.json   # Scraped Facebook data
├── scripts/
│   └── scraper.mjs      # Apify-powered Facebook scraper
├── data/                # Local data storage
├── package.json
├── wrangler.toml        # Cloudflare Pages config
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd packages/facebook-dashboard
npm install
```

### 2. Run the Scraper

The scraper uses the Apify API to fetch Facebook page data.

```bash
# Set your Apify API token (optional if using default)
export APIFY_API_TOKEN=your_apify_token

# Run the scraper
npm run scrape
```

### 3. Local Development

```bash
# Start local dev server
npm run dev
```

Open http://localhost:8788 in your browser.

### 4. Deploy to Cloudflare Pages

```bash
# Set your Cloudflare API token
export CLOUDFLARE_API_TOKEN=your_cloudflare_token

# Deploy
npm run deploy
```

Or use the Cloudflare Dashboard:
1. Go to https://dash.cloudflare.com/
2. Navigate to Workers & Pages
3. Create a new project
4. Upload the `public` folder

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `APIFY_API_TOKEN` | Apify API token for scraping | For scraper |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | For deployment |

### Changing the Target Page

Edit `scripts/scraper.mjs` and update:

```javascript
const FACEBOOK_PAGE_URL = 'https://www.facebook.com/your-page-here/';
```

## Dashboard Features

### Stats Overview
- Followers count
- Likes count
- Posts scraped
- Recent activity count

### Page Profile
- Profile image
- Page name and handle
- Category
- Description
- Contact information

### Posts Feed
- Recent posts with content
- Engagement metrics (likes, comments, shares)
- Timestamps

### Metadata
- Open Graph data
- Page verification status
- Location information

## API Integration

The scraper integrates with Apify's Facebook Pages Scraper actor:
- Actor ID: `apify/facebook-pages-scraper`
- Configurable post limits
- About section scraping
- Posts and engagement data

## Screenshots

The dashboard automatically displays a screenshot of the Facebook page if captured during scraping.

## License

MIT
