#!/usr/bin/env python3
"""
Trading Engine - Core Trading Logic
Orchestrates wallet, Web3, and risk management for trade execution
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from eth_utils import to_checksum_address
from polymarket_client import PolymarketClient
from whale_monitor import WhaleMonitor, WhaleConfig

logger = logging.getLogger(__name__)

class TradingEngine:
    """Core trading engine that orchestrates all trading operations"""
    
    def __init__(self, wallet_manager, web3_client, risk_manager):
        """Initialize trading engine with dependencies"""
        self.wallet_manager = wallet_manager
        self.web3_client = web3_client
        self.risk_manager = risk_manager
        
        # Initialize Polymarket client
        try:
            self.polymarket_client = PolymarketClient(web3_client, wallet_manager)
            logger.info("Polymarket client initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Polymarket client: {e}")
            self.polymarket_client = None
        
        # Initialize whale monitor
        try:
            self.whale_monitor = WhaleMonitor(self, web3_client)
            logger.info("Whale monitor initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize whale monitor: {e}")
            self.whale_monitor = None
        
        logger.info("Trading engine initialized")
    
    def execute_trade(self, to_address: str, value_eth: float, data: str = '0x') -> Dict[str, Any]:
        """Execute a trading transaction"""
        try:
            # Normalize inputs
            to_address = to_checksum_address(to_address)
            value_eth = float(value_eth)
            
            logger.info(f"Executing trade: {value_eth} ETH to {to_address}")
            
            # Pre-flight checks
            self._validate_trade_inputs(to_address, value_eth, data)
            
            # Risk assessment
            risk_assessment = self.risk_manager.assess_trade(to_address, value_eth, data)
            if not risk_assessment['approved']:
                raise ValueError(f"Trade rejected by risk manager: {risk_assessment['reason']}")
            
            # Check wallet balance
            balance_wei = self.web3_client.get_balance()
            required_wei = self.web3_client.eth_to_wei(value_eth)
            
            # Add estimated gas cost (rough estimate)
            estimated_gas_cost = 50000 * self.web3_client.get_gas_price()  # 50k gas estimate
            total_required_wei = required_wei + estimated_gas_cost
            
            if balance_wei < total_required_wei:
                raise ValueError(f"Insufficient balance: {self.web3_client.wei_to_eth(balance_wei)} ETH available, {self.web3_client.wei_to_eth(total_required_wei)} ETH required")
            
            # Prepare transaction
            transaction = {
                'to': to_address,
                'value': required_wei,
                'data': data,
                'gas': 50000  # Will be updated with actual estimate
            }
            
            # Estimate gas
            try:
                gas_estimate = self.web3_client.estimate_gas(transaction)
                transaction['gas'] = int(gas_estimate * 1.2)  # Add 20% buffer
                logger.info(f"Gas estimate: {gas_estimate}, using: {transaction['gas']}")
            except Exception as e:
                logger.warning(f"Gas estimation failed, using default: {e}")
                # Keep the default gas limit
            
            # Execute transaction
            result = self.web3_client.send_transaction(transaction)
            tx_hash = result['tx_hash']
            
            # Record trade in risk manager
            self.risk_manager.record_trade(to_address, value_eth, tx_hash)
            
            logger.info(f"Trade executed successfully: {tx_hash}")
            
            return {
                'tx_hash': tx_hash,
                'to_address': to_address,
                'value_eth': value_eth,
                'gas_used': transaction['gas'],
                'status': 'pending',
                'timestamp': datetime.utcnow().isoformat(),
                'risk_assessment': risk_assessment
            }
            
        except Exception as e:
            logger.error(f"Trade execution failed: {e}")
            raise
    
    def _validate_trade_inputs(self, to_address: str, value_eth: float, data: str):
        """Validate trade input parameters"""
        # Validate address
        if not to_address or len(to_address) != 42 or not to_address.startswith('0x'):
            raise ValueError("Invalid address format")
        
        # Validate value
        if value_eth <= 0:
            raise ValueError("Trade amount must be positive")
        
        if value_eth > 1000:  # Arbitrary upper limit
            raise ValueError("Trade amount too large")
        
        # Validate data (basic check)
        if data and (not data.startswith('0x') or len(data) % 2 != 0):
            raise ValueError("Invalid data format")
        
        logger.debug(f"Trade inputs validated: {to_address}, {value_eth} ETH")
    
    def get_trade_status(self, tx_hash: str) -> Dict[str, Any]:
        """Get the status of a trade transaction"""
        try:
            status = self.web3_client.get_transaction_status(tx_hash)
            logger.info(f"Trade status for {tx_hash}: {status['status']}")
            return status
            
        except Exception as e:
            logger.error(f"Failed to get trade status: {e}")
            raise
    
    def wait_for_trade_confirmation(self, tx_hash: str, timeout: int = 300) -> Dict[str, Any]:
        """Wait for trade confirmation"""
        try:
            logger.info(f"Waiting for trade confirmation: {tx_hash}")
            result = self.web3_client.wait_for_transaction(tx_hash, timeout)
            logger.info(f"Trade confirmed: {tx_hash}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to wait for trade confirmation: {e}")
            raise
    
    def get_trading_summary(self) -> Dict[str, Any]:
        """Get comprehensive trading summary"""
        try:
            # Get wallet info
            wallet_address = self.wallet_manager.get_address()
            balance = self.web3_client.get_balance()
            
            # Get risk manager stats
            trading_stats = self.risk_manager.get_trading_stats()
            
            # Get network info
            network_info = self.web3_client.get_network_info()
            
            return {
                'wallet': {
                    'address': wallet_address,
                    'balance_eth': self.web3_client.wei_to_eth(balance),
                    'balance_wei': str(balance)
                },
                'trading_stats': trading_stats,
                'network': network_info,
                'risk_limits': {
                    'max_trade_amount_eth': self.risk_manager.max_trade_amount_eth,
                    'max_daily_volume_eth': self.risk_manager.max_daily_volume_eth,
                    'max_hourly_trades': self.risk_manager.max_hourly_trades,
                    'max_daily_trades': self.risk_manager.max_daily_trades,
                    'allowed_contracts_count': len(self.risk_manager.allowed_contracts)
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get trading summary: {e}")
            raise
    
    def simulate_trade(self, to_address: str, value_eth: float, data: str = '0x') -> Dict[str, Any]:
        """Simulate a trade without executing it"""
        try:
            to_address = to_checksum_address(to_address)
            value_eth = float(value_eth)
            
            logger.info(f"Simulating trade: {value_eth} ETH to {to_address}")
            
            # Validate inputs
            self._validate_trade_inputs(to_address, value_eth, data)
            
            # Risk assessment
            risk_assessment = self.risk_manager.assess_trade(to_address, value_eth, data)
            
            # Check balance
            balance_wei = self.web3_client.get_balance()
            required_wei = self.web3_client.eth_to_wei(value_eth)
            
            # Estimate gas
            transaction = {
                'to': to_address,
                'value': required_wei,
                'data': data,
                'from': self.wallet_manager.get_address()
            }
            
            gas_estimate = None
            try:
                gas_estimate = self.web3_client.estimate_gas(transaction)
            except Exception as e:
                logger.warning(f"Gas estimation failed: {e}")
            
            # Calculate total cost
            gas_price = self.web3_client.get_gas_price()
            gas_cost = (gas_estimate or 50000) * gas_price
            total_cost_wei = required_wei + gas_cost
            
            return {
                'simulation': True,
                'approved': risk_assessment['approved'],
                'to_address': to_address,
                'value_eth': value_eth,
                'gas_estimate': gas_estimate,
                'gas_price_wei': gas_price,
                'gas_cost_eth': self.web3_client.wei_to_eth(gas_cost),
                'total_cost_eth': self.web3_client.wei_to_eth(total_cost_wei),
                'balance_sufficient': balance_wei >= total_cost_wei,
                'current_balance_eth': self.web3_client.wei_to_eth(balance_wei),
                'risk_assessment': risk_assessment,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Trade simulation failed: {e}")
            raise
    
    def execute_polymarket_bet(self, market_id: str, outcome: int, amount_usdc: float, price: float) -> Dict[str, Any]:
        """Execute a bet on Polymarket"""
        try:
            if not self.polymarket_client:
                raise ValueError("Polymarket client not available")
            
            logger.info(f"Executing Polymarket bet: {amount_usdc} USDC on outcome {outcome}")
            
            # Risk assessment for Polymarket bet
            # Convert to equivalent ETH value for risk assessment (rough approximation)
            risk_assessment = self.risk_manager.assess_trade(
                self.polymarket_client.CONDITIONAL_TOKENS_CONTRACT,
                amount_usdc / 2000  # Rough USDC to ETH conversion for risk assessment
            )
            
            if not risk_assessment['approved']:
                raise ValueError(f"Bet rejected by risk manager: {risk_assessment['reason']}")
            
            # Check USDC balance
            usdc_balance = self.polymarket_client.get_usdc_balance()
            required_usdc = int(amount_usdc * 1e6)  # Convert to USDC units
            
            if usdc_balance < required_usdc:
                raise ValueError(f"Insufficient USDC balance: {usdc_balance / 1e6} USDC available, {amount_usdc} USDC required")
            
            # Place the bet
            result = self.polymarket_client.place_bet(market_id, outcome, amount_usdc, price)
            
            # Record trade in risk manager (using ETH equivalent)
            self.risk_manager.record_trade(
                self.polymarket_client.CONDITIONAL_TOKENS_CONTRACT,
                amount_usdc / 2000,  # Convert to ETH equivalent
                result.get('tx_hash', 'pending')
            )
            
            return {
                'status': 'success',
                'market_id': market_id,
                'outcome': outcome,
                'amount_usdc': amount_usdc,
                'price': price,
                'result': result,
                'risk_assessment': risk_assessment,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Polymarket bet execution failed: {e}")
            raise
    
    def get_polymarket_balance(self) -> Dict[str, Any]:
        """Get Polymarket-related balances"""
        try:
            if not self.polymarket_client:
                return {'error': 'Polymarket client not available'}
            
            usdc_balance = self.polymarket_client.get_usdc_balance()
            
            return {
                'usdc_balance': usdc_balance,
                'usdc_balance_formatted': usdc_balance / 1e6,
                'eth_balance': self.web3_client.get_balance(),
                'eth_balance_formatted': self.web3_client.wei_to_eth(self.web3_client.get_balance()),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get Polymarket balance: {e}")
            raise
    
    def get_polymarket_market_info(self, market_id: str) -> Dict[str, Any]:
        """Get information about a Polymarket"""
        try:
            if not self.polymarket_client:
                return {'error': 'Polymarket client not available'}
            
            return self.polymarket_client.get_market_info(market_id)
            
        except Exception as e:
            logger.error(f"Failed to get market info: {e}")
            raise
    
    # Whale Management Methods
    
    def add_whale_to_monitor(self, address: str, name: str, category: str, position_percentage: float = 0.02):
        """Add a whale to monitor for copy trading"""
        try:
            if not self.whale_monitor:
                raise ValueError("Whale monitor not available")
            
            whale_config = WhaleConfig(
                address=address,
                name=name,
                category=category,
                position_percentage=position_percentage
            )
            
            self.whale_monitor.add_whale(whale_config)
            logger.info(f"Added whale to monitor: {name} ({address})")
            
            return {
                'success': True,
                'message': f'Added {name} to whale monitoring',
                'whale': {
                    'address': address,
                    'name': name,
                    'category': category,
                    'position_percentage': position_percentage
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to add whale to monitor: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def remove_whale_from_monitor(self, address: str):
        """Remove a whale from monitoring"""
        try:
            if not self.whale_monitor:
                raise ValueError("Whale monitor not available")
            
            self.whale_monitor.remove_whale(address)
            
            return {
                'success': True,
                'message': f'Removed whale {address} from monitoring'
            }
            
        except Exception as e:
            logger.error(f"Failed to remove whale from monitor: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def start_whale_monitoring(self):
        """Start whale monitoring for copy trading"""
        try:
            if not self.whale_monitor:
                raise ValueError("Whale monitor not available")
            
            self.whale_monitor.start_monitoring()
            
            return {
                'success': True,
                'message': 'Whale monitoring started'
            }
            
        except Exception as e:
            logger.error(f"Failed to start whale monitoring: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def stop_whale_monitoring(self):
        """Stop whale monitoring"""
        try:
            if not self.whale_monitor:
                raise ValueError("Whale monitor not available")
            
            self.whale_monitor.stop_monitoring()
            
            return {
                'success': True,
                'message': 'Whale monitoring stopped'
            }
            
        except Exception as e:
            logger.error(f"Failed to stop whale monitoring: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_whale_monitoring_status(self) -> Dict[str, Any]:
        """Get whale monitoring status"""
        try:
            if not self.whale_monitor:
                return {
                    'success': False,
                    'error': 'Whale monitor not available'
                }
            
            status = self.whale_monitor.get_monitoring_status()
            return {
                'success': True,
                'status': status
            }
            
        except Exception as e:
            logger.error(f"Failed to get whale monitoring status: {e}")
            return {
                'success': False,
                'error': str(e)
            }
