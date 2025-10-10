#!/usr/bin/env python3
"""
Polymarket Trading Bot - TEE Secure Trading Agent
A Flask-based trading bot running on Eigencloud's Trusted Execution Environment
"""

import os
import sys
import logging
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import json
from datetime import datetime

# Import our custom modules
from wallet_manager import WalletManager
from trading_logic import TradingEngine
from web3_client import Web3Client
from risk_manager import RiskManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Global instances (initialized in main)
wallet_manager: Optional[WalletManager] = None
trading_engine: Optional[TradingEngine] = None
web3_client: Optional[Web3Client] = None
risk_manager: Optional[RiskManager] = None

def initialize_services():
    """Initialize all trading services"""
    global wallet_manager, trading_engine, web3_client, risk_manager
    
    try:
        # Initialize wallet manager
        wallet_manager = WalletManager()
        logger.info(f"Wallet initialized: {wallet_manager.get_address()}")
        
        # Initialize risk manager
        # risk_manager = RiskManager()
        # logger.info("Risk manager initialized")
        
        # Initialize Web3 client (with error handling)
        try:
            web3_client = Web3Client(wallet_manager)
            logger.info("Web3 client initialized")
        except Exception as e:
            logger.warning(f"Web3 client initialization failed: {e}")
            logger.warning("App will start but trading functionality will be limited")
            web3_client = None
        
        # Initialize trading engine (only if Web3 client is available)
        if web3_client:
            trading_engine = TradingEngine(wallet_manager, web3_client, risk_manager)
            logger.info("Trading engine initialized")
        else:
            trading_engine = None
            logger.warning("Trading engine not initialized due to Web3 client failure")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        # Don't raise the exception - let the app start with limited functionality
        logger.error("App will start with limited functionality")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'wallet_address': wallet_manager.get_address() if wallet_manager else None,
        'web3_connected': web3_client.is_connected() if web3_client else False,
        'trading_engine_ready': trading_engine is not None
    })

@app.route('/wallet/address', methods=['GET'])
def get_wallet_address():
    """Get the trading bot's wallet address"""
    try:
        address = wallet_manager.get_address()
        return jsonify({
            'address': address,
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Error getting wallet address: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/wallet/balance', methods=['GET'])
def get_wallet_balance():
    """Get the wallet's ETH balance"""
    try:
        if not web3_client:
            return jsonify({
                'error': 'Web3 client not available',
                'status': 'error'
            }), 503
        
        balance = web3_client.get_balance()
        return jsonify({
            'balance_wei': str(balance),
            'balance_eth': web3_client.wei_to_eth(balance),
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Error getting wallet balance: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/trade/execute', methods=['POST'])
def execute_trade():
    """Execute a trading transaction"""
    try:
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        trade_data = request.get_json()
        
        # Validate required fields
        required_fields = ['to', 'value']
        for field in required_fields:
            if field not in trade_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Extract trade parameters
        to_address = trade_data['to']
        value_eth = trade_data['value']
        data = trade_data.get('data', '0x')
        
        # Risk assessment
        risk_assessment = risk_manager.assess_trade(to_address, value_eth, data)
        if not risk_assessment['approved']:
            return jsonify({
                'error': 'Trade rejected by risk manager',
                'reason': risk_assessment['reason']
            }), 400
        
        # Execute trade
        result = trading_engine.execute_trade(to_address, value_eth, data)
        
        return jsonify({
            'transaction_hash': result['tx_hash'],
            'status': 'success',
            'gas_used': result.get('gas_used'),
            'risk_assessment': risk_assessment
        })
        
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/trade/status/<tx_hash>', methods=['GET'])
def get_transaction_status(tx_hash: str):
    """Get the status of a transaction"""
    try:
        status = web3_client.get_transaction_status(tx_hash)
        return jsonify({
            'transaction_hash': tx_hash,
            'status': status,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting transaction status: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/risk/assess', methods=['POST'])
def assess_trade_risk():
    """Assess risk for a potential trade"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        trade_data = request.get_json()
        
        # Extract trade parameters
        to_address = trade_data.get('to')
        value_eth = trade_data.get('value')
        data = trade_data.get('data', '0x')
        
        if not to_address or value_eth is None:
            return jsonify({'error': 'Missing required fields: to, value'}), 400
        
        # Assess risk
        risk_assessment = risk_manager.assess_trade(to_address, value_eth, data)
        
        return jsonify({
            'risk_assessment': risk_assessment,
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error assessing trade risk: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/config', methods=['GET'])
def get_config():
    """Get current trading configuration"""
    try:
        config = {
            'max_trade_amount_eth': risk_manager.max_trade_amount_eth,
            'max_daily_volume_eth': risk_manager.max_daily_volume_eth,
            'allowed_contracts': list(risk_manager.allowed_contracts),
            'wallet_address': wallet_manager.get_address(),
            'network': web3_client.network_name if web3_client else 'unknown',
            'polymarket_enabled': trading_engine.polymarket_client is not None
        }
        return jsonify({
            'config': config,
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

# Polymarket-specific endpoints
@app.route('/polymarket/balance', methods=['GET'])
def get_polymarket_balance():
    """Get Polymarket-related balances (USDC, ETH)"""
    try:
        if not trading_engine:
            return jsonify({
                'error': 'Trading engine not available',
                'status': 'error'
            }), 503
        
        balance_info = trading_engine.get_polymarket_balance()
        return jsonify({
            'balance': balance_info,
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Error getting Polymarket balance: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/polymarket/market/<market_id>', methods=['GET'])
def get_polymarket_market_info(market_id: str):
    """Get information about a specific Polymarket"""
    try:
        if not trading_engine:
            return jsonify({
                'error': 'Trading engine not available',
                'status': 'error'
            }), 503
        
        market_info = trading_engine.get_polymarket_market_info(market_id)
        return jsonify({
            'market_info': market_info,
            'status': 'success'
        })
    except Exception as e:
        logger.error(f"Error getting market info: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/polymarket/bet', methods=['POST'])
def place_polymarket_bet():
    """Place a bet on Polymarket"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        if not trading_engine:
            return jsonify({
                'error': 'Trading engine not available',
                'status': 'error'
            }), 503
        
        bet_data = request.get_json()
        
        # Validate required fields
        required_fields = ['market_id', 'outcome', 'amount_usdc', 'price']
        for field in required_fields:
            if field not in bet_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Extract bet parameters
        market_id = bet_data['market_id']
        outcome = int(bet_data['outcome'])
        amount_usdc = float(bet_data['amount_usdc'])
        price = float(bet_data['price'])
        
        # Validate inputs
        if amount_usdc <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
        
        if not 0 <= price <= 1:
            return jsonify({'error': 'Price must be between 0 and 1'}), 400
        
        if outcome not in [0, 1]:
            return jsonify({'error': 'Outcome must be 0 or 1'}), 400
        
        # Place the bet
        result = trading_engine.execute_polymarket_bet(market_id, outcome, amount_usdc, price)
        
        return jsonify({
            'bet_result': result,
            'status': 'success'
        })
        
    except ValueError as e:
        logger.warning(f"Invalid bet request: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 400
    except Exception as e:
        logger.error(f"Error placing bet: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def main():
    """Main application entry point"""
    try:
        # # Initialize services
        initialize_services()
        # Get port from environment or use default
        # port = int(os.environ.get('PORT', 8080))
        
        # Start the Flask app
        # logger.info(f"Starting Polymarket Trading Bot on port {port}")
        # app.run(host='0.0.0.0', port=port, debug=False)

        # walletManager = WalletManager()
        # web3Client = Web3Client(walletManager)
        # account = walletManager.get_address()
        # print(f"Wallet Address: {account}")
        # balance = web3Client.get_balance(account)
        # print(f"Wallet Balance: {balance}")
        

    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
