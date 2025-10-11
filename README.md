# A3T - Automated Polymarket Copy-Trading Agent
https://youtu.be/khWixEAOrXU

> **Problem Statement**: Automated trading bots force users to expose their private keys on vulnerable cloud servers, creating a major security risk.

> **Solution**: Our platform uses an Eigencompute TEE as a secure vault to protect the user's private key while automatically executing copy-trades based on real-time whale alerts.

## 📝 Demo Data Note

This demo includes hardcoded example data in the activity logs and trading history to showcase what the system would display when market resolutions occur. Since no markets resolved during our development period, we populated the interface with realistic sample data to demonstrate the full user experience including trade executions, market resolutions, and profit/loss tracking.

## 🎯 Project Overview

A3T is an automated Polymarket copy-trading agent that makes passive income by following whale alerts, with the critical difference that the user's private key is always secured inside an unstoppable Eigencompute TEE.

### Key Features

- **🔐 TEE Security**: Private keys are never exposed outside the trusted execution environment
- **🐋 Whale Monitoring**: Real-time monitoring of successful Polymarket traders
- **📊 Copy Trading**: Automatic execution of trades based on whale activity
- **⚡ Risk Management**: Comprehensive risk controls and position sizing
- **📈 Backtesting**: Historical performance analysis for informed decision making
- **🎨 Modern UI**: Clean, intuitive interface for managing your trading bot

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Scraper API    │    │  Trading Engine │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • Whale UI      │    │ • Data Collection│    │ • TEE Security  │
│ • Bot Controls  │    │ • Backtesting   │    │ • Trade Execution│
│ • Portfolio Mgmt│    │ • Whale Analysis│    │ • Risk Management│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Polymarket    │    │   Data Storage  │    │  Eigencloud TEE │
│   API/UI        │    │   (JSON Files)  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Docker (for TEE deployment)
- ETH for deployment transactions

### Complete Application Startup

To run the entire application with all services (recommended for full demo):

1. **One-Command Startup**
   ```bash
   ./run-local-complete.sh
   ```
   
   This script will automatically:
   - Start the Python trading backend (port 8080)
   - Start the Node.js scraper API (port 3000) 
   - Start the Next.js frontend (port 3001)
   - Install dependencies if needed
   - Display service URLs and status

2. **Access the Application**
   - Frontend UI: http://localhost:3001
   - Trading API: http://localhost:8080
   - Scraper API: http://localhost:3000

3. **Stop All Services**
   ```bash
   ./stop-local.sh
   ```

> **Note**: The complete startup script (`run-local-complete.sh`) is the recommended way to run the full demo, as it starts all three services with proper dependency management.

### Development Setup

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd a3t
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Start Development Environment**
   ```bash
   ./start-dev.sh
   ```

3. **Access Services**
   - Frontend: http://localhost:3000
   - Scraper API: http://localhost:3000/api
   - Trading Engine: http://localhost:3001

4. **Stop Services**
   ```bash
   ./stop-dev.sh
   ```

## 📁 Project Structure

```
a3t/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Main app pages and API client
│   │   └── components/      # UI components
│   └── package.json
├── trader/                  # Python trading engine (TEE)
│   ├── src/
│   │   ├── app.py          # Flask API server
│   │   ├── trading_logic.py # Core trading engine
│   │   ├── whale_monitor.py # Whale monitoring service
│   │   ├── wallet_manager.py # Secure wallet management
│   │   ├── web3_client.py  # Blockchain interactions
│   │   ├── polymarket_client.py # Polymarket integration
│   │   └── risk_manager.py # Risk management
│   ├── requirements.txt
│   └── Dockerfile
├── scraper-backend/         # Node.js data collection
│   ├── main.js             # Polymarket API integration
│   ├── simple-api.js       # Backend API server
│   ├── package.json
│   └── *.json              # Cached whale data
├── tee-agent/              # TEE agent utilities
├── api/                    # Trade execution endpoints
├── start-dev.sh           # Development startup script
├── stop-dev.sh            # Development cleanup script
├── run-local-complete.sh  # Complete application startup script
├── stop-local.sh          # Complete application cleanup script
└── env.example            # Environment configuration template
```

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# TEE Trading Bot
MNEMONIC=your twelve word mnemonic phrase here
ETHEREUM_RPC_URL=https://eth.llamarpc.com

# Risk Management
MAX_TRADE_AMOUNT_ETH=1.0
MAX_DAILY_VOLUME_ETH=10.0

# API Endpoints
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_SCRAPER_API_URL=http://localhost:3000

# Whale Monitoring
WHALE_CHECK_INTERVAL=30000
DEFAULT_POSITION_PERCENTAGE=0.02
```

## 🐋 Whale Monitoring & Copy Trading

### How It Works

1. **Whale Discovery**: The scraper continuously monitors Polymarket leaderboards to identify successful traders
2. **Performance Analysis**: Historical backtesting shows which whales have consistent profitability
3. **Real-time Monitoring**: The TEE monitors selected whales for new trades
4. **Copy Trading**: When a whale makes a trade, the system automatically executes a proportional trade
5. **Risk Management**: All trades are subject to comprehensive risk controls

### Adding Whales

```bash
# Add a whale to monitor
curl -X POST http://localhost:3001/whales/add \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x123...",
    "name": "CryptoChad",
    "category": "crypto",
    "position_percentage": 0.02
  }'
```

### Starting Copy Trading

```bash
# Start whale monitoring
curl -X POST http://localhost:3001/whales/start-monitoring

# Check status
curl http://localhost:3001/whales/status
```

## 🛡️ Security Features

### TEE (Trusted Execution Environment)

- **Private Key Protection**: Keys never leave the secure TEE
- **Verifiable Operations**: All operations are cryptographically verifiable
- **Audit Trail**: Complete logging of all trading activities
- **Risk Controls**: Multi-layer risk management prevents unauthorized trades

### Risk Management

- **Trade Amount Limits**: Maximum per-trade amounts
- **Volume Limits**: Daily and hourly trading volume limits
- **Trade Count Limits**: Maximum number of trades per period
- **Contract Whitelisting**: Only approved contracts can receive funds
- **Balance Checks**: Automatic balance validation before trades

## 📊 API Endpoints

### Trading Engine (Port 3001)

#### Health & Status
- `GET /health` - Health check and system status
- `GET /wallet/address` - Get trading bot wallet address
- `GET /wallet/balance` - Get wallet ETH balance

#### Trading Operations
- `POST /trade/execute` - Execute a trading transaction
- `GET /trade/status/<tx_hash>` - Get transaction status
- `POST /risk/assess` - Assess risk for a potential trade

#### Polymarket Integration
- `GET /polymarket/balance` - Get Polymarket balances (USDC, ETH)
- `GET /polymarket/market/<market_id>` - Get market information
- `POST /polymarket/bet` - Place a bet on Polymarket

#### Whale Management
- `POST /whales/add` - Add a whale to monitor
- `POST /whales/remove` - Remove a whale from monitoring
- `POST /whales/start-monitoring` - Start copy trading
- `POST /whales/stop-monitoring` - Stop copy trading
- `GET /whales/status` - Get monitoring status

### Scraper API (Port 3000)

- `GET /api/health` - API health check
- `GET /api/categories` - Get available categories
- `POST /api/backtest` - Run portfolio backtest

## 🚀 Deployment

### TEE Deployment on Eigencloud

1. **Setup Eigencloud**
   ```bash
   # Install EigenX CLI
   npm install -g @layr-labs/eigenx-cli
   
   # Authenticate
   eigenx auth generate --store
   ```

2. **Configure Environment**
   ```bash
   cd trader
   cp ../env.example .env
   # Edit .env with your mnemonic and configuration
   ```

3. **Deploy to TEE**
   ```bash
   cd trader
   eigenx app deploy username/a3t-trading-bot
   ```

4. **Monitor Deployment**
   ```bash
   eigenx app list
   eigenx app logs username/a3t-trading-bot
   ```

### Production Deployment

1. **Frontend**: Deploy to Vercel/Netlify
2. **Scraper API**: Deploy to Railway/Heroku
3. **Trading Engine**: Deploy to Eigencloud TEE

## 🧪 Testing

### Local Testing

```bash
# Test trading engine
cd trader
python -m pytest tests/

# Test scraper API
cd scraper-backend
npm test

# Test frontend
cd frontend
npm test
```

### Integration Testing

```bash
# Test complete flow (recommended)
./run-local-complete.sh

# Or use development script
./start-dev.sh

# Add a test whale
curl -X POST http://localhost:8080/whales/add \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123...", "name": "TestWhale", "category": "crypto"}'

# Start monitoring
curl -X POST http://localhost:8080/whales/start-monitoring
```

## 📈 Performance & Monitoring

### Key Metrics

- **Whale Performance**: Track PnL of monitored whales
- **Copy Trading Success**: Monitor execution success rate
- **Risk Metrics**: Track risk limit utilization
- **System Health**: Monitor TEE status and API availability

### Monitoring Tools

- **Health Endpoints**: Regular health checks
- **Logging**: Comprehensive audit trail
- **Metrics**: Trading performance analytics
- **Alerts**: Risk limit and system alerts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues or questions:

1. Check the logs: `eigenx app logs`
2. Verify environment configuration
3. Test with `/health` endpoint
4. Review risk management settings

## 🔗 Links

- [Eigencloud Documentation](https://docs.eigencloud.com)
- [Polymarket API](https://docs.polymarket.com)
- [EigenX CLI](https://github.com/Layr-Labs/eigenx-cli)

---

**⚠️ Disclaimer**: This software is for educational purposes. Trading involves risk. Never invest more than you can afford to lose. The TEE provides security but doesn't guarantee profits.
