#!/usr/bin/env python3
"""
Test script to verify the trading bot setup
Run this to test basic functionality before deployment
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

def test_imports():
    """Test that all modules can be imported"""
    try:
        from wallet_manager import WalletManager
        print("✓ WalletManager imported successfully")
        
        from web3_client import Web3Client
        print("✓ Web3Client imported successfully")
        
        from risk_manager import RiskManager
        print("✓ RiskManager imported successfully")
        
        from trading_logic import TradingEngine
        print("✓ TradingEngine imported successfully")
        
        from app import app
        print("✓ Flask app imported successfully")
        
        return True
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

def test_basic_functionality():
    """Test basic functionality without external dependencies"""
    try:
        # Test RiskManager (no external deps needed)
        from risk_manager import RiskManager
        risk_manager = RiskManager()
        print("✓ RiskManager initialized successfully")
        
        # Test basic risk assessment
        assessment = risk_manager.assess_trade(
            "0x1234567890123456789012345678901234567890",
            0.1
        )
        print(f"✓ Risk assessment completed: {assessment['approved']}")
        
        return True
    except Exception as e:
        print(f"✗ Basic functionality test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing Polymarket Trading Bot Setup...")
    print("=" * 50)
    
    # Test imports
    print("\n1. Testing imports...")
    imports_ok = test_imports()
    
    # Test basic functionality
    print("\n2. Testing basic functionality...")
    functionality_ok = test_basic_functionality()
    
    # Summary
    print("\n" + "=" * 50)
    if imports_ok and functionality_ok:
        print("✓ All tests passed! Trading bot setup is ready.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Configure environment variables in .env")
        print("3. Test locally: python src/main.py")
        print("4. Deploy to Eigencloud: eigenx app deploy")
    else:
        print("✗ Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
