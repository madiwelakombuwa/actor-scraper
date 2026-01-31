import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const publicDir = join(__dirname, '..', 'public');

// Apify API configuration
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const FACEBOOK_PAGE_URL = process.env.FACEBOOK_PAGE_URL || 'https://www.facebook.com/mayesfortexas/';

if (!APIFY_API_TOKEN) {
    console.error('Error: APIFY_API_TOKEN environment variable is required');
    console.error('Usage: APIFY_API_TOKEN=your_token npm run scrape');
    process.exit(1);
}

// Apify Facebook Page Scraper actor
const ACTOR_ID = 'apify/facebook-pages-scraper';

async function runApifyActor() {
    console.log('Starting Facebook page scraper via Apify API...');
    console.log(`Target: ${FACEBOOK_PAGE_URL}`);

    const input = {
        startUrls: [{ url: FACEBOOK_PAGE_URL }],
        maxPosts: 10,
        maxPostComments: 0,
        maxReviews: 0,
        scrapeAbout: true,
        scrapePosts: true,
        scrapeServices: false,
        scrapeReviews: false
    };

    try {
        // Start the actor run
        console.log('Starting Apify actor run...');
        const startResponse = await fetch(
            `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/runs?token=${APIFY_API_TOKEN}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            }
        );

        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            throw new Error(`Failed to start actor: ${startResponse.status} - ${errorText}`);
        }

        const runData = await startResponse.json();
        const runId = runData.data.id;
        console.log(`Actor run started with ID: ${runId}`);

        // Poll for completion
        let status = 'RUNNING';
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max wait

        while (status === 'RUNNING' || status === 'READY') {
            if (attempts >= maxAttempts) {
                throw new Error('Actor run timed out');
            }

            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            attempts++;

            const statusResponse = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
            );

            if (!statusResponse.ok) {
                throw new Error(`Failed to get run status: ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json();
            status = statusData.data.status;
            console.log(`Run status: ${status} (attempt ${attempts}/${maxAttempts})`);
        }

        if (status !== 'SUCCEEDED') {
            throw new Error(`Actor run failed with status: ${status}`);
        }

        // Get the results
        console.log('Fetching results...');
        const datasetId = runData.data.defaultDatasetId;
        const resultsResponse = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
        );

        if (!resultsResponse.ok) {
            throw new Error(`Failed to get results: ${resultsResponse.status}`);
        }

        const results = await resultsResponse.json();
        return results;

    } catch (error) {
        console.error('Apify API error:', error.message);
        throw error;
    }
}

async function transformData(apifyData) {
    // Transform Apify data to our dashboard format
    const page = apifyData[0] || {};

    return {
        url: FACEBOOK_PAGE_URL,
        scrapedAt: new Date().toISOString(),
        pageName: page.name || page.title || '',
        pageHandle: 'mayesfortexas',
        description: page.about || page.description || '',
        category: page.categories?.join(', ') || page.category || '',
        followers: formatNumber(page.followersCount || page.followers) + ' followers',
        likes: formatNumber(page.likesCount || page.likes) + ' likes',
        profileImage: page.profilePicture || page.profilePic || '',
        coverImage: page.coverPhoto || '',
        contactInfo: {
            website: page.website || page.externalUrl || '',
            email: page.email || '',
            phone: page.phone || ''
        },
        about: page.about || page.description || '',
        address: page.address || '',
        posts: (page.posts || []).slice(0, 10).map((post, index) => ({
            id: index + 1,
            content: post.text || post.message || '',
            likes: post.likes || post.likesCount || 0,
            comments: post.comments || post.commentsCount || 0,
            shares: post.shares || post.sharesCount || 0,
            date: post.time || post.timestamp || '',
            url: post.url || post.postUrl || '',
            scrapedAt: new Date().toISOString()
        })),
        recentActivity: [],
        metadata: {
            ogTitle: page.name || '',
            ogDescription: page.about || '',
            ogImage: page.profilePicture || '',
            pageType: page.categories?.[0] || 'Facebook Page',
            location: page.address || page.city || '',
            verified: page.verified || false,
            checkins: page.checkins || 0,
            priceRange: page.priceRange || ''
        },
        rawData: page
    };
}

function formatNumber(num) {
    if (!num) return '0';
    if (typeof num === 'string') return num;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

async function main() {
    // Ensure directories exist
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
    if (!existsSync(publicDir)) {
        mkdirSync(publicDir, { recursive: true });
    }

    try {
        const apifyData = await runApifyActor();
        const pageData = await transformData(apifyData);

        // Save the data
        const outputPath = join(dataDir, 'page-data.json');
        writeFileSync(outputPath, JSON.stringify(pageData, null, 2));
        console.log(`Data saved to: ${outputPath}`);

        // Copy to public directory
        const publicOutputPath = join(publicDir, 'page-data.json');
        writeFileSync(publicOutputPath, JSON.stringify(pageData, null, 2));
        console.log(`Data copied to: ${publicOutputPath}`);

        console.log('\n=== Scraping Complete ===');
        console.log('Page Name:', pageData.pageName || 'Not found');
        console.log('Followers:', pageData.followers || 'Not found');
        console.log('Likes:', pageData.likes || 'Not found');
        console.log('Posts scraped:', pageData.posts?.length || 0);
        console.log('Description:', (pageData.description || '').substring(0, 100) || 'Not found');

        return pageData;
    } catch (error) {
        console.error('Scraper failed:', error.message);

        // Save error state
        const errorData = {
            url: FACEBOOK_PAGE_URL,
            scrapedAt: new Date().toISOString(),
            error: error.message,
            pageName: 'Error loading data',
            pageHandle: 'mayesfortexas',
            description: 'Failed to scrape Facebook page data. Please try again.',
            followers: 'N/A',
            likes: 'N/A',
            posts: [],
            recentActivity: [],
            metadata: {}
        };

        const outputPath = join(publicDir, 'page-data.json');
        writeFileSync(outputPath, JSON.stringify(errorData, null, 2));

        process.exit(1);
    }
}

main();
