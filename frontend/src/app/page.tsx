"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, Bot, Plus, History, X, Activity } from 'lucide-react';
import { TradingActivityLog } from '../components/TradingActivityLog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from "sonner";
import { api } from './api';
import type { BacktestData, LeaderboardEntry } from './api';
import { fetchBacktestDataWithFallback } from '../lib/backtest-utils';

// --- Types and Mock Data ---

type MarketCategory = "Politics" | "Sports" | "Crypto" | "Culture" | "Mentions" | "Weather" | "Economics" | "Tech";
type TimeFrame = "Daily" | "Weekly" | "Monthly" | "All Time";

interface Whale {
  id: string;
  name: string;
  address: string;
  category: MarketCategory;
  netVolume: number;
  winRate: number;
  pnl: number;
}

interface BacktestResponse {
  data: BacktestData[];
}

interface CategoryBacktestData {
  category: MarketCategory;
  data: BacktestData[];
  aggregatedData?: {
    totalPnL: number;
    averagePnL: number;
    bestPerformer: BacktestData;
    worstPerformer: BacktestData;
    combinedPoints: number[];
  };
}

// Mock category backtest data
const mockCategoryBacktestData: Record<string, BacktestResponse> = {
  "Crypto": {
    data: [
      {
        address: "0x12...aBcF",
        points: [10, 10.05, 10.13, 10.20, 10.19, 10.26, 10.32, 10.39, 10.45, 10.53, 10.58, 10.66, 10.72, 10.79, 10.85, 10.93, 10.98, 11.06, 11.12, 11.19, 11.25, 11.33, 11.39, 11.46, 11.52, 11.59, 11.65, 11.73, 11.79, 11.86, 11.92, 12.00, 12.05, 12.13, 12.19, 12.26, 12.32, 12.39, 12.45, 12.53, 12.59, 12.66, 12.72, 12.79, 12.85, 12.93, 12.99, 13.06, 13.12, 13.19, 13.25, 13.33, 13.39, 13.46, 13.52, 13.59, 13.65, 13.73, 13.79, 13.86, 13.92, 14.00],
        finalPnL: 4.00,
        startBalance: 10,
        endBalance: 14.00,
        whaleAbsolutePnL: 140000
      },
      {
        address: "0x34...dEfG",
        points: [10, 9.99, 10.02, 10.06, 10.08, 10.13, 10.15, 10.19, 10.22, 10.26, 10.28, 10.33, 10.35, 10.39, 10.42, 10.46, 10.48, 10.53, 10.55, 10.59, 10.62, 10.66, 10.68, 10.73, 10.75, 10.79, 10.82, 10.86, 10.88, 10.93, 10.95, 10.99, 11.02, 11.06, 11.08, 11.13, 11.15, 11.19, 11.22, 11.26, 11.28, 11.33, 11.35, 11.39, 11.42, 11.46, 11.48, 11.53, 11.55, 11.59, 11.62, 11.66, 11.68, 11.73, 11.75, 11.79, 11.82, 11.86, 11.88, 11.93, 11.95, 12.00],
        finalPnL: 2.00,
        startBalance: 10,
        endBalance: 12.00,
        whaleAbsolutePnL: 15000
      }
    ]
  },
  "Politics": {
    data: [
      {
        address: "0x56...hIjK",
        points: [10, 10.05, 10.12, 10.08, 10.18, 10.25, 10.20, 10.28, 10.35, 10.42, 10.38, 10.48, 10.55, 10.62, 10.58, 10.68, 10.75, 10.82, 10.78, 10.88, 10.95, 11.02, 10.98, 11.08, 11.15, 11.22, 11.18, 11.28, 11.35, 11.42, 11.50, 11.55, 11.62, 11.58, 11.68, 11.75, 11.82, 11.78, 11.88, 11.95, 12.02, 11.98, 12.08, 12.15, 12.22, 12.18, 12.28, 12.35, 12.42, 12.38, 12.48, 12.55, 12.62, 12.58, 12.68, 12.75, 12.82, 12.78, 12.88, 12.95, 13.02, 13.00],
        finalPnL: 3.00,
        startBalance: 10,
        endBalance: 13.00,
        whaleAbsolutePnL: 85000
      }
    ]
  }
};

// Mock backtest data
const mockBacktestData: Record<string, BacktestResponse> = {
  "0x12...aBcF-Crypto": {
    data: [{
      address: "0x12...aBcF",
      points: [10, 10.15, 10.28, 10.42, 10.38, 10.55, 10.70, 10.65, 10.80, 10.95, 10.88, 11.05, 11.20, 11.15, 11.32, 11.48, 11.42, 11.58, 11.75, 11.68, 11.85, 12.00, 11.95, 12.10, 12.25, 12.20, 12.38, 12.55, 12.48, 12.65, 12.80],
      finalPnL: 2.80,
      startBalance: 10,
      endBalance: 12.80,
      whaleAbsolutePnL: 450000
    }]
  },
  "0x34...dEfG-Politics": {
    data: [{
      address: "0x34...dEfG",
      points: [10, 10.08, 10.18, 10.25, 10.35, 10.42, 10.52, 10.58, 10.68, 10.75, 10.82, 10.92, 10.98, 11.08, 11.15, 11.25, 11.32, 11.42, 11.48, 11.58, 11.65, 11.75, 11.82, 11.92, 11.98, 12.08, 12.15, 12.25, 12.32, 12.42, 12.50],
      finalPnL: 2.50,
      startBalance: 10,
      endBalance: 12.50,
      whaleAbsolutePnL: 310000
    }]
  },
  "0x56...hIjK-Sports": {
    data: [{
      address: "0x56...hIjK",
      points: [10, 10.05, 10.12, 10.08, 10.18, 10.25, 10.20, 10.28, 10.35, 10.42, 10.38, 10.48, 10.55, 10.62, 10.58, 10.68, 10.75, 10.82, 10.78, 10.88, 10.95, 11.02, 10.98, 11.08, 11.15, 11.22, 11.18, 11.28, 11.35, 11.42, 11.50],
      finalPnL: 1.50,
      startBalance: 10,
      endBalance: 11.50,
      whaleAbsolutePnL: 150000
    }]
  },
  "0x78...lMnO-Tech": {
    data: [{
      address: "0x78...lMnO",
      points: [10, 10.22, 10.45, 10.68, 10.88, 11.10, 11.35, 11.55, 11.78, 12.00, 12.20, 12.45, 12.68, 12.90, 13.12, 13.35, 13.58, 13.80, 14.02, 14.25, 14.48, 14.70, 14.92, 15.15, 15.38, 15.60, 15.82, 16.05, 16.28, 16.50, 16.72],
      finalPnL: 6.72,
      startBalance: 10,
      endBalance: 16.72,
      whaleAbsolutePnL: 680000
    }]
  },
  "0x90...pQrS-Economics": {
    data: [{
      address: "0x90...pQrS",
      points: [10, 10.10, 10.22, 10.32, 10.45, 10.55, 10.68, 10.78, 10.90, 11.00, 11.12, 11.22, 11.35, 11.45, 11.58, 11.68, 11.80, 11.90, 12.02, 12.12, 12.25, 12.35, 12.48, 12.58, 12.70, 12.80, 12.92, 13.02, 13.15, 13.25, 13.38],
      finalPnL: 3.38,
      startBalance: 10,
      endBalance: 13.38,
      whaleAbsolutePnL: 220000
    }]
  }
};

// Helper function to convert leaderboard entry to whale format
const convertLeaderboardEntryToWhale = (entry: LeaderboardEntry, category: MarketCategory): Whale => {
  const shortAddress = `${entry.address.slice(0, 4)}...${entry.address.slice(-4)}`;
  return {
    id: entry.address,
    name: entry.name || `Whale_${shortAddress}`,
    address: entry.address,
    category,
    netVolume: entry.volume || 0,
    winRate: entry.winRate || 0,
    pnl: entry.pnl || 0
  };
};

// Fallback mock data
const mockWhales: Whale[] = [
  { id: '1', name: "CryptoChad", address: "0x12...aBcF", category: "Crypto", netVolume: 12500000, winRate: 72, pnl: 450000 },
  { id: '2', name: "POTUS_Predictor", address: "0x34...dEfG", category: "Politics", netVolume: 9800000, winRate: 81, pnl: 310000 },
  { id: '3', name: "SportsOracle", address: "0x56...hIjK", category: "Sports", netVolume: 7600000, winRate: 65, pnl: -150000 },
  { id: '4', name: "TechFuture", address: "0x78...lMnO", category: "Tech", netVolume: 15200000, winRate: 78, pnl: 680000 },
  { id: '5', name: "EcoWhale", address: "0x90...pQrS", category: "Economics", netVolume: 11300000, winRate: 69, pnl: 220000 },
];

const CATEGORIES: MarketCategory[] = ["Politics", "Sports", "Crypto", "Culture", "Mentions", "Weather", "Economics", "Tech"];
const TIMEFRAMES: TimeFrame[] = ["Daily", "Weekly", "Monthly", "All Time"];

export default function LeaderboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | "All">("All");
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>("Weekly");
  const [followedWhales, setFollowedWhales] = useState<Record<string, Whale[]>>({});
  const [backtestWhale, setBacktestWhale] = useState<Whale | null>(null);
  const [modalBacktestData, setModalBacktestData] = useState<BacktestData | null>(null);
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [botStatus, setBotStatus] = useState<'active' | 'inactive'>('inactive');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [allWhales, setAllWhales] = useState<Whale[]>(mockWhales);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [categoryBacktestData, setCategoryBacktestData] = useState<CategoryBacktestData | null>(null);
  const [categoryBacktestLoading, setCategoryBacktestLoading] = useState(false);

  // This should ideally come from an authentication context
  const userId = 'user123'; 

  // Load wallet balance and bot status on initial component mount
  useEffect(() => {
    loadWalletData();
    loadBotStatus();
    loadLeaderboardData();
  }, []);

  // Load leaderboard data when category or timeframe changes
  useEffect(() => {
    loadLeaderboardData();
  }, [selectedCategory, selectedTimeframe]);

  const loadWalletData = async () => {
    // Hardcode wallet balance to $10 for demo purposes
    setWalletBalance(10);
  };

  const loadBotStatus = async () => {
    try {
      const data = await api.getBotStatus(userId);
      setBotStatus(data.status);
    } catch (error) {
      console.error('Failed to load bot status:', error);
      // Don't show error toast for bot status, just use default
      setBotStatus('inactive');
    }
  };

  const loadLeaderboardData = async () => {
    setLeaderboardLoading(true);
    try {
      // Map frontend categories to API categories
      const categoryMap: Record<string, string> = {
        'Politics': 'politics',
        'Sports': 'sports', 
        'Crypto': 'crypto',
        'Culture': 'culture',
        'Mentions': 'mentions',
        'Weather': 'weather',
        'Economics': 'economics',
        'Tech': 'tech'
      };

      // Map frontend timeframes to API time periods
      const timeframeMap: Record<TimeFrame, string> = {
        'Daily': 'day',
        'Weekly': 'week',
        'Monthly': 'month',
        'All Time': 'all'
      };

      const apiCategory = selectedCategory === "All" ? "overall" : categoryMap[selectedCategory] || "overall";
      const apiTimePeriod = timeframeMap[selectedTimeframe] || "all";

      const response = await api.getLeaderboard(apiCategory, apiTimePeriod, 15, 'PNL');
      
      if (response.success && response.data.length > 0) {
        const whales = response.data.map(entry => 
          convertLeaderboardEntryToWhale(entry, selectedCategory as MarketCategory || "Crypto")
        );
        setAllWhales(whales);
      } else {
        // Fall back to mock data if API fails or returns no data
        console.log('Using mock data due to API response:', response);
        setAllWhales(mockWhales);
      }
    } catch (error) {
      console.error('Failed to load leaderboard data:', error);
      toast.error("Could not load leaderboard data. Using mock data.");
      setAllWhales(mockWhales);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const filteredWhales = useMemo(() => {
    if (selectedCategory === "All") return allWhales;
    return allWhales.filter(whale => whale.category === selectedCategory);
  }, [selectedCategory, allWhales]);

  const handleAddWhale = (whaleToAdd: Whale) => {
    setFollowedWhales(prev => {
      const newFollowed = { ...prev };
      const categoryList = newFollowed[whaleToAdd.category] || [];

      if (categoryList.find(w => w.id === whaleToAdd.id)) {
        return prev;
      }

      newFollowed[whaleToAdd.category] = [...categoryList, whaleToAdd];
      return newFollowed;
    });
  };
  
  const handleRemoveWhale = (whaleToRemove: Whale) => {
    setFollowedWhales(prev => {
      const newFollowed = { ...prev };
      const categoryList = newFollowed[whaleToRemove.category];

      if (!categoryList) return prev;

      const updatedList = categoryList.filter(w => w.id !== whaleToRemove.id);

      if (updatedList.length === 0) {
        delete newFollowed[whaleToRemove.category];
      } else {
        newFollowed[whaleToRemove.category] = updatedList;
      }

      return newFollowed;
    });
  };

  const formatCurrency = (val: number) => `${val.toLocaleString()}`;

  // Fetch backtest data for a whale (use API or fallback to local generation)
  const getBacktestData = async (whale: Whale): Promise<BacktestData | null> => {
    try {
      // Use the enhanced utility with API fallback
      const data = await fetchBacktestDataWithFallback({
        addresses: [whale.address],
        category: whale.category,
        startBalance: 10,
        positionPercentage: 0.02
      });
      
      return data[0] || null;
    } catch (error) {
      console.error('Failed to fetch backtest data:', error);
      // Final fallback to mock data
      const key = `${whale.address}-${whale.category}`;
      const mockResponse = mockBacktestData[key];
      return mockResponse?.data[0] || null;
    }
  };

  // Get cached backtest data synchronously for table display
  const getBacktestDataSync = (whale: Whale): BacktestData | null => {
    const key = `${whale.address}-${whale.category}`;
    const response = mockBacktestData[key];
    return response?.data[0] || null;
  };

  // Fetch fresh backtest data for modal
  const fetchModalBacktestData = async (whale: Whale) => {
    setLoadingBacktest(true);
    setModalBacktestData(null);
    
    try {
      // Use the enhanced utility with API fallback
      const data = await fetchBacktestDataWithFallback({
        addresses: [whale.address],
        category: whale.category,
        startBalance: 10,
        positionPercentage: 0.02
      });
      
      if (data && data.length > 0) {
        setModalBacktestData(data[0]);
      } else {
        // Final fallback to mock data
        const mockData = getBacktestDataSync(whale);
        setModalBacktestData(mockData);
      }
    } catch (error) {
      console.error('Failed to fetch backtest data for modal:', error);
      // Fallback to mock data on error
      const mockData = getBacktestDataSync(whale);
      setModalBacktestData(mockData);
    } finally {
      setLoadingBacktest(false);
    }
  };

  // Transform backtest points into chart data
  const transformToChartData = (points: number[]) => {
    return points.map((balance, index) => ({
      day: index,
      balance: balance
    }));
  };

  // Aggregate category backtest data
  const aggregateCategoryData = (data: BacktestData[]): CategoryBacktestData['aggregatedData'] => {
    if (data.length === 0) return undefined;

    const totalPnL = data.reduce((sum, item) => sum + item.finalPnL, 0);
    const averagePnL = totalPnL / data.length;
    const bestPerformer = data.reduce((best, current) => 
      current.finalPnL > best.finalPnL ? current : best
    );
    const worstPerformer = data.reduce((worst, current) => 
      current.finalPnL < worst.finalPnL ? current : worst
    );

    // Calculate combined points by averaging all data points
    const maxLength = Math.max(...data.map(item => item.points.length));
    const combinedPoints: number[] = [];
    
    for (let i = 0; i < maxLength; i++) {
      let sum = 0;
      let count = 0;
      data.forEach(item => {
        if (item.points[i] !== undefined) {
          sum += item.points[i];
          count++;
        }
      });
      combinedPoints.push(count > 0 ? sum / count : 10);
    }

    return {
      totalPnL,
      averagePnL,
      bestPerformer,
      worstPerformer,
      combinedPoints
    };
  };

  // Fetch category backtest data
  const getCategoryBacktestData = async (category: MarketCategory): Promise<CategoryBacktestData | null> => {
    setCategoryBacktestLoading(true);
    try {
      // Get all addresses from followed whales in this category
      const categoryWhales = followedWhales[category] || [];
      if (categoryWhales.length === 0) {
        toast.error(`No whales followed in ${category} category`);
        return null;
      }

      const addresses = categoryWhales.map(whale => whale.address);
      const response = await api.getCategoryBacktestData(addresses, category);
      
      if (response.data && response.data.length > 0) {
        const aggregatedData = aggregateCategoryData(response.data);
        return {
          category,
          data: response.data,
          aggregatedData
        };
      } else {
        // Fallback to mock data
        const mockResponse = mockCategoryBacktestData[category];
        if (mockResponse) {
          const aggregatedData = aggregateCategoryData(mockResponse.data);
          return {
            category,
            data: mockResponse.data,
            aggregatedData
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch category backtest data:', error);
      // Fallback to mock data without showing error toast
      const mockResponse = mockCategoryBacktestData[category];
      if (mockResponse) {
        const aggregatedData = aggregateCategoryData(mockResponse.data);
        return {
          category,
          data: mockResponse.data,
          aggregatedData
        };
      }
      return null;
    } finally {
      setCategoryBacktestLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white text-black p-4 sm:p-6 md:p-8 font-sans">
        <main className="w-full max-w-7xl mx-auto space-y-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3 text-black">
              Whale Tracker!
            </h1>
            <p className="text-gray-600 mt-2"></p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-white border-gray-300 shadow-lg">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-black">Discover Whales</CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        Top traders in: <span className="text-black font-semibold">{selectedCategory}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">{selectedCategory} <ChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setSelectedCategory("All")}>All</DropdownMenuItem>
                          {CATEGORIES.map(cat => (
                            <DropdownMenuItem key={cat} onSelect={() => setSelectedCategory(cat)}>{cat}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">{selectedTimeframe} <ChevronDown className="ml-2 h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {TIMEFRAMES.map(tf => (
                            <DropdownMenuItem key={tf} onSelect={() => setSelectedTimeframe(tf)}>{tf}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {leaderboardLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-gray-600">Loading leaderboard data...</div>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left p-4 text-black">Whale</th>
                            <th className="text-right p-4 text-black">Net Volume (30d)</th>
                            <th className="text-right p-4 text-black">Win Rate</th>
                            <th className="text-right p-4 text-black">P&L (30d)</th>
                            <th className="text-right p-4 text-black">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWhales.map((whale) => {
                          const backtestData = getBacktestDataSync(whale);
                          return (
                            <tr key={whale.id} className="border-b border-gray-300 hover:bg-gray-100">
                              <td className="p-4">
                                <a 
                                  href={`https://polymarket.com/${whale.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-black hover:underline cursor-pointer block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {whale.name}
                                </a>
                                <div className="text-sm text-gray-600 font-mono">{whale.address}</div>
                              </td>
                              <td className="text-right p-4 text-black">{formatCurrency(whale.netVolume)}</td>
                              <td className="text-right p-4 text-black">{whale.winRate}%</td>
                              <td className={`text-right p-4 ${whale.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(whale.pnl)}</td>
                              <td className="text-right p-4">
                                <div className="flex items-center gap-2 justify-end">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                      setBacktestWhale(whale);
                                      fetchModalBacktestData(whale);
                                    }}
                                    className="text-gray-700 hover:text-gray-600"
                                  >
                                    <History className="h-4 w-4"/>
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleAddWhale(whale)}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <Card className="bg-white border-gray-300 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-black">Your Masterlist</CardTitle>
                  <CardDescription className="text-gray-600 mt-1">Whales you are actively copy-trading, grouped by category.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(followedWhales).length > 0 ? (
                    Object.entries(followedWhales).map(([category, whales]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-600">{category}</h4>
                        </div>
                        <div className="space-y-2">
                          {whales.map(whale => (
                            <div key={whale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div>
                                <p className="font-semibold text-black">{whale.name}</p>
                                <p className="text-sm text-gray-600 font-mono">{whale.address}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-500" onClick={() => handleRemoveWhale(whale)}>
                                <X className="h-4 w-4"/>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600 text-center py-4">You are not following any whales yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Wallet Management Section */}
          <Card className="bg-white border-gray-300 shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Wallet Management</CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Control your copy-trading bot and manage funds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bot Controls */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-black">Bot Controls</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsActivityLogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Activity className="h-4 w-4" />
                      Activity Log
                    </Button>
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      className="flex-1 bg-green-700 hover:bg-green-600"
                      disabled={isLoading || botStatus === 'active'}
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          await api.startBot(userId);
                          setBotStatus('active');
                          toast.success('Bot has been started!');
                        } catch (error) {
                          toast.error('Failed to start the bot.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Start
                    </Button>
                    <Button 
                      className="flex-1 bg-red-700 hover:bg-red-600"
                      disabled={isLoading || botStatus === 'inactive'}
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          await api.stopBot(userId);
                          setBotStatus('inactive');
                          toast.success('Bot has been stopped!');
                        } catch (error) {
                          toast.error('Failed to stop the bot.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Stop
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Bot Status:</span>
                      <span className={`font-semibold capitalize ${botStatus === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {botStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fund Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-black">Fund Management</h3>
                   <div className="flex gap-4">
                    <Button 
                      className="flex-1 bg-blue-700 hover:bg-blue-600"
                      disabled={isLoading}
                      onClick={async () => {
                        const promise = () => api.getDepositAddress(userId);
                        toast.promise(promise, {
                            loading: 'Getting deposit address...',
                            success: (data) => {
                                navigator.clipboard.writeText(data.address);
                                return 'Address copied to clipboard!';
                            },
                            error: 'Could not get deposit address.',
                        });
                      }}
                    >
                      Push Money
                    </Button>
                    <Button 
                      className="flex-1 bg-purple-700 hover:bg-purple-600"
                      disabled={isLoading || walletBalance <= 0}
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const result = await api.withdrawFunds(userId);
                          if (result.success && result.txHash) {
                            toast.success('Withdrawal initiated!', {
                              description: `Tx: ${result.txHash.substring(0, 10)}...`,
                            });
                            await loadWalletData(); // Refresh balance after withdrawal
                          } else {
                            toast.error(result.message || 'Withdrawal failed.');
                          }
                        } catch (error) {
                          toast.error('An error occurred during withdrawal.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Pull Money
                    </Button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Available Balance:</span>
                      <span className="text-black font-mono font-semibold">${walletBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={!!backtestWhale} onOpenChange={() => setBacktestWhale(null)}>
        <DialogContent className="bg-white border-gray-300 text-black max-w-3xl">
          {backtestWhale && (() => {
            const backtestDataToUse = modalBacktestData || getBacktestDataSync(backtestWhale);
            const chartData = backtestDataToUse ? transformToChartData(backtestDataToUse.points) : [];
            const finalPnL = backtestDataToUse?.finalPnL || 0;
            const endBalance = backtestDataToUse?.endBalance || 10;
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Backtest Details: <span className="text-blue-400">{backtestWhale.name}</span></DialogTitle>
                  <DialogDescription className="text-gray-600 pt-2">
                    Simulated wallet performance following this whale's trades in <span className="font-semibold text-black">{backtestWhale.category}</span> using 2% position sizing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {loadingBacktest ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-600">Loading backtest data...</div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-md">
                          <span className="text-sm text-gray-600">Initial Principal</span>
                          <p className="text-2xl font-mono text-black mt-1">$10.00</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-md">
                          <span className="text-sm text-gray-600">Final Balance</span>
                          <p className={`text-2xl font-mono mt-1 ${finalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            ${endBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                        </div>
                      </div>

                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-600">Wallet Performance ({chartData.length - 1} Days)</span>
                      <span className={`font-mono font-bold ${finalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {finalPnL >= 0 ? '+' : ''}{formatCurrency(Math.round(finalPnL))}
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="day" 
                          stroke="#9CA3AF"
                          label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                        />
                        <YAxis 
                          stroke="#9CA3AF"
                          label={{ value: 'Balance ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px' }}
                          labelStyle={{ color: '#6b7280' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
                          labelFormatter={(label) => `Day ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="balance" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                      <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                        <span className="text-gray-600">Trade Strategy:</span>
                        <span className="font-mono text-black">2% of principal per trade</span>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Category Backtest Dialog */}
      <Dialog open={!!categoryBacktestData} onOpenChange={() => setCategoryBacktestData(null)}>
        <DialogContent className="bg-white border-gray-300 text-black max-w-4xl max-h-[90vh] overflow-y-auto">
          {categoryBacktestData && (() => {
            const { category, data, aggregatedData } = categoryBacktestData;
            const chartData = aggregatedData ? transformToChartData(aggregatedData.combinedPoints) : [];
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Category Backtest: <span className="text-blue-400">{category}</span></DialogTitle>
                  <DialogDescription className="text-gray-600 pt-2">
                    Aggregated performance of all followed whales in {category} category using 2% position sizing per whale.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Total Whales</span>
                      <p className="text-2xl font-mono text-black mt-1">{data.length}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Total P&L</span>
                      <p className={`text-2xl font-mono mt-1 ${aggregatedData && aggregatedData.totalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {aggregatedData ? (aggregatedData.totalPnL >= 0 ? '+' : '') + formatCurrency(Math.round(aggregatedData.totalPnL)) : '$0'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Average P&L</span>
                      <p className={`text-2xl font-mono mt-1 ${aggregatedData && aggregatedData.averagePnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {aggregatedData ? (aggregatedData.averagePnL >= 0 ? '+' : '') + formatCurrency(Math.round(aggregatedData.averagePnL)) : '$0'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-md">
                      <span className="text-sm text-gray-600">Best Performer</span>
                      <p className="text-lg font-mono text-green-700 mt-1">
                        {aggregatedData ? (aggregatedData.bestPerformer.finalPnL >= 0 ? '+' : '') + formatCurrency(Math.round(aggregatedData.bestPerformer.finalPnL)) : '$0'}
                      </p>
                    </div>
                  </div>

                  {/* Individual Whale Performance */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-black">Individual Whale Performance</h4>
                    <div className="grid gap-3">
                      {data.map((whale, index) => (
                        <div key={whale.address} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">#{index + 1}</span>
                            <div>
                              <p className="font-mono text-black">{whale.address}</p>
                              <p className="text-sm text-gray-600">Start: ${whale.startBalance} → End: ${whale.endBalance.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono font-bold ${whale.finalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {whale.finalPnL >= 0 ? '+' : ''}{formatCurrency(Math.round(whale.finalPnL))}
                            </p>
                            <p className="text-sm text-gray-600">Whale P&L: {formatCurrency(whale.whaleAbsolutePnL)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Combined Performance Chart */}
                  {aggregatedData && (
                    <div className="p-4 bg-gray-50 rounded-md">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Combined Portfolio Performance ({chartData.length - 1} Days)</span>
                        <span className={`font-mono font-bold ${aggregatedData.totalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {aggregatedData.totalPnL >= 0 ? '+' : ''}{formatCurrency(Math.round(aggregatedData.totalPnL))}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="day" 
                            stroke="#9CA3AF"
                            label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                          />
                          <YAxis 
                            stroke="#9CA3AF"
                            label={{ value: 'Combined Balance ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                            tickFormatter={(val) => `$${val}`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            labelStyle={{ color: '#6b7280' }}
                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Combined Balance']}
                            labelFormatter={(label) => `Day ${label}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                    <span className="text-gray-600">Strategy:</span>
                    <span className="font-mono text-black">2% of principal per whale per trade</span>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Trading Activity Log */}
      <TradingActivityLog 
        isOpen={isActivityLogOpen} 
        onClose={() => setIsActivityLogOpen(false)} 
      />
    </>
  );
}