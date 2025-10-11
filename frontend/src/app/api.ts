// src/api.ts

// --- Type Definitions ---
// These types should match what your frontend component expects.

export type MarketCategory = "Politics" | "Sports" | "Crypto" | "Culture" | "Mentions" | "Weather" | "Economics" | "Tech";

export interface BacktestData {
  address: string;
  points: number[];
  finalPnL: number;
  startBalance: number;
  endBalance: number;
  whaleAbsolutePnL: number;
}

export interface WhalePosition {
  marketId: string;
  marketQuestion: string;
  outcome: string;
  positionSize: number;
  currentPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeExecutionResult {
  success: boolean;
  tradeData?: any;
  result?: any;
  error?: string;
  message: string;
  position?: WhalePosition;
}

export interface WhaleTradeResult {
  whaleAddress: string;
  success: boolean;
  positionsFound: number;
  tradesExecuted: number;
  tradesFailed: number;
  trades: TradeExecutionResult[];
  error?: string;
}

export interface LeaderboardEntry {
  address: string;
  name?: string;
  pnl: number;
  volume?: number;
  winRate?: number;
  rank?: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
  meta: {
    category: string;
    timePeriod: string;
    limit: number;
    orderBy: string;
    totalResults: number;
    source: string;
  };
}

// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const SCRAPER_API_URL = process.env.NEXT_PUBLIC_SCRAPER_API_URL || 'http://localhost:3000';

/**
 * A helper function to make API calls with error handling.
 */
const apiCall = async <T>(url: string, options?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    // Don't throw the error, let individual functions handle fallbacks
    throw error;
  }
};

// --- API Client ---
// This object contains all the functions to interact with the backend.

export const api = {
  /**
   * Fetches historical backtest data for a given set of whale addresses.
   */
  async getBacktestData(addresses: string[], category: MarketCategory): Promise<{ data: BacktestData[] }> {
    console.log(`[API] Fetching backtest for addresses: ${addresses.join(', ')} in ${category}`);
    
    try {
      const response = await apiCall<{ data: BacktestData[] }>(`${SCRAPER_API_URL}/api/backtest`, {
        method: 'POST',
        body: JSON.stringify({
          addresses,
          category: category.toLowerCase(),
          startBalance: 10,
          positionPercentage: 0.02
        }),
      });
      
      return response;
    } catch (error) {
      console.error('Failed to fetch backtest data:', error);
      // Fallback to empty data to trigger frontend mock data
      return { data: [] };
    }
  },

  /**
   * Fetches category-based backtest data for multiple addresses in a specific category.
   */
  async getCategoryBacktestData(addresses: string[], category: MarketCategory): Promise<{ data: BacktestData[] }> {
    console.log(`[API] Fetching category backtest for addresses: ${addresses.join(', ')} in ${category}`);
    
    try {
      const response = await apiCall<{ data: BacktestData[] }>(`${SCRAPER_API_URL}/api/category-backtest`, {
        method: 'POST',
        body: JSON.stringify({
          addresses,
          category: category.toLowerCase()
        }),
      });
      
      console.log(`[API] Category backtest response:`, response);
      return response;
    } catch (error) {
      console.error('Failed to fetch category backtest data:', error);
      // Return empty data to trigger frontend mock data fallback
      return { data: [] };
    }
  },

  /**
   * Retrieves the current status of the user's trading bot.
   */
  async getBotStatus(userId: string): Promise<{ status: 'active' | 'inactive' }> {
    console.log(`[API] Getting bot status for user: ${userId}`);
    
    try {
      const response = await apiCall<{ status: 'active' | 'inactive'; trading_engine_ready: boolean }>(`${API_BASE_URL}/bot/status`);
      return { status: response.status };
    } catch (error) {
      console.error('Failed to get bot status:', error);
      return { status: 'inactive' };
    }
  },

  /**
   * Sends a command to start the trading bot.
   */
  async startBot(userId: string): Promise<{ success: boolean }> {
    console.log(`[API] Starting bot for user: ${userId}`);
    
    try {
      const response = await apiCall<{ success: boolean; message: string }>(`${API_BASE_URL}/bot/start`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      return { success: response.success };
    } catch (error) {
      console.error('Failed to start bot:', error);
      return { success: false };
    }
  },

  /**
   * Sends a command to stop the trading bot.
   */
  async stopBot(userId: string): Promise<{ success: boolean }> {
    console.log(`[API] Stopping bot for user: ${userId}`);
    
    try {
      const response = await apiCall<{ success: boolean; message: string }>(`${API_BASE_URL}/bot/stop`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      return { success: response.success };
    } catch (error) {
      console.error('Failed to stop bot:', error);
      return { success: false };
    }
  },

  /**
   * Fetches the user's current wallet balance.
   */
  async getWalletBalance(userId: string): Promise<{ balance: number }> {
    console.log(`[API] Getting wallet balance for user: ${userId}`);
    
    try {
      const response = await apiCall<{ balance_eth: number; status: string }>(`${API_BASE_URL}/wallet/balance`);
      if (response.status === 'success') {
        return { balance: response.balance_eth * 2000 }; // Convert ETH to USD (rough estimate)
      } else {
        return { balance: 10 }; // Default fallback
      }
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return { balance: 10 }; // Default fallback
    }
  },

  /**
   * Initiates a withdrawal of all funds to the user's linked address.
   */
  async withdrawFunds(userId: string): Promise<{ success: boolean; txHash?: string; message?: string }> {
    console.log(`[API] Withdrawing funds for user: ${userId}`);
    
    try {
      const response = await apiCall<{ success: boolean; tx_hash?: string; message?: string }>(`${API_BASE_URL}/wallet/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId,
          to_address: "0x0000000000000000000000000000000000000000" // Default withdrawal address
        })
      });
      
      return { 
        success: response.success,
        txHash: response.tx_hash,
        message: response.message || "Withdrawal initiated"
      };
    } catch (error) {
      console.error('Failed to withdraw funds:', error);
      return { success: false, message: "Withdrawal failed" };
    }
  },

  /**
   * Gets the fixed deposit address for the user's account.
   */
  async getDepositAddress(userId: string): Promise<{ address: string }> {
    console.log(`[API] Getting deposit address for user: ${userId}`);
    
    try {
      const response = await apiCall<{ address: string }>(`${API_BASE_URL}/wallet/address`);
      return response;
    } catch (error) {
      console.error('Failed to get deposit address:', error);
      return { address: "0x0000000000000000000000000000000000000000" };
    }
  },

  /**
   * Fetches leaderboard data from the scraper API.
   */
  async getLeaderboard(category: string = 'overall', timePeriod: string = 'all', limit: number = 15, orderBy: string = 'PNL'): Promise<LeaderboardResponse> {
    console.log(`[API] Fetching leaderboard: category=${category}, timePeriod=${timePeriod}, limit=${limit}`);
    
    try {
      const params = new URLSearchParams({
        category,
        timePeriod,
        limit: limit.toString(),
        orderBy
      });
      
      const response = await apiCall<LeaderboardResponse>(`${SCRAPER_API_URL}/api/leaderboard?${params}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      // Return empty response on error
      return {
        success: false,
        data: [],
        meta: {
          category,
          timePeriod,
          limit,
          orderBy,
          totalResults: 0,
          source: 'error'
        }
      };
    }
  },

  /**
   * Fetches whale positions from Polymarket API.
   */
  async getWhalePositions(address: string, category?: string): Promise<{ success: boolean; data: WhalePosition[] }> {
    console.log(`[API] Fetching whale positions for address: ${address}, category: ${category || 'all'}`);
    
    try {
      const params = new URLSearchParams({
        address,
        ...(category && { category: category.toLowerCase() })
      });
      
      const response = await apiCall<{ success: boolean; data: WhalePosition[] }>(`${SCRAPER_API_URL}/api/whale-positions?${params}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch whale positions:', error);
      return { success: false, data: [] };
    }
  },

  /**
   * Executes trades based on whale positions.
   */
  async executeWhaleTrades(addresses: string[], category: MarketCategory, positionPercentage: number = 0.02): Promise<{ success: boolean; data: WhaleTradeResult[] }> {
    console.log(`[API] Executing whale trades for addresses: ${addresses.join(', ')}, category: ${category}`);
    
    try {
      const response = await apiCall<{ success: boolean; data: WhaleTradeResult[] }>(`${SCRAPER_API_URL}/api/execute-whale-trades`, {
        method: 'POST',
        body: JSON.stringify({
          addresses,
          category: category.toLowerCase(),
          positionPercentage
        }),
      });
      
      return response;
    } catch (error) {
      console.error('Failed to execute whale trades:', error);
      return { success: false, data: [] };
    }
  },
};