#!/usr/bin/env python3
"""
Wallet Manager for TEE Environment
Handles secure wallet operations within the Trusted Execution Environment
"""

import os
import logging
from typing import Optional
from eth_account import Account
from eth_account.signers.local import LocalAccount
from eth_utils import to_checksum_address

logger = logging.getLogger(__name__)

class WalletManager:
    """Manages wallet operations securely within the TEE"""
    
    def __init__(self):
        """Initialize wallet manager with mnemonic from environment"""
        self.account: Optional[LocalAccount] = None
        self._initialize_wallet()
    
    def _initialize_wallet(self):
        """Initialize wallet from mnemonic stored in environment variables"""
        try:
            # Get mnemonic from environment (provided securely by Eigencloud)
            mnemonic = os.environ.get("MNEMONIC")
            
            if not mnemonic:
                raise ValueError("MNEMONIC environment variable is not set")
            
            # Enable HD wallet features
            Account.enable_unaudited_hdwallet_features()
            
            # Create account from mnemonic
            # Using standard Ethereum derivation path: m/44'/60'/0'/0/0
            self.account = Account.from_mnemonic(
                mnemonic, 
                account_path="m/44'/60'/0'/0/0"
            )
            
            logger.info(f"Wallet initialized successfully: {self.account.address}")
            
        except Exception as e:
            logger.error(f"Failed to initialize wallet: {e}")
            raise
    
    def get_address(self) -> str:
        """Get the wallet address"""
        if not self.account:
            raise RuntimeError("Wallet not initialized")
        
        return to_checksum_address(self.account.address)
    
    def get_private_key(self) -> str:
        """Get the private key (use with caution)"""
        if not self.account:
            raise RuntimeError("Wallet not initialized")
        
        return self.account.key.hex()
    
    def sign_transaction(self, transaction_dict: dict) -> dict:
        """Sign a transaction"""
        if not self.account:
            raise RuntimeError("Wallet not initialized")
        
        try:
            # Sign the transaction
            signed_txn = self.account.sign_transaction(transaction_dict)
            
            logger.info(f"Transaction signed successfully")
            return {
                'raw_transaction': signed_txn.rawTransaction.hex(),
                'transaction_hash': signed_txn.hash.hex(),
                'r': signed_txn.r,
                's': signed_txn.s,
                'v': signed_txn.v
            }
            
        except Exception as e:
            logger.error(f"Failed to sign transaction: {e}")
            raise
    
    def sign_message(self, message: str) -> dict:
        """Sign a message"""
        if not self.account:
            raise RuntimeError("Wallet not initialized")
        
        try:
            # Convert message to bytes if it's a string
            if isinstance(message, str):
                message_bytes = message.encode('utf-8')
            else:
                message_bytes = message
            
            # Sign the message
            signed_message = self.account.sign_message(message_bytes)
            
            return {
                'message': message,
                'signature': signed_message.signature.hex(),
                'message_hash': signed_message.messageHash.hex()
            }
            
        except Exception as e:
            logger.error(f"Failed to sign message: {e}")
            raise
    
    def verify_signature(self, message: str, signature: str, address: str) -> bool:
        """Verify a signature"""
        try:
            # Convert message to bytes if it's a string
            if isinstance(message, str):
                message_bytes = message.encode('utf-8')
            else:
                message_bytes = message
            
            # Recover the address from the signature
            recovered_address = Account.recover_message(message_bytes, signature=signature)
            
            # Check if the recovered address matches the expected address
            return to_checksum_address(recovered_address) == to_checksum_address(address)
            
        except Exception as e:
            logger.error(f"Failed to verify signature: {e}")
            return False
    
    def is_wallet_initialized(self) -> bool:
        """Check if wallet is properly initialized"""
        return self.account is not None
    
    def get_wallet_info(self) -> dict:
        """Get wallet information"""
        if not self.account:
            raise RuntimeError("Wallet not initialized")
        
        return {
            'address': self.get_address(),
            'is_initialized': self.is_wallet_initialized(),
            'derivation_path': "m/44'/60'/0'/0/0"
        }
