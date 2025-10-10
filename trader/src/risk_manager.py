#!/usr/bin/env python3
"""
Risk Manager for Trading Operations
Implements comprehensive risk management and trade validation
"""

import os
import logging
from typing import Dict, Any, List, Set
from datetime import datetime, timedelta
from collections import defaultdict
from eth_utils import to_checksum_address

logger = logging.getLogger(__name__)

class RiskManager:
    """Manages trading risk and validates trades"""
    
    def __init__(self):
        """Initialize risk manager with configuration"""
        # Risk limits
        self.max_trade_amount_eth = float(os.environ.get('MAX_TRADE_AMOUNT_ETH', '1.0'))
        self.max_daily_volume_eth = float(os.environ.get('MAX_DAILY_VOLUME_ETH', '10.0'))
        self.max_hourly_trades = int(os.environ.get('MAX_HOURLY_TRADES', '20'))
        self.max_daily_trades = int(os.environ.get('MAX_DAILY_TRADES', '100'))
        
        # Allowed contracts (Polymarket contracts)
        self.allowed_contracts = self._load_allowed_contracts()
        
        # Trading history tracking
        self.daily_volume = defaultdict(float)
        self.hourly_trade_count = defaultdict(int)
        self.daily_trade_count = defaultdict(int)
        self.trade_history = []
        
        logger.info(f"Risk Manager initialized with limits:")
        logger.info(f"  Max trade amount: {self.max_trade_amount_eth} ETH")
        logger.info(f"  Max daily volume: {self.max_daily_volume_eth} ETH")
        logger.info(f"  Max hourly trades: {self.max_hourly_trades}")
        logger.info(f"  Max daily trades: {self.max_daily_trades}")
        logger.info(f"  Allowed contracts: {len(self.allowed_contracts)}")
    
    def _load_allowed_contracts(self) -> Set[str]:
        """Load list of allowed contract addresses"""
        # Default Polymarket contract addresses (these should be updated with actual addresses)
        default_contracts = {
            # Polymarket USDC contract
            '0xa0b86a33e6c3e1c8b8b8b8b8b8b8b8b8b8b8b8b',
            # Add more Polymarket contracts as needed
        }
        
        # Load from environment variable if provided
        env_contracts = os.environ.get('ALLOWED_CONTRACTS', '')
        if env_contracts:
            try:
                contract_list = [addr.strip() for addr in env_contracts.split(',')]
                default_contracts.update(contract_list)
            except Exception as e:
                logger.warning(f"Failed to parse ALLOWED_CONTRACTS: {e}")
        
        # Convert to checksum addresses
        return {to_checksum_address(addr) for addr in default_contracts if addr}
    
    def assess_trade(self, to_address: str, value_eth: float, data: str = '0x') -> Dict[str, Any]:
        """Assess risk for a trade"""
        try:
            # Normalize address
            to_address = to_checksum_address(to_address)
            value_eth = float(value_eth)
            
            # Initialize assessment result
            assessment = {
                'approved': True,
                'reason': '',
                'risk_score': 0,
                'warnings': [],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Check 1: Trade amount limit
            if value_eth > self.max_trade_amount_eth:
                assessment['approved'] = False
                assessment['reason'] = f"Trade amount {value_eth} ETH exceeds limit {self.max_trade_amount_eth} ETH"
                assessment['risk_score'] += 50
                return assessment
            
            # Check 2: Contract whitelist
            if to_address not in self.allowed_contracts:
                assessment['approved'] = False
                assessment['reason'] = f"Contract {to_address} not in allowed contracts list"
                assessment['risk_score'] += 100
                return assessment
            
            # Check 3: Daily volume limit
            today = datetime.utcnow().date()
            current_daily_volume = self.daily_volume.get(today, 0)
            if current_daily_volume + value_eth > self.max_daily_volume_eth:
                assessment['approved'] = False
                assessment['reason'] = f"Daily volume would exceed limit: {current_daily_volume + value_eth} > {self.max_daily_volume_eth} ETH"
                assessment['risk_score'] += 40
                return assessment
            
            # Check 4: Hourly trade count limit
            current_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
            current_hourly_trades = self.hourly_trade_count.get(current_hour, 0)
            if current_hourly_trades >= self.max_hourly_trades:
                assessment['approved'] = False
                assessment['reason'] = f"Hourly trade count limit reached: {current_hourly_trades} >= {self.max_hourly_trades}"
                assessment['risk_score'] += 30
                return assessment
            
            # Check 5: Daily trade count limit
            current_daily_trades = self.daily_trade_count.get(today, 0)
            if current_daily_trades >= self.max_daily_trades:
                assessment['approved'] = False
                assessment['reason'] = f"Daily trade count limit reached: {current_daily_trades} >= {self.max_daily_trades}"
                assessment['risk_score'] += 25
                return assessment
            
            # Check 6: Data validation (basic)
            if data and data != '0x' and len(data) > 10000:  # Arbitrary large data limit
                assessment['warnings'].append("Large data payload detected")
                assessment['risk_score'] += 10
            
            # Check 7: Value validation
            if value_eth <= 0:
                assessment['approved'] = False
                assessment['reason'] = "Trade amount must be positive"
                assessment['risk_score'] += 100
                return assessment
            
            # Add warnings for high-value trades
            if value_eth > self.max_trade_amount_eth * 0.8:
                assessment['warnings'].append("High-value trade detected")
                assessment['risk_score'] += 5
            
            # Add warnings for approaching limits
            if current_daily_volume + value_eth > self.max_daily_volume_eth * 0.8:
                assessment['warnings'].append("Approaching daily volume limit")
                assessment['risk_score'] += 5
            
            if current_daily_trades + 1 > self.max_daily_trades * 0.8:
                assessment['warnings'].append("Approaching daily trade limit")
                assessment['risk_score'] += 5
            
            logger.info(f"Trade assessment completed: approved={assessment['approved']}, risk_score={assessment['risk_score']}")
            return assessment
            
        except Exception as e:
            logger.error(f"Error in trade assessment: {e}")
            return {
                'approved': False,
                'reason': f"Assessment error: {str(e)}",
                'risk_score': 100,
                'warnings': [],
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def record_trade(self, to_address: str, value_eth: float, tx_hash: str):
        """Record a completed trade"""
        try:
            to_address = to_checksum_address(to_address)
            value_eth = float(value_eth)
            
            now = datetime.utcnow()
            today = now.date()
            current_hour = now.replace(minute=0, second=0, microsecond=0)
            
            # Update counters
            self.daily_volume[today] += value_eth
            self.hourly_trade_count[current_hour] += 1
            self.daily_trade_count[today] += 1
            
            # Record trade history
            trade_record = {
                'timestamp': now.isoformat(),
                'to_address': to_address,
                'value_eth': value_eth,
                'tx_hash': tx_hash,
                'daily_volume': self.daily_volume[today],
                'daily_trade_count': self.daily_trade_count[today]
            }
            
            self.trade_history.append(trade_record)
            
            # Keep only last 1000 trades in memory
            if len(self.trade_history) > 1000:
                self.trade_history = self.trade_history[-1000:]
            
            logger.info(f"Trade recorded: {value_eth} ETH to {to_address}, tx: {tx_hash}")
            
        except Exception as e:
            logger.error(f"Error recording trade: {e}")
    
    def get_trading_stats(self) -> Dict[str, Any]:
        """Get current trading statistics"""
        now = datetime.utcnow()
        today = now.date()
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        
        return {
            'daily_volume_eth': self.daily_volume.get(today, 0),
            'daily_volume_limit_eth': self.max_daily_volume_eth,
            'daily_volume_remaining_eth': max(0, self.max_daily_volume_eth - self.daily_volume.get(today, 0)),
            'daily_trade_count': self.daily_trade_count.get(today, 0),
            'daily_trade_limit': self.max_daily_trades,
            'daily_trades_remaining': max(0, self.max_daily_trades - self.daily_trade_count.get(today, 0)),
            'hourly_trade_count': self.hourly_trade_count.get(current_hour, 0),
            'hourly_trade_limit': self.max_hourly_trades,
            'hourly_trades_remaining': max(0, self.max_hourly_trades - self.hourly_trade_count.get(current_hour, 0)),
            'total_trades_today': len([t for t in self.trade_history if datetime.fromisoformat(t['timestamp']).date() == today]),
            'last_trade': self.trade_history[-1] if self.trade_history else None
        }
    
    def add_allowed_contract(self, contract_address: str):
        """Add a contract to the allowed list"""
        try:
            contract_address = to_checksum_address(contract_address)
            self.allowed_contracts.add(contract_address)
            logger.info(f"Added allowed contract: {contract_address}")
        except Exception as e:
            logger.error(f"Error adding allowed contract: {e}")
            raise
    
    def remove_allowed_contract(self, contract_address: str):
        """Remove a contract from the allowed list"""
        try:
            contract_address = to_checksum_address(contract_address)
            self.allowed_contracts.discard(contract_address)
            logger.info(f"Removed allowed contract: {contract_address}")
        except Exception as e:
            logger.error(f"Error removing allowed contract: {e}")
            raise
    
    def update_limits(self, **kwargs):
        """Update risk limits"""
        try:
            if 'max_trade_amount_eth' in kwargs:
                self.max_trade_amount_eth = float(kwargs['max_trade_amount_eth'])
            if 'max_daily_volume_eth' in kwargs:
                self.max_daily_volume_eth = float(kwargs['max_daily_volume_eth'])
            if 'max_hourly_trades' in kwargs:
                self.max_hourly_trades = int(kwargs['max_hourly_trades'])
            if 'max_daily_trades' in kwargs:
                self.max_daily_trades = int(kwargs['max_daily_trades'])
            
            logger.info(f"Risk limits updated: {kwargs}")
        except Exception as e:
            logger.error(f"Error updating limits: {e}")
            raise
