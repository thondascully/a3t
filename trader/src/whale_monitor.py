#!/usr/bin/env python3
"""
Whale Monitoring Service
Monitors selected whale wallets for new trades and triggers copy-trading
"""

import os
import time
import logging
import asyncio
import aiohttp
from typing import Dict, List, Set, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from collections import defaultdict

logger = logging.getLogger(__name__)

@dataclass
class WhaleTrade:
    """Represents a whale trade that should be copied"""
    whale_address: str
    market_id: str
    outcome: int
    amount_usdc: float
    price: float
    timestamp: datetime
    trade_hash: str

@dataclass
class WhaleConfig:
    """Configuration for a whale to monitor"""
    address: str
    name: str
    category: str
    position_percentage: float = 0.02  # 2% of balance per trade
    max_daily_trades: int = 10
    enabled: bool = True

class WhaleMonitor:
    """Monitors whale wallets for new trades"""
    
    def __init__(self, trading_engine, web3_client):
        self.trading_engine = trading_engine
        self.web3_client = web3_client
        self.monitored_whales: Dict[str, WhaleConfig] = {}
        self.recent_trades: Dict[str, Set[str]] = defaultdict(set)  # whale -> trade_hashes
        self.running = False
        
        # Configuration
        self.check_interval = int(os.environ.get('WHALE_CHECK_INTERVAL', 30000)) / 1000  # Convert to seconds
        self.trade_execution_delay = int(os.environ.get('TRADE_EXECUTION_DELAY', 5000)) / 1000
        self.max_position_percentage = float(os.environ.get('MAX_POSITION_PERCENTAGE', 0.05))
        
        # Polymarket API endpoints
        self.polymarket_data_api = "https://data-api.polymarket.com"
        self.polymarket_gamma_api = "https://gamma-api.polymarket.com"
        
        logger.info(f"Whale monitor initialized with {self.check_interval}s check interval")
    
    def add_whale(self, whale_config: WhaleConfig):
        """Add a whale to monitor"""
        self.monitored_whales[whale_config.address] = whale_config
        logger.info(f"Added whale to monitor: {whale_config.name} ({whale_config.address})")
    
    def remove_whale(self, whale_address: str):
        """Remove a whale from monitoring"""
        if whale_address in self.monitored_whales:
            del self.monitored_whales[whale_address]
            logger.info(f"Removed whale from monitoring: {whale_address}")
    
    def update_whale_config(self, whale_address: str, **kwargs):
        """Update whale configuration"""
        if whale_address in self.monitored_whales:
            whale = self.monitored_whales[whale_address]
            for key, value in kwargs.items():
                if hasattr(whale, key):
                    setattr(whale, key, value)
            logger.info(f"Updated whale config for {whale_address}: {kwargs}")
    
    async def fetch_recent_trades(self, whale_address: str, limit: int = 10) -> List[Dict]:
        """Fetch recent trades for a specific whale"""
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    'user': whale_address,
                    'limit': limit,
                    'sortBy': 'timestamp',
                    'sortDirection': 'DESC'
                }
                
                url = f"{self.polymarket_data_api}/closed-positions"
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data if isinstance(data, list) else data.get('data', [])
                    else:
                        logger.warning(f"Failed to fetch trades for {whale_address}: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error fetching trades for {whale_address}: {e}")
            return []
    
    def parse_trade_data(self, trade_data: Dict, whale_address: str) -> Optional[WhaleTrade]:
        """Parse trade data into WhaleTrade object"""
        try:
            # Extract relevant information from trade data
            market_id = trade_data.get('slug', '')
            outcome = 1 if trade_data.get('outcome', '').lower() in ['yes', 'true', '1'] else 0
            amount_usdc = float(trade_data.get('amount', 0))
            price = float(trade_data.get('avgPrice', 0))
            timestamp_str = trade_data.get('timestamp', '')
            trade_hash = trade_data.get('txHash', '')
            
            # Parse timestamp
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except:
                    timestamp = datetime.utcnow()
            else:
                timestamp = datetime.utcnow()
            
            # Only process recent trades (last 5 minutes)
            if datetime.utcnow() - timestamp > timedelta(minutes=5):
                return None
            
            return WhaleTrade(
                whale_address=whale_address,
                market_id=market_id,
                outcome=outcome,
                amount_usdc=amount_usdc,
                price=price,
                timestamp=timestamp,
                trade_hash=trade_hash
            )
            
        except Exception as e:
            logger.error(f"Error parsing trade data: {e}")
            return None
    
    async def check_whale_trades(self, whale_address: str) -> List[WhaleTrade]:
        """Check for new trades from a specific whale"""
        whale_config = self.monitored_whales.get(whale_address)
        if not whale_config or not whale_config.enabled:
            return []
        
        # Fetch recent trades
        recent_trades_data = await self.fetch_recent_trades(whale_address, limit=5)
        new_trades = []
        
        for trade_data in recent_trades_data:
            trade = self.parse_trade_data(trade_data, whale_address)
            if trade and trade.trade_hash not in self.recent_trades[whale_address]:
                new_trades.append(trade)
                self.recent_trades[whale_address].add(trade.trade_hash)
        
        return new_trades
    
    async def execute_copy_trade(self, whale_trade: WhaleTrade, whale_config: WhaleConfig):
        """Execute a copy trade based on whale's trade"""
        try:
            logger.info(f"Executing copy trade for {whale_config.name}: {whale_trade.amount_usdc} USDC on {whale_trade.market_id}")
            
            # Calculate position size based on our balance and whale's percentage
            balance_info = self.trading_engine.get_polymarket_balance()
            available_usdc = balance_info.get('usdc_balance_formatted', 0)
            
            # Calculate our position size
            position_percentage = min(whale_config.position_percentage, self.max_position_percentage)
            our_amount_usdc = available_usdc * position_percentage
            
            if our_amount_usdc < 1:  # Minimum $1 USDC
                logger.warning(f"Insufficient balance for copy trade: {available_usdc} USDC")
                return
            
            # Execute the copy trade
            result = self.trading_engine.execute_polymarket_bet(
                market_id=whale_trade.market_id,
                outcome=whale_trade.outcome,
                amount_usdc=our_amount_usdc,
                price=whale_trade.price
            )
            
            logger.info(f"Copy trade executed successfully: {result.get('tx_hash', 'unknown')}")
            
        except Exception as e:
            logger.error(f"Failed to execute copy trade: {e}")
    
    async def monitor_whales(self):
        """Main monitoring loop"""
        logger.info("Starting whale monitoring...")
        
        while self.running:
            try:
                # Check each monitored whale
                for whale_address, whale_config in self.monitored_whales.items():
                    if not whale_config.enabled:
                        continue
                    
                    try:
                        # Get new trades
                        new_trades = await self.check_whale_trades(whale_address)
                        
                        # Execute copy trades for new trades
                        for trade in new_trades:
                            logger.info(f"New trade detected from {whale_config.name}: {trade.market_id}")
                            
                            # Add delay to avoid immediate copying (could be seen as front-running)
                            await asyncio.sleep(self.trade_execution_delay)
                            
                            # Execute copy trade
                            await self.execute_copy_trade(trade, whale_config)
                    
                    except Exception as e:
                        logger.error(f"Error monitoring whale {whale_address}: {e}")
                
                # Wait before next check
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Error in whale monitoring loop: {e}")
                await asyncio.sleep(5)  # Short delay before retrying
    
    def start_monitoring(self):
        """Start the whale monitoring service"""
        if not self.running:
            self.running = True
            asyncio.create_task(self.monitor_whales())
            logger.info("Whale monitoring started")
    
    def stop_monitoring(self):
        """Stop the whale monitoring service"""
        self.running = False
        logger.info("Whale monitoring stopped")
    
    def get_monitoring_status(self) -> Dict:
        """Get current monitoring status"""
        return {
            'running': self.running,
            'monitored_whales': len(self.monitored_whales),
            'check_interval': self.check_interval,
            'enabled_whales': [
                {
                    'address': whale.address,
                    'name': whale.name,
                    'category': whale.category,
                    'position_percentage': whale.position_percentage,
                    'enabled': whale.enabled
                }
                for whale in self.monitored_whales.values()
            ]
        }
