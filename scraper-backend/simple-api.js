import express from 'express';
import fs from 'fs';
import fetch from 'node-fetch';
import { 
    fetchClosedPositionsForWallet,
    backtestPortfolioOnCategory,
    fetchPolymarketLeaderboard,
    fetchWhalePositions,
    executeWhaleTrades,
    SLUG_CATEGORY_LOOKUP,
    VALID_CATEGORIES 
} from './main.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

/**
 * Format backtest results into the requested format
 * @param {Object} backtestResults - Results from backtestPortfolioOnCategory
 * @param {string} category - Category that was tested
 * @param {number} startBalance - Starting balance
 * @returns {Array} Formatted results
 */
function formatBacktestResults(backtestResults, category, startBalance) {
    const results = [];
    
    for (const [address, categoryResults] of Object.entries(backtestResults)) {
        const categoryData = categoryResults[category];
        
        if (categoryData) {
            // Use the history array from the backtest results
            const points = categoryData.history || [startBalance, categoryData.finalBalance];
            
            results.push({
                address,
                points,
                finalPnL: Math.round((categoryData.finalBalance - startBalance) * 100) / 100,
                startBalance,
                endBalance: Math.round(categoryData.finalBalance * 100) / 100,
                whaleAbsolutePnL: Math.round(categoryData.actualPnl * 100) / 100
            });
        } else {
            // If no data for this category, return default values
            results.push({
                address,
                points: [startBalance],
                finalPnL: 0,
                startBalance,
                endBalance: startBalance,
                whaleAbsolutePnL: 0
            });
        }
    }
    
    return results;
}

/**
 * Main API endpoint
 * POST /api/backtest
 * Body: {
 *   addresses: string[],
 *   category: string,
 *   startBalance?: number (optional, defaults to 1000),
 *   positionPercentage?: number (optional, defaults to 0.02)
 * }
 */
app.post('/api/backtest', async (req, res) => {
    try {
        const { addresses, category, startBalance = 1000, positionPercentage = 0.02 } = req.body;

        // Validation
        if (!Array.isArray(addresses) || addresses.length === 0) {
            return res.status(400).json({ 
                error: 'addresses must be a non-empty array of wallet addresses' 
            });
        }

        if (!category || typeof category !== 'string') {
            return res.status(400).json({ 
                error: 'category must be a non-empty string' 
            });
        }

        // Validate category
        if (!VALID_CATEGORIES.has(category.toLowerCase())) {
            return res.status(400).json({ 
                error: `Invalid category: ${category}. Valid categories are: ${Array.from(VALID_CATEGORIES).join(', ')}` 
            });
        }

        if (typeof startBalance !== 'number' || startBalance <= 0) {
            return res.status(400).json({ 
                error: 'startBalance must be a positive number' 
            });
        }

        if (typeof positionPercentage !== 'number' || positionPercentage <= 0 || positionPercentage > 1) {
            return res.status(400).json({ 
                error: 'positionPercentage must be a number between 0 and 1' 
            });
        }

        console.log(`Running backtest for ${addresses.length} addresses, category: ${category}`);

        // Run the backtest using the existing function
        const backtestResults = await backtestPortfolioOnCategory(
            startBalance,
            positionPercentage,
            addresses,
            [category.toLowerCase()],
            SLUG_CATEGORY_LOOKUP
        );

        // Format the results
        const formattedResults = formatBacktestResults(backtestResults, category.toLowerCase(), startBalance);

        res.json({
            data: formattedResults
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * Category-based backtest endpoint
 * POST /api/category-backtest
 * Body: {
 *   addresses: string[],
 *   category: string
 * }
 */
app.post('/api/category-backtest', async (req, res) => {
    try {
        const { addresses, category } = req.body;

        // Validation
        if (!Array.isArray(addresses) || addresses.length === 0) {
            return res.status(400).json({ 
                error: 'addresses must be a non-empty array of wallet addresses' 
            });
        }

        if (!category || typeof category !== 'string') {
            return res.status(400).json({ 
                error: 'category must be a non-empty string' 
            });
        }

        // Validate category
        if (!VALID_CATEGORIES.has(category.toLowerCase())) {
            return res.status(400).json({ 
                error: `Invalid category: ${category}. Valid categories are: ${Array.from(VALID_CATEGORIES).join(', ')}` 
            });
        }

        console.log(`Running category backtest for ${addresses.length} addresses, category: ${category}`);

        // Use default parameters for category backtest
        const startBalance = 1000;
        const positionPercentage = 0.02;

        // Run the backtest using the existing function
        const backtestResults = await backtestPortfolioOnCategory(
            startBalance,
            positionPercentage,
            addresses,
            [category.toLowerCase()],
            SLUG_CATEGORY_LOOKUP
        );

        // Format the results
        const formattedResults = formatBacktestResults(backtestResults, category.toLowerCase(), startBalance);

        res.json({
            data: formattedResults
        });

    } catch (error) {
        console.error('Category backtest API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

/**
 * Leaderboard endpoint
 * GET /api/leaderboard?category=politics&timePeriod=week&limit=20
 */
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { 
            category = 'overall', 
            timePeriod = 'all', 
            limit = 15,
            orderBy = 'PNL'
        } = req.query;

        // Validation
        if (!VALID_CATEGORIES.has(category.toLowerCase())) {
            return res.status(400).json({ 
                error: `Invalid category: ${category}. Valid categories are: ${Array.from(VALID_CATEGORIES).join(', ')}` 
            });
        }

        const validTimePeriods = ['day', 'week', 'month', 'all'];
        if (!validTimePeriods.includes(timePeriod)) {
            return res.status(400).json({ 
                error: `Invalid timePeriod: ${timePeriod}. Valid time periods are: ${validTimePeriods.join(', ')}` 
            });
        }

        const validOrderBy = ['PNL', 'VOL'];
        if (!validOrderBy.includes(orderBy)) {
            return res.status(400).json({ 
                error: `Invalid orderBy: ${orderBy}. Valid orderBy values are: ${validOrderBy.join(', ')}` 
            });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({ 
                error: 'limit must be a number between 1 and 100' 
            });
        }

        console.log(`Fetching leaderboard: category=${category}, timePeriod=${timePeriod}, limit=${limitNum}`);

        // Try to load from file first
        const fileName = `leaderboard_${category}_${timePeriod}.json`;
        let leaderboard;

        if (fs.existsSync(fileName)) {
            console.log(`Loading leaderboard from file: ${fileName}`);
            const fileContent = fs.readFileSync(fileName, 'utf8');
            leaderboard = JSON.parse(fileContent);
        } else {
            console.log(`File ${fileName} not found, fetching from API`);
            leaderboard = await fetchPolymarketLeaderboard({
                category: category.toLowerCase(),
                timePeriod,
                limit: limitNum,
                orderBy
            });
        }

        // Limit results if file has more than requested
        const limitedResults = leaderboard.slice(0, limitNum);

        res.json({
            success: true,
            data: limitedResults,
            meta: {
                category,
                timePeriod,
                limit: limitNum,
                orderBy,
                totalResults: limitedResults.length,
                source: fs.existsSync(fileName) ? 'file' : 'api'
            }
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ 
            error: 'Internal server error while fetching leaderboard',
            message: error.message 
        });
    }
});

/**
 * Health check endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Simple Polymarket API is running',
        timestamp: new Date().toISOString()
    });
});

/**
 * Get available categories
 * GET /api/categories
 */
app.get('/api/categories', (req, res) => {
    res.json({
        success: true,
        data: Array.from(VALID_CATEGORIES),
        meta: {
            total: VALID_CATEGORIES.size
        }
    });
});

/**
 * Get available time periods
 * GET /api/time-periods
 */
app.get('/api/time-periods', (req, res) => {
    const timePeriods = ['day', 'week', 'month', 'all'];
    res.json({
        success: true,
        data: timePeriods,
        meta: {
            total: timePeriods.length
        }
    });
});

/**
 * Fetch whale positions from Polymarket API
 * GET /api/whale-positions?address=0x123...&category=politics
 */
app.get('/api/whale-positions', async (req, res) => {
    try {
        const { address, category } = req.query;

        // Validation
        if (!address) {
            return res.status(400).json({ 
                error: 'address parameter is required' 
            });
        }

        if (category && !VALID_CATEGORIES.has(category.toLowerCase())) {
            return res.status(400).json({ 
                error: `Invalid category: ${category}. Valid categories are: ${Array.from(VALID_CATEGORIES).join(', ')}` 
            });
        }

        console.log(`Fetching positions for whale: ${address}`);

        // Fetch positions from Polymarket API
        const positions = await fetchWhalePositions(address, category);

        res.json({
            success: true,
            data: positions,
            meta: {
                whale_address: address,
                category: category || 'all',
                total_positions: positions.length
            }
        });

    } catch (error) {
        console.error('Whale positions error:', error);
        res.status(500).json({ 
            error: 'Internal server error while fetching whale positions',
            message: error.message 
        });
    }
});

/**
 * Execute trades based on whale positions
 * POST /api/execute-whale-trades
 * Body: {
 *   addresses: string[],
 *   category: string,
 *   positionPercentage?: number (optional, defaults to 0.02)
 * }
 */
app.post('/api/execute-whale-trades', async (req, res) => {
    try {
        const { addresses, category, positionPercentage = 0.02 } = req.body;

        // Validation
        if (!Array.isArray(addresses) || addresses.length === 0) {
            return res.status(400).json({ 
                error: 'addresses must be a non-empty array of whale addresses' 
            });
        }

        if (!category || typeof category !== 'string') {
            return res.status(400).json({ 
                error: 'category must be a non-empty string' 
            });
        }

        if (!VALID_CATEGORIES.has(category.toLowerCase())) {
            return res.status(400).json({ 
                error: `Invalid category: ${category}. Valid categories are: ${Array.from(VALID_CATEGORIES).join(', ')}` 
            });
        }

        if (typeof positionPercentage !== 'number' || positionPercentage <= 0 || positionPercentage > 1) {
            return res.status(400).json({ 
                error: 'positionPercentage must be a number between 0 and 1' 
            });
        }

        console.log(`Executing whale trades for ${addresses.length} addresses, category: ${category}`);

        // Execute trades based on whale positions
        const results = await executeWhaleTrades(addresses, category, positionPercentage);

        res.json({
            success: true,
            data: results,
            meta: {
                category,
                positionPercentage,
                total_whales: addresses.length,
                total_trades: results.reduce((sum, result) => sum + result.trades.length, 0)
            }
        });

    } catch (error) {
        console.error('Execute whale trades error:', error);
        res.status(500).json({ 
            error: 'Internal server error while executing whale trades',
            message: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Simple Polymarket API running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`   GET  /api/categories - Get available categories`);
    console.log(`   GET  /api/time-periods - Get available time periods`);
    console.log(`   GET  /api/leaderboard - Get leaderboard data`);
    console.log(`   POST /api/backtest - Run portfolio backtest`);
    console.log(`   POST /api/category-backtest - Run category-based backtest`);
    console.log(`   GET  /api/whale-positions - Fetch whale positions`);
    console.log(`   POST /api/execute-whale-trades - Execute trades based on whale positions`);
    console.log(`\n🔗 Example requests:`);
    console.log(`   curl "http://localhost:${PORT}/api/leaderboard?category=politics&timePeriod=week&limit=10"`);
    console.log(`   curl -X POST "http://localhost:${PORT}/api/backtest" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"addresses":["0x123..."],"category":"crypto","startBalance":1000}'`);
    console.log(`   curl "http://localhost:${PORT}/api/whale-positions?address=0x123...&category=politics"`);
    console.log(`   curl -X POST "http://localhost:${PORT}/api/execute-whale-trades" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"addresses":["0x123..."],"category":"politics","positionPercentage":0.02}'`);
});

export default app;
