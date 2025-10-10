#!/usr/bin/env python3
"""
Main entry point for the Polymarket Trading Bot
This starts the Flask application on Eigencloud's TEE
"""

import os
import sys
from eth_account import Account
from dotenv import load_dotenv
import time
from web3 import Web3


def main():
    mnemonic = os.environ.get("MNEMONIC")
    
    if not mnemonic:
        print("MNEMONIC environment variable is not set", file=sys.stderr)
        sys.exit(1)
    
    try:
        Account.enable_unaudited_hdwallet_features()

        account = Account.from_mnemonic(mnemonic, account_path="m/44'/60'/0'/0/0")
        
        print(f"First wallet address: {account.address}")

        while True:
            time.sleep(10)
            account

    except Exception as e:
        print(f"Error generating wallet: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    load_dotenv()
    main()
