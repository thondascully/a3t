import express from 'express';
import fs from 'fs';
import { 
    fetchClosedPositionsForWallet,
    backtestPortfolioOnCategory,
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
    console.log(`   POST /api/backtest - Run portfolio backtest`);
    console.log(`\n🔗 Example request:`);
    console.log(`   curl -X POST "http://localhost:${PORT}/api/backtest" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"addresses":["0x123..."],"category":"crypto","startBalance":1000}'`);
});

export default app;
