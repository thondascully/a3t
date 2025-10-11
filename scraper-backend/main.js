// main.js - Core functions for the Polymarket scraper API

import fetch from 'node-fetch';

// Valid categories that can be used for leaderboard and backtesting
export const VALID_CATEGORIES = new Set([
  'politics',
  'sports', 
  'crypto',
  'culture',
  'mentions',
  'weather',
  'economics',
  'tech',
  'overall'
]);

// Configuration
const POLYMARKET_API_BASE = 'https://data-api.polymarket.com';
const TRADER_BACKEND_URL = process.env.TRADER_BACKEND_URL || 'http://localhost:8080';

// Category lookup for market slugs (placeholder - would need real mapping)
export const SLUG_CATEGORY_LOOKUP = {};

/**
 * Fetch closed positions for a specific wallet address
 * @param {string} walletAddress - The wallet address to fetch positions for
 * @returns {Promise<Array>} Array of closed positions
 */
export async function fetchClosedPositionsForWallet(walletAddress) {
  // Placeholder implementation - would need real Polymarket API integration
  console.log(`Fetching closed positions for wallet: ${walletAddress}`);
  return [];
}

/**
 * Backtest a portfolio on a specific category
 * @param {number} startBalance - Starting balance for backtest
 * @param {number} positionPercentage - Percentage of balance to use per position
 * @param {Array<string>} addresses - Array of wallet addresses
 * @param {Array<string>} categories - Array of categories to test
 * @param {Object} slugCategoryLookup - Category lookup object
 * @returns {Promise<Object>} Backtest results
 */
export async function backtestPortfolioOnCategory(startBalance, positionPercentage, addresses, categories, slugCategoryLookup) {
  console.log(`Running backtest for ${addresses.length} addresses on categories: ${categories.join(', ')}`);
  
  // Placeholder implementation - would need real backtesting logic
  const results = {};
  
  for (const address of addresses) {
    results[address] = {};
    for (const category of categories) {
      // Mock backtest results
      const mockFinalBalance = startBalance + (Math.random() - 0.5) * startBalance * 0.5;
      results[address][category] = {
        finalBalance: mockFinalBalance,
        actualPnl: (mockFinalBalance - startBalance) * 10, // Mock whale PnL
        history: Array.from({ length: 30 }, (_, i) => {
          const progress = i / 29;
          return startBalance + (mockFinalBalance - startBalance) * progress;
        })
      };
    }
  }
  
  return results;
}

/**
 * Fetch leaderboard data from Polymarket API
 * @param {Object} options - Options for fetching leaderboard
 * @param {string} options.category - Category to fetch leaderboard for
 * @param {string} options.timePeriod - Time period (day, week, month, all)
 * @param {number} options.limit - Number of results to return
 * @param {string} options.orderBy - Order by field (PNL, VOL)
 * @returns {Promise<Array>} Array of leaderboard entries
 */
export async function fetchPolymarketLeaderboard({ category, timePeriod, limit, orderBy }) {
  console.log(`Fetching leaderboard: category=${category}, timePeriod=${timePeriod}, limit=${limit}, orderBy=${orderBy}`);
  
  // Placeholder implementation - would need real Polymarket API integration
  // For now, return mock data that matches the expected format
  const mockLeaderboard = [];
  
  for (let i = 0; i < limit; i++) {
    const mockPnl = (Math.random() - 0.3) * 100000; // Random PnL between -30k and 70k
    const mockVolume = Math.random() * 10000000; // Random volume up to 10M
    
    mockLeaderboard.push({
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      name: `Whale_${i + 1}`,
      pnl: Math.round(mockPnl),
      volume: Math.round(mockVolume),
      winRate: Math.round(50 + Math.random() * 40), // Win rate between 50-90%
      rank: i + 1
    });
  }
  
  // Sort by PnL if that's the orderBy field
  if (orderBy === 'PNL') {
    mockLeaderboard.sort((a, b) => b.pnl - a.pnl);
  } else if (orderBy === 'VOL') {
    mockLeaderboard.sort((a, b) => b.volume - a.volume);
  }
  
  // Update ranks after sorting
  mockLeaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  return mockLeaderboard;
}

/**
 * Fetch whale positions from Polymarket API
 * @param {string} whaleAddress - The whale wallet address
 * @param {string} category - Optional category filter
 * @returns {Promise<Array>} Array of whale positions
 */
export async function fetchWhalePositions(whaleAddress, category = null) {
  console.log(`Fetching positions for whale: ${whaleAddress}, category: ${category || 'all'}`);
  
  try {
    // Build the API URL with parameters
    const url = new URL(`${POLYMARKET_API_BASE}/positions`);
    url.searchParams.set('user', whaleAddress);
    url.searchParams.set('sortBy', 'CURRENT');
    url.searchParams.set('sortDirection', 'DESC');
    url.searchParams.set('sizeThreshold', '0.1');
    url.searchParams.set('limit', '50');
    url.searchParams.set('offset', '0');
    
    console.log(`Making request to: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Polymarket-Scraper/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Filter by category if specified
    let positions = data.positions || data || [];
    
    if (category && category !== 'all') {
      positions = positions.filter(position => {
        // This would need to be mapped based on actual Polymarket data structure
        // For now, we'll include all positions
        return true;
      });
    }
    
    // Transform the data to a consistent format
    const formattedPositions = positions.map((position, index) => ({
      marketId: position.market_id || position.id || `market_${index}`,
      marketQuestion: position.question || position.title || position.marketQuestion,
      outcome: position.outcome || position.side || (position.positionSize > 0 ? 'Yes' : 'No'),
      positionSize: position.size || position.amount || position.positionSize,
      currentPrice: position.price || position.current_price || 0.5,
      realizedPnl: position.realized_pnl || position.realizedPnl || 0,
      unrealizedPnl: position.unrealized_pnl || position.unrealizedPnl || 0,
      category: position.category || category || 'unknown',
      createdAt: position.created_at || position.timestamp || new Date().toISOString(),
      updatedAt: position.updated_at || position.last_updated || new Date().toISOString()
    }));
    
    console.log(`Retrieved ${formattedPositions.length} positions for whale ${whaleAddress}`);
    return formattedPositions;
    
  } catch (error) {
    console.error(`Error fetching whale positions for ${whaleAddress}:`, error);
    
    // Return mock data for development/testing
    console.log('Returning mock whale positions for development');
    return generateMockWhalePositions(whaleAddress, category);
  }
}

/**
 * Generate mock whale positions for development
 * @param {string} whaleAddress - The whale wallet address
 * @param {string} category - Category filter
 * @returns {Array} Mock positions
 */
function generateMockWhalePositions(whaleAddress, category) {
  const mockPositions = [];
  const positionCount = Math.floor(Math.random() * 10) + 5; // 5-15 positions
  
  for (let i = 0; i < positionCount; i++) {
    const mockPosition = {
      marketId: `market_${i + 1}`,
      marketQuestion: `Mock Market ${i + 1} - Will X happen?`,
      outcome: Math.random() > 0.5 ? 'Yes' : 'No',
      positionSize: Math.random() * 10000 + 1000, // $1k - $11k
      currentPrice: Math.random() * 0.8 + 0.1, // 0.1 - 0.9
      realizedPnl: (Math.random() - 0.5) * 5000, // -$2.5k to +$2.5k
      unrealizedPnl: (Math.random() - 0.5) * 3000, // -$1.5k to +$1.5k
      category: category || ['politics', 'sports', 'crypto'][Math.floor(Math.random() * 3)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockPositions.push(mockPosition);
  }
  
  return mockPositions;
}

/**
 * Execute trades based on whale positions
 * @param {Array<string>} whaleAddresses - Array of whale addresses to copy
 * @param {string} category - Category to filter positions
 * @param {number} positionPercentage - Percentage of balance to use per position
 * @returns {Promise<Array>} Array of trade execution results
 */
export async function executeWhaleTrades(whaleAddresses, category, positionPercentage) {
  console.log(`Executing whale trades for ${whaleAddresses.length} whales, category: ${category}`);
  
  const results = [];
  
  for (const whaleAddress of whaleAddresses) {
    try {
      console.log(`Processing whale: ${whaleAddress}`);
      
      // Fetch positions for this whale
      const positions = await fetchWhalePositions(whaleAddress, category);
      
      // Filter positions by category if specified
      const filteredPositions = category && category !== 'all' 
        ? positions.filter(pos => pos.category === category)
        : positions;
      
      // Execute trades for each position
      const trades = [];
      for (const position of filteredPositions) {
        try {
          const tradeResult = await executeSingleWhaleTrade(position, positionPercentage);
          trades.push(tradeResult);
        } catch (error) {
          console.error(`Error executing trade for position ${position.marketId}:`, error);
          trades.push({
            success: false,
            error: error.message,
            position: position
          });
        }
      }
      
      results.push({
        whaleAddress,
        success: true,
        positionsFound: filteredPositions.length,
        tradesExecuted: trades.filter(t => t.success).length,
        tradesFailed: trades.filter(t => !t.success).length,
        trades
      });
      
    } catch (error) {
      console.error(`Error processing whale ${whaleAddress}:`, error);
      results.push({
        whaleAddress,
        success: false,
        error: error.message,
        positionsFound: 0,
        tradesExecuted: 0,
        tradesFailed: 0,
        trades: []
      });
    }
  }
  
  return results;
}

/**
 * Execute a single trade based on a whale position
 * @param {Object} position - Whale position data
 * @param {number} positionPercentage - Percentage of balance to use
 * @returns {Promise<Object>} Trade execution result
 */
async function executeSingleWhaleTrade(position, positionPercentage) {
  try {
    // Calculate trade amount (this would be based on user's balance)
    const userBalance = 1000; // This should be fetched from the trader backend
    const tradeAmount = userBalance * positionPercentage;
    
    // Prepare trade data for the trader backend
    const tradeData = {
      market_id: position.marketId,
      outcome: position.outcome === 'Yes' ? 1 : 0,
      amount_usdc: tradeAmount,
      price: position.currentPrice,
      whale_address: position.whaleAddress,
      position_size: position.positionSize
    };
    
    console.log(`Executing trade: ${JSON.stringify(tradeData)}`);
    
    // Send trade to trader backend
    const response = await fetch(`${TRADER_BACKEND_URL}/polymarket/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(tradeData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Trader backend error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      tradeData,
      result,
      message: 'Trade executed successfully'
    };
    
  } catch (error) {
    console.error(`Error executing single whale trade:`, error);
    return {
      success: false,
      error: error.message,
      position,
      message: 'Trade execution failed'
    };
  }
}
