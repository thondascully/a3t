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

// --- Mock State ---
// To make the mock API stateful, we'll store some data here.
// In a real app, this data would live in your backend database.
let botStatus: 'active' | 'inactive' = 'inactive';
let walletBalance = 1337.42;

/**
 * A helper function to simulate network delay for an API call.
 * @param data The data to return after the delay.
 * @param delay The delay in milliseconds.
 * @returns A promise that resolves with the data.
 */
const mockApiCall = <T>(data: T, delay = 600): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), delay));
};

// --- API Client ---
// This object contains all the functions to interact with the backend.

export const api = {
  /**
   * Fetches historical backtest data for a given set of whale addresses.
   * NOTE: This mock intentionally returns an empty array to demonstrate
   * the frontend's fallback logic to its own mock data.
   */
  async getBacktestData(addresses: string[], category: MarketCategory): Promise<{ data: BacktestData[] }> {
    console.log(`[API MOCK] Fetching backtest for addresses: ${addresses.join(', ')} in ${category}`);
    return mockApiCall({ data: [] });
  },

  /**
   * Retrieves the current status of the user's trading bot.
   */
  async getBotStatus(userId: string): Promise<{ status: 'active' | 'inactive' }> {
    console.log(`[API MOCK] Getting bot status for user: ${userId}`);
    return mockApiCall({ status: botStatus });
  },

  /**
   * Sends a command to start the trading bot.
   */
  async startBot(userId: string): Promise<{ success: boolean }> {
    console.log(`[API MOCK] Starting bot for user: ${userId}`);
    botStatus = 'active';
    return mockApiCall({ success: true });
  },

  /**
   * Sends a command to stop the trading bot.
   */
  async stopBot(userId: string): Promise<{ success: boolean }> {
    console.log(`[API MOCK] Stopping bot for user: ${userId}`);
    botStatus = 'inactive';
    return mockApiCall({ success: true });
  },

  /**
   * Fetches the user's current wallet balance.
   */
  async getWalletBalance(userId: string): Promise<{ balance: number }> {
    console.log(`[API MOCK] Getting wallet balance for user: ${userId}`);
    return mockApiCall({ balance: walletBalance });
  },

  /**
   * Initiates a withdrawal of all funds to the user's linked address.
   */
  async withdrawFunds(userId: string): Promise<{ success: boolean; txHash?: string; message?: string }> {
    console.log(`[API MOCK] Withdrawing funds for user: ${userId}`);
    if (walletBalance <= 0) {
      return mockApiCall({ success: false, message: "Insufficient funds." });
    }
    // Simulate the withdrawal and generate a fake transaction hash
    walletBalance = 0; // Reset balance after withdrawal
    const fakeTxHash = `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    return mockApiCall({ success: true, txHash: fakeTxHash });
  },

  /**
   * Gets the fixed deposit address for the user's account.
   */
  async getDepositAddress(userId: string): Promise<{ address: string }> {
    console.log(`[API MOCK] Getting deposit address for user: ${userId}`);
    return mockApiCall({ address: "0x742d35Cc6634C0532925a3b844Bc45f02Eb50Ea" });
  },
};