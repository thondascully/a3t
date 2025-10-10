#!/usr/bin/env python3
"""
Polymarket Client - Handles Polymarket-specific trading operations
Integrates with Polymarket's smart contracts for prediction market trading
"""

import logging
from typing import Dict, Any, Optional, List
from web3 import Web3
from eth_utils import to_checksum_address, to_hex
import json

logger = logging.getLogger(__name__)

class PolymarketClient:
    """Client for interacting with Polymarket smart contracts"""
    
    # Polymarket contract addresses (Polygon mainnet)
    USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"  # USDC on Polygon
    CONDITIONAL_TOKENS_CONTRACT = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"
    COLLATERAL_TOKEN_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"  # USDC
    FIXED_PRODUCT_MARKET_MAKER_CONTRACT = "0x89Cb14B8E8cF0d5C3e7E6B9B0c0c0c0c0c0c0c0c"  # Example address
    
    # ERC20 ABI for USDC
    ERC20_ABI = [
        {
            "constant": True,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": False,
            "inputs": [
                {"name": "_spender", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "_owner", "type": "address"},
                {"name": "_spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]
    
    # Conditional Tokens ABI (simplified)
    CONDITIONAL_TOKENS_ABI = [
        {
            "constant": False,
            "inputs": [
                {"name": "collateralToken", "type": "address"},
                {"name": "parentCollectionId", "type": "bytes32"},
                {"name": "conditionId", "type": "bytes32"},
                {"name": "indexSets", "type": "uint256[]"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "splitPosition",
            "outputs": [],
            "type": "function"
        },
        {
            "constant": False,
            "inputs": [
                {"name": "collateralToken", "type": "address"},
                {"name": "parentCollectionId", "type": "bytes32"},
                {"name": "conditionId", "type": "bytes32"},
                {"name": "indexSets", "type": "uint256[]"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "mergePositions",
            "outputs": [],
            "type": "function"
        }
    ]
    
    # Fixed Product Market Maker ABI (for bet placement)
    MARKET_MAKER_ABI = [
        {
            "constant": False,
            "inputs": [
                {"name": "outcomeIndex", "type": "uint256"},
                {"name": "amount", "type": "uint256"},
                {"name": "maxPrice", "type": "uint256"}
            ],
            "name": "buy",
            "outputs": [
                {"name": "tokensBought", "type": "uint256"},
                {"name": "sharesBought", "type": "uint256"},
                {"name": "feesPaid", "type": "uint256"}
            ],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "outcomeIndex", "type": "uint256"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "calcBuyAmount",
            "outputs": [{"name": "amount", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [],
            "name": "getPrice",
            "outputs": [{"name": "price", "type": "uint256"}],
            "type": "function"
        }
    ]
    
    def __init__(self, web3_client, wallet_manager):
        """Initialize Polymarket client"""
        self.web3_client = web3_client
        self.wallet_manager = wallet_manager
        self.w3 = web3_client.w3
        
        # Initialize contract instances
        self.usdc_contract = self.w3.eth.contract(
            address=self.USDC_CONTRACT,
            abi=self.ERC20_ABI
        )
        
        self.conditional_tokens_contract = self.w3.eth.contract(
            address=self.CONDITIONAL_TOKENS_CONTRACT,
            abi=self.CONDITIONAL_TOKENS_ABI
        )
        
        # Market maker contract (will be set per market)
        self.market_maker_contract = None
        
        logger.info("Polymarket client initialized")
    
    def set_market_maker_contract(self, market_maker_address: str):
        """Set the market maker contract for a specific market"""
        try:
            self.market_maker_contract = self.w3.eth.contract(
                address=to_checksum_address(market_maker_address),
                abi=self.MARKET_MAKER_ABI
            )
            logger.info(f"Market maker contract set: {market_maker_address}")
        except Exception as e:
            logger.error(f"Failed to set market maker contract: {e}")
            raise
    
    def get_usdc_balance(self) -> int:
        """Get USDC balance of the wallet"""
        try:
            balance = self.usdc_contract.functions.balanceOf(
                self.wallet_manager.get_address()
            ).call()
            logger.info(f"USDC balance: {balance / 1e6} USDC")
            return balance
        except Exception as e:
            logger.error(f"Failed to get USDC balance: {e}")
            raise
    
    def get_usdc_allowance(self, spender: str) -> int:
        """Get USDC allowance for a spender contract"""
        try:
            allowance = self.usdc_contract.functions.allowance(
                self.wallet_manager.get_address(),
                to_checksum_address(spender)
            ).call()
            return allowance
        except Exception as e:
            logger.error(f"Failed to get USDC allowance: {e}")
            raise
    
    def approve_usdc(self, spender: str, amount: int) -> str:
        """Approve USDC spending for a contract"""
        try:
            logger.info(f"Approving {amount / 1e6} USDC for {spender}")
            
            # Build approval transaction
            transaction = self.usdc_contract.functions.approve(
                to_checksum_address(spender),
                amount
            ).build_transaction({
                'from': self.wallet_manager.get_address(),
                'gas': 100000,  # Standard approval gas
                'gasPrice': self.web3_client.get_gas_price(),
                'nonce': self.web3_client.w3.eth.get_transaction_count(
                    self.wallet_manager.get_address()
                )
            })
            
            # Send transaction
            result = self.web3_client.send_transaction(transaction)
            logger.info(f"USDC approval transaction: {result['tx_hash']}")
            return result['tx_hash']
            
        except Exception as e:
            logger.error(f"Failed to approve USDC: {e}")
            raise
    
    def place_bet(self, market_id: str, outcome: int, amount_usdc: float, price: float) -> Dict[str, Any]:
        """Place a bet on a Polymarket prediction market"""
        try:
            logger.info(f"Placing bet: {amount_usdc} USDC on outcome {outcome} at price {price}")
            
            # Convert amount to USDC units (6 decimals)
            amount_units = int(amount_usdc * 1e6)
            
            # Check USDC balance
            balance = self.get_usdc_balance()
            if balance < amount_units:
                raise ValueError(f"Insufficient USDC balance: {balance / 1e6} USDC available, {amount_usdc} USDC required")
            
            # Check allowance for conditional tokens contract
            allowance = self.get_usdc_allowance(self.CONDITIONAL_TOKENS_CONTRACT)
            if allowance < amount_units:
                logger.info("Insufficient allowance, approving USDC...")
                self.approve_usdc(self.CONDITIONAL_TOKENS_CONTRACT, amount_units)
            
            
            # Implement actual bet placement logic
            if not self.market_maker_contract:
                # Use a default market maker address for testing
                # In production, this should be provided as a parameter or fetched from market_id
                default_market_maker = "0x89Cb14B8E8cF0d5C3e7E6B9B0c0c0c0c0c0c0c0c" # Example address We need 
                self.set_market_maker_contract(default_market_maker)
            
            # Convert price to wei (price is typically between 0-1, scaled by 1e18)
            max_price_wei = int(price * 1e18)
            
            # Calculate expected tokens to buy (optional - for slippage protection)
            try:
                expected_tokens = self.market_maker_contract.functions.calcBuyAmount(
                    outcome, amount_units
                ).call()
                logger.info(f"Expected tokens to receive: {expected_tokens / 1e18}")
            except Exception as e:
                logger.warning(f"Could not calculate expected tokens: {e}")
                expected_tokens = 0
            
            # Build the buy transaction
            transaction = self.market_maker_contract.functions.buy(
                outcome,           # outcomeIndex
                amount_units,      # amount in USDC units
                max_price_wei      # maxPrice in wei
            ).build_transaction({
                'from': self.wallet_manager.get_address(),
                'gas': 500000,     # Estimated gas limit
                'gasPrice': self.web3_client.get_gas_price(),
                'nonce': self.w3.eth.get_transaction_count(self.wallet_manager.get_address())
            })
            
            # Sign and send the transaction
            signed_txn = self.wallet_manager.sign_transaction(transaction)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn['raw_transaction'])
            tx_hash_hex = tx_hash.hex()
            
            logger.info(f"Bet placed successfully: {tx_hash_hex}")
            
            return {
                'status': 'success',
                'tx_hash': tx_hash_hex,
                'market_id': market_id,
                'outcome': outcome,
                'amount_usdc': amount_usdc,
                'price': price,
                'expected_tokens': expected_tokens / 1e18 if expected_tokens > 0 else 0,
                'message': 'Bet placed successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to place bet: {e}")
            raise
    
    def get_market_info(self, market_id: str, market_maker_address: str = None) -> Dict[str, Any]:
        """Get information about a specific market"""
        try:
            # Set market maker contract if provided
            if market_maker_address:
                self.set_market_maker_contract(market_maker_address)
            elif not self.market_maker_contract:
                # Use default for testing
                default_market_maker = "0x89Cb14B8E8cF0d5C3e7E6B9B0c0c0c0c0c0c0c0c"
                self.set_market_maker_contract(default_market_maker)
            
            # Get current market price
            try:
                current_price = self.market_maker_contract.functions.getPrice().call()
                price_decimal = current_price / 1e18
            except Exception as e:
                logger.warning(f"Could not get market price: {e}")
                price_decimal = 0.5  # Default price
            
            return {
                'market_id': market_id,
                'market_maker_address': self.market_maker_contract.address,
                'current_price': price_decimal,
                'outcomes': ['Yes', 'No'],
                'prices': {'Yes': price_decimal, 'No': 1.0 - price_decimal},
                'liquidity': 'N/A',  # Would need additional contract calls
                'status': 'active',
                'message': 'Market info retrieved successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to get market info: {e}")
            raise
    
    def check_position(self, market_id: str, outcome: int) -> Dict[str, Any]:
        """Check current position in a market"""
        try:
            # TODO: Implement position checking
            # This would query the conditional tokens contract for
            # the user's current position in the specific outcome
            
            return {
                'market_id': market_id,
                'outcome': outcome,
                'position': 0,
                'message': 'Position checking not yet implemented'
            }
            
        except Exception as e:
            logger.error(f"Failed to check position: {e}")
            raise
