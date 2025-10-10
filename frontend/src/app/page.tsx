"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, Bot, Plus, History, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from "sonner";
import { api } from './api';
import type { BacktestData } from './api';

// --- Types and Mock Data ---

type MarketCategory = "Politics" | "Sports" | "Crypto" | "Culture" | "Mentions" | "Weather" | "Economics" | "Tech";
type TimeFrame = "Daily" | "Weekly" | "Monthly";

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

// Mock backtest data
const mockBacktestData: Record<string, BacktestResponse> = {
  "0x12...aBcF-Crypto": {
    data: [{
      address: "0x12...aBcF",
      points: [1000, 1015, 1028, 1042, 1038, 1055, 1070, 1065, 1080, 1095, 1088, 1105, 1120, 1115, 1132, 1148, 1142, 1158, 1175, 1168, 1185, 1200, 1195, 1210, 1225, 1220, 1238, 1255, 1248, 1265, 1280],
      finalPnL: 280,
      startBalance: 1000,
      endBalance: 1280,
      whaleAbsolutePnL: 450000
    }]
  },
  "0x34...dEfG-Politics": {
    data: [{
      address: "0x34...dEfG",
      points: [1000, 1008, 1018, 1025, 1035, 1042, 1052, 1058, 1068, 1075, 1082, 1092, 1098, 1108, 1115, 1125, 1132, 1142, 1148, 1158, 1165, 1175, 1182, 1192, 1198, 1208, 1215, 1225, 1232, 1242, 1250],
      finalPnL: 250,
      startBalance: 1000,
      endBalance: 1250,
      whaleAbsolutePnL: 310000
    }]
  },
  "0x56...hIjK-Sports": {
    data: [{
      address: "0x56...hIjK",
      points: [1000, 1005, 1012, 1008, 1018, 1025, 1020, 1028, 1035, 1042, 1038, 1048, 1055, 1062, 1058, 1068, 1075, 1082, 1078, 1088, 1095, 1102, 1098, 1108, 1115, 1122, 1118, 1128, 1135, 1142, 1150],
      finalPnL: 150,
      startBalance: 1000,
      endBalance: 1150,
      whaleAbsolutePnL: 150000
    }]
  },
  "0x78...lMnO-Tech": {
    data: [{
      address: "0x78...lMnO",
      points: [1000, 1022, 1045, 1068, 1088, 1110, 1135, 1155, 1178, 1200, 1220, 1245, 1268, 1290, 1312, 1335, 1358, 1380, 1402, 1425, 1448, 1470, 1492, 1515, 1538, 1560, 1582, 1605, 1628, 1650, 1672],
      finalPnL: 672,
      startBalance: 1000,
      endBalance: 1672,
      whaleAbsolutePnL: 680000
    }]
  },
  "0x90...pQrS-Economics": {
    data: [{
      address: "0x90...pQrS",
      points: [1000, 1010, 1022, 1032, 1045, 1055, 1068, 1078, 1090, 1100, 1112, 1122, 1135, 1145, 1158, 1168, 1180, 1190, 1202, 1212, 1225, 1235, 1248, 1258, 1270, 1280, 1292, 1302, 1315, 1325, 1338],
      finalPnL: 338,
      startBalance: 1000,
      endBalance: 1338,
      whaleAbsolutePnL: 220000
    }]
  }
};

const allWhales: Whale[] = [
  { id: '1', name: "CryptoChad", address: "0x12...aBcF", category: "Crypto", netVolume: 12500000, winRate: 72, pnl: 450000 },
  { id: '2', name: "POTUS_Predictor", address: "0x34...dEfG", category: "Politics", netVolume: 9800000, winRate: 81, pnl: 310000 },
  { id: '3', name: "SportsOracle", address: "0x56...hIjK", category: "Sports", netVolume: 7600000, winRate: 65, pnl: 150000 },
  { id: '4', name: "TechFuture", address: "0x78...lMnO", category: "Tech", netVolume: 15200000, winRate: 78, pnl: 680000 },
  { id: '5', name: "EcoWhale", address: "0x90...pQrS", category: "Economics", netVolume: 11300000, winRate: 69, pnl: 220000 },
];

const CATEGORIES: MarketCategory[] = ["Politics", "Sports", "Crypto", "Culture", "Mentions", "Weather", "Economics", "Tech"];
const TIMEFRAMES: TimeFrame[] = ["Daily", "Weekly", "Monthly"];

export default function LeaderboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | "All">("All");
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>("Weekly");
  const [followedWhales, setFollowedWhales] = useState<Record<string, Whale[]>>({});
  const [backtestWhale, setBacktestWhale] = useState<Whale | null>(null);
  const [botStatus, setBotStatus] = useState<'active' | 'inactive'>('inactive');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // This should ideally come from an authentication context
  const userId = 'user123'; 

  // Load wallet balance and bot status on initial component mount
  useEffect(() => {
    loadWalletData();
    loadBotStatus();
  }, []);

  const loadWalletData = async () => {
    try {
      const data = await api.getWalletBalance(userId);
      setWalletBalance(data.balance);
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
      toast.error("Could not load wallet balance.");
      setWalletBalance(1000); 
    }
  };

  const loadBotStatus = async () => {
    try {
      const data = await api.getBotStatus(userId);
      setBotStatus(data.status);
    } catch (error) {
      console.error('Failed to load bot status:', error);
      toast.error("Could not load bot status.");
    }
  };

  const filteredWhales = useMemo(() => {
    if (selectedCategory === "All") return allWhales;
    return allWhales.filter(whale => whale.category === selectedCategory);
  }, [selectedCategory]);

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

  // Fetch backtest data for a whale (use API or fallback to mock)
  const getBacktestData = async (whale: Whale): Promise<BacktestData | null> => {
    try {
      const response = await api.getBacktestData([whale.address], whale.category);
      return response.data[0] || null;
    } catch (error) {
      console.error('Failed to fetch backtest data:', error);
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

  // Transform backtest points into chart data
  const transformToChartData = (points: number[]) => {
    return points.map((balance, index) => ({
      day: index,
      balance: balance
    }));
  };

  return (
    <>
      <div className="min-h-screen bg-gray-800 text-white p-4 sm:p-6 md:p-8 font-sans">
        <main className="w-full max-w-7xl mx-auto space-y-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3 text-white">
              Whale Tracker!
            </h1>
            <p className="text-gray-300 mt-2"></p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-white">Discover Whales</CardTitle>
                      <CardDescription className="text-gray-300 mt-1">
                        Top traders in: <span className="text-white font-semibold">{selectedCategory}</span>
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
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-4 text-white">Whale</th>
                          <th className="text-right p-4 text-white">Net Volume (30d)</th>
                          <th className="text-right p-4 text-white">Win Rate</th>
                          <th className="text-right p-4 text-white">P&L (30d)</th>
                          <th className="text-right p-4 text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWhales.map((whale) => {
                          const backtestData = getBacktestDataSync(whale);
                          return (
                            <tr key={whale.id} className="border-b border-gray-700 hover:bg-gray-900">
                              <td className="p-4">
                                <a 
                                  href={`https://polymarket.com/${whale.address}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-white hover:underline cursor-pointer block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {whale.name}
                                </a>
                                <div className="text-sm text-gray-300 font-mono">{whale.address}</div>
                              </td>
                              <td className="text-right p-4 text-white">{formatCurrency(whale.netVolume)}</td>
                              <td className="text-right p-4 text-white">{whale.winRate}%</td>
                              <td className="text-right p-4 text-green-400">{formatCurrency(whale.pnl)}</td>
                              <td className="text-right p-4">
                                <div className="flex items-center gap-2 justify-end">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setBacktestWhale(whale)}
                                    className={backtestData && backtestData.finalPnL >= 0 ? "text-green-700 hover:text-green-600" : "text-red-700 hover:text-red-600"}
                                  >
                                    <History className="h-4 w-4 mr-1"/> 
                                    {backtestData ? (backtestData.finalPnL >= 0 ? '+' : '') + formatCurrency(Math.round(backtestData.finalPnL)) : 'Backtest'}
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
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <Card className="bg-black border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Your Masterlist</CardTitle>
                  <CardDescription className="text-gray-300 mt-1">Whales you are actively copy-trading, grouped by category.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(followedWhales).length > 0 ? (
                    Object.entries(followedWhales).map(([category, whales]) => (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">{category}</h4>
                        <div className="space-y-2">
                          {whales.map(whale => (
                            <div key={whale.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-md">
                              <div>
                                <p className="font-semibold text-white">{whale.name}</p>
                                <p className="text-sm text-gray-400 font-mono">{whale.address}</p>
                              </div>
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500" onClick={() => handleRemoveWhale(whale)}>
                                <X className="h-4 w-4"/>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-300 text-center py-4">You are not following any whales yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Wallet Management Section */}
          <Card className="bg-black border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Wallet Management</CardTitle>
              <CardDescription className="text-gray-300 mt-1">
                Control your copy-trading bot and manage funds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Bot Controls */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Bot Controls</h3>
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
                  <div className="p-4 bg-gray-900 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Bot Status:</span>
                      <span className={`font-semibold capitalize ${botStatus === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {botStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fund Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Fund Management</h3>
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
                  <div className="p-4 bg-gray-900 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Available Balance:</span>
                      <span className="text-white font-mono font-semibold">${walletBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={!!backtestWhale} onOpenChange={() => setBacktestWhale(null)}>
        <DialogContent className="bg-black border-gray-700 text-white max-w-3xl">
          {backtestWhale && (() => {
            const backtestDataSync = getBacktestDataSync(backtestWhale);
            const chartData = backtestDataSync ? transformToChartData(backtestDataSync.points) : [];
            const finalPnL = backtestDataSync?.finalPnL || 0;
            const endBalance = backtestDataSync?.endBalance || 1000;
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Backtest Details: <span className="text-blue-400">{backtestWhale.name}</span></DialogTitle>
                  <DialogDescription className="text-gray-300 pt-2">
                    Simulated wallet performance following this whale's trades in <span className="font-semibold text-white">{backtestWhale.category}</span> using 2% position sizing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-900 rounded-md">
                      <span className="text-sm text-gray-400">Initial Principal</span>
                      <p className="text-2xl font-mono text-white mt-1">$1,000.00</p>
                    </div>
                    <div className="p-4 bg-gray-900 rounded-md">
                      <span className="text-sm text-gray-400">Final Balance</span>
                      <p className={`text-2xl font-mono mt-1 ${finalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ${endBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-900 rounded-md">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-300">Wallet Performance ({chartData.length - 1} Days)</span>
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
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '6px' }}
                          labelStyle={{ color: '#9CA3AF' }}
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

                  <div className="flex justify-between p-3 bg-gray-900 rounded-md">
                    <span className="text-gray-300">Trade Strategy:</span>
                    <span className="font-mono text-white">2% of principal per trade</span>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}