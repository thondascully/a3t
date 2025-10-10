#!/usr/bin/env python3
"""
Web3 Client for blockchain interactions
Handles all blockchain operations including transaction submission and monitoring
"""

import os
import logging
from typing import Dict, Any, Optional
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account
from eth_utils import to_checksum_address, to_hex

logger = logging.getLogger(__name__)

class Web3Client:
    """Web3 client for blockchain interactions"""
    
    def __init__(self, wallet_manager):
        """Initialize Web3 client with wallet manager"""
        self.wallet_manager = wallet_manager
        self.w3: Optional[Web3] = None
        self.network_name = "mainnet"
        self._initialize_web3()
    
    def _initialize_web3(self):
        """Initialize Web3 connection"""
        try:
            # Get RPC URL from environment
            rpc_url = os.environ.get('ETHEREUM_RPC_URL', 'https://eth.llamarpc.com')
            
            # Initialize Web3
            self.w3 = Web3(Web3.HTTPProvider(rpc_url))
            
            # Add PoA middleware if needed (for networks like Polygon)
            if 'polygon' in rpc_url.lower() or 'matic' in rpc_url.lower():
                self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                self.network_name = "polygon"
            elif 'arbitrum' in rpc_url.lower():
                self.network_name = "arbitrum"
            elif 'optimism' in rpc_url.lower():
                self.network_name = "optimism"
            
            # Test connection
            if not self.w3.is_connected():
                raise ConnectionError("Failed to connect to Ethereum node")
            
            logger.info(f"Web3 connected to {self.network_name} at {rpc_url}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Web3: {e}")
            raise
    
    def get_balance(self, address: Optional[str] = None) -> int:
        """Get ETH balance of an address"""
        if address is None:
            address = self.wallet_manager.get_address()
        
        try:
            address = to_checksum_address(address)
            balance = self.w3.eth.get_balance(address)
            logger.info(f"Balance for {address}: {self.wei_to_eth(balance)} ETH")
            return balance
            
        except Exception as e:
            logger.error(f"Failed to get balance for {address}: {e}")
            raise
    
    def wei_to_eth(self, wei_amount: int) -> float:
        """Convert Wei to ETH"""
        return self.w3.from_wei(wei_amount, 'ether')
    
    def eth_to_wei(self, eth_amount: float) -> int:
        """Convert ETH to Wei"""
        return self.w3.to_wei(eth_amount, 'ether')
    
    def get_gas_price(self) -> int:
        """Get current gas price"""
        try:
            gas_price = self.w3.eth.gas_price
            logger.info(f"Current gas price: {gas_price} wei")
            return gas_price
        except Exception as e:
            logger.error(f"Failed to get gas price: {e}")
            raise
    
    def estimate_gas(self, transaction: Dict[str, Any]) -> int:
        """Estimate gas for a transaction"""
        try:
            # Ensure 'from' field is set
            if 'from' not in transaction:
                transaction['from'] = self.wallet_manager.get_address()
            
            gas_estimate = self.w3.eth.estimate_gas(transaction)
            logger.info(f"Gas estimate: {gas_estimate}")
            return gas_estimate
            
        except Exception as e:
            logger.error(f"Failed to estimate gas: {e}")
            raise
    
    def send_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Send a signed transaction"""
        try:
            # Get nonce
            nonce = self.w3.eth.get_transaction_count(
                self.wallet_manager.get_address()
            )
            
            # Set transaction parameters
            transaction.update({
                'from': self.wallet_manager.get_address(),
                'nonce': nonce,
                'gasPrice': self.get_gas_price(),
                'chainId': self.w3.eth.chain_id
            })
            
            # Estimate gas if not provided
            if 'gas' not in transaction:
                transaction['gas'] = self.estimate_gas(transaction)
            
            # Sign transaction
            signed_txn = self.wallet_manager.sign_transaction(transaction)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(
                signed_txn['raw_transaction']
            )
            
            tx_hash_hex = tx_hash.hex()
            logger.info(f"Transaction sent: {tx_hash_hex}")
            
            return {
                'tx_hash': tx_hash_hex,
                'transaction': transaction
            }
            
        except Exception as e:
            logger.error(f"Failed to send transaction: {e}")
            raise
    
    def get_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        """Get transaction status and details"""
        try:
            # Get transaction receipt
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            
            # Get transaction details
            transaction = self.w3.eth.get_transaction(tx_hash)
            
            # Determine status
            status = 'confirmed' if receipt['status'] == 1 else 'failed'
            
            return {
                'status': status,
                'block_number': receipt['blockNumber'],
                'gas_used': receipt['gasUsed'],
                'transaction_hash': tx_hash,
                'from': transaction['from'],
                'to': transaction['to'],
                'value': transaction['value']
            }
            
        except Exception as e:
            if "not found" in str(e).lower():
                return {
                    'status': 'pending',
                    'transaction_hash': tx_hash
                }
            else:
                logger.error(f"Failed to get transaction status: {e}")
                raise
    
    def wait_for_transaction(self, tx_hash: str, timeout: int = 300) -> Dict[str, Any]:
        """Wait for transaction to be mined"""
        try:
            receipt = self.w3.eth.wait_for_transaction_receipt(
                tx_hash, 
                timeout=timeout
            )
            
            status = 'confirmed' if receipt['status'] == 1 else 'failed'
            
            return {
                'status': status,
                'block_number': receipt['blockNumber'],
                'gas_used': receipt['gasUsed'],
                'transaction_hash': tx_hash
            }
            
        except Exception as e:
            logger.error(f"Failed to wait for transaction: {e}")
            raise
    
    def get_latest_block_number(self) -> int:
        """Get the latest block number"""
        try:
            return self.w3.eth.block_number
        except Exception as e:
            logger.error(f"Failed to get latest block number: {e}")
            raise
    
    def is_connected(self) -> bool:
        """Check if Web3 is connected"""
        try:
            return self.w3.is_connected()
        except:
            return False
    
    def get_network_info(self) -> Dict[str, Any]:
        """Get network information"""
        try:
            return {
                'network_name': self.network_name,
                'chain_id': self.w3.eth.chain_id,
                'latest_block': self.get_latest_block_number(),
                'gas_price': self.get_gas_price(),
                'is_connected': self.is_connected()
            }
        except Exception as e:
            logger.error(f"Failed to get network info: {e}")
            raise
