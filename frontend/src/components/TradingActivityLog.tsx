'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wallet,
  Bot,
  RefreshCw
} from 'lucide-react';
import { sampleTradingActivities, sampleWalletInfo, type TradingActivity, type WalletInfo } from '../lib/hardcoded-data';

interface TradingActivityLogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TradingActivityLog({ isOpen, onClose }: TradingActivityLogProps) {
  const [activities, setActivities] = useState<TradingActivity[]>(sampleTradingActivities);
  const [walletInfo, setWalletInfo] = useState<WalletInfo>(sampleWalletInfo);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      // Simulate new trading activity
      const newActivity: TradingActivity = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'trade_executed',
        description: `Executed trade following Whale_${Math.floor(Math.random() * 5) + 1} in ${['Politics', 'Crypto', 'Sports'][Math.floor(Math.random() * 3)]} market`,
        amount: Math.floor(Math.random() * 100) + 10,
        market: ['Will Trump win 2024?', 'Bitcoin $100k by EOY?', 'Super Bowl Winner'][Math.floor(Math.random() * 3)],
        whale: `Whale_${Math.floor(Math.random() * 5) + 1}`,
        status: 'success'
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 19)]); // Keep last 20 activities
      
      // Update wallet balance slightly
      setWalletInfo(prev => ({
        ...prev,
        balance: prev.balance + (Math.random() - 0.5) * 50,
        lastActivity: new Date().toISOString()
      }));
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getActivityIcon = (type: TradingActivity['type']) => {
    switch (type) {
      case 'trade_executed':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'position_opened':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'position_closed':
        return <TrendingDown className="h-4 w-4 text-purple-600" />;
      case 'whale_monitored':
        return <Activity className="h-4 w-4 text-orange-600" />;
      case 'bot_started':
      case 'bot_stopped':
        return <Bot className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: TradingActivity['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-black">Trading Activity Log</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full">
            {/* Wallet Information */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Wallet Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Address</div>
                    <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                      {walletInfo.address}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Balance (USD)</div>
                      <div className="text-xl font-bold text-green-600">
                        ${walletInfo.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Balance (ETH)</div>
                      <div className="text-xl font-bold text-blue-600">
                        {walletInfo.balanceETH.toFixed(3)} ETH
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total P&L</div>
                      <div className={`text-lg font-semibold ${walletInfo.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${walletInfo.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Active Positions</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {walletInfo.activePositions}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">Total Volume</div>
                    <div className="text-lg font-semibold text-purple-600">
                      ${walletInfo.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">Last Activity</div>
                    <div className="text-sm text-gray-800">
                      {formatTime(walletInfo.lastActivity)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trading Activities */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Trading Activities
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2 p-4">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getActivityIcon(activity.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.description}
                              </p>
                              {getStatusIcon(activity.status)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span>{formatTime(activity.timestamp)}</span>
                              {activity.amount && (
                                <span className="font-medium">
                                  ${activity.amount}
                                </span>
                              )}
                              {activity.market && (
                                <span className="truncate max-w-[200px]">
                                  {activity.market}
                                </span>
                              )}
                              {activity.whale && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.whale}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
