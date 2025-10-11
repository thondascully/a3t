# A3T Deployment Guide

## 🚀 Production Deployment

### Prerequisites

1. **Eigencloud Account**: Sign up at [Eigencloud](https://eigencloud.com)
2. **ETH for Deployment**: You'll need ETH for deployment transactions
3. **Domain (Optional)**: For TLS termination
4. **Polymarket Account**: For trading operations

### Step 1: Environment Setup

1. **Copy Environment Template**
   ```bash
   cp env.example .env
   ```

2. **Configure Environment Variables**
   ```bash
   # Required: Wallet mnemonic (provided securely by Eigencloud)
   MNEMONIC=your twelve word mnemonic phrase here
   
   # Required: Ethereum RPC URL
   ETHEREUM_RPC_URL=https://eth.llamarpc.com
   
   # Risk Management (adjust based on your risk tolerance)
   MAX_TRADE_AMOUNT_ETH=1.0
   MAX_DAILY_VOLUME_ETH=10.0
   MAX_HOURLY_TRADES=20
   MAX_DAILY_TRADES=100
   
   # Allowed contracts (Polymarket addresses)
   ALLOWED_CONTRACTS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174,0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
   ```

### Step 2: Deploy Trading Engine to TEE

1. **Install EigenX CLI**
   ```bash
   npm install -g @layr-labs/eigenx-cli
   ```

2. **Authenticate with Eigencloud**
   ```bash
   # Generate new key (recommended for production)
   eigenx auth generate --store
   
   # OR use existing key
   eigenx auth login
   ```

3. **Deploy Trading Engine**
   ```bash
   cd trader
   eigenx app deploy username/a3t-trading-bot
   ```

4. **Monitor Deployment**
   ```bash
   # Check deployment status
   eigenx app list
   
   # View logs
   eigenx app logs username/a3t-trading-bot
   
   # Get app info (including IP address)
   eigenx app info username/a3t-trading-bot
   ```

### Step 3: Deploy Scraper Backend

1. **Deploy to Railway/Heroku**
   ```bash
   # Railway deployment
   railway login
   railway init
   railway up
   
   # OR Heroku deployment
   heroku create a3t-scraper-api
   git push heroku main
   ```

2. **Set Environment Variables**
   ```bash
   # Railway
   railway variables set PORT=3000
   railway variables set NODE_ENV=production
   
   # OR Heroku
   heroku config:set PORT=3000
   heroku config:set NODE_ENV=production
   ```

### Step 4: Deploy Frontend

1. **Deploy to Vercel**
   ```bash
   cd frontend
   npm install -g vercel
   vercel --prod
   ```

2. **Configure Environment Variables in Vercel**
   ```bash
   # Set production API URLs
   NEXT_PUBLIC_API_BASE_URL=https://your-tee-app.eigencloud.com
   NEXT_PUBLIC_SCRAPER_API_URL=https://your-scraper-api.railway.app
   ```

### Step 5: Configure TLS (Optional)

1. **Configure TLS on TEE**
   ```bash
   eigenx app configure tls
   ```

2. **Set Domain Configuration**
   ```bash
   # Add to .env
   DOMAIN=your-domain.com
   ACME_STAGING=false  # Set to true for testing
   ENABLE_CADDY_LOGS=true
   ```

3. **Update DNS**
   ```bash
   # Point your domain to the TEE IP address
   # A record: your-domain.com -> <TEE_IP_ADDRESS>
   ```

### Step 6: Test Deployment

1. **Health Check**
   ```bash
   # Test TEE health
   curl https://your-domain.com/health
   
   # Test scraper API
   curl https://your-scraper-api.railway.app/api/health
   ```

2. **Test Trading Engine**
   ```bash
   # Get wallet address
   curl https://your-domain.com/wallet/address
   
   # Get wallet balance
   curl https://your-domain.com/wallet/balance
   ```

3. **Test Whale Management**
   ```bash
   # Add a test whale
   curl -X POST https://your-domain.com/whales/add \
     -H "Content-Type: application/json" \
     -d '{
       "address": "0x123...",
       "name": "TestWhale",
       "category": "crypto"
     }'
   
   # Start monitoring
   curl -X POST https://your-domain.com/whales/start-monitoring
   ```

## 🔧 Post-Deployment Configuration

### 1. Fund Your Trading Wallet

1. **Get Deposit Address**
   ```bash
   curl https://your-domain.com/wallet/address
   ```

2. **Send ETH and USDC**
   - Send ETH for gas fees
   - Send USDC for trading on Polymarket
   - Recommended: 0.1 ETH + $100 USDC to start

### 2. Configure Whale Monitoring

1. **Add Successful Whales**
   - Use the frontend interface to browse whales
   - Add whales with good historical performance
   - Start with 1-2% position sizing

2. **Start Copy Trading**
   ```bash
   curl -X POST https://your-domain.com/whales/start-monitoring
   ```

### 3. Monitor Performance

1. **Check Trading Status**
   ```bash
   curl https://your-domain.com/whales/status
   ```

2. **Review Risk Metrics**
   ```bash
   curl https://your-domain.com/config
   ```

## 🛠️ Maintenance

### Regular Tasks

1. **Monitor Logs**
   ```bash
   eigenx app logs username/a3t-trading-bot
   ```

2. **Check System Health**
   ```bash
   curl https://your-domain.com/health
   ```

3. **Review Trading Performance**
   - Check wallet balance regularly
   - Monitor whale performance
   - Adjust position sizes as needed

### Updates

1. **Update Trading Engine**
   ```bash
   cd trader
   # Make your changes
   eigenx app upgrade username/a3t-trading-bot
   ```

2. **Update Scraper Backend**
   ```bash
   # Railway
   railway up
   
   # OR Heroku
   git push heroku main
   ```

3. **Update Frontend**
   ```bash
   cd frontend
   vercel --prod
   ```

## 🔒 Security Considerations

### TEE Security

- ✅ Private keys never leave the TEE
- ✅ All operations are verifiable
- ✅ Complete audit trail
- ✅ Risk controls prevent unauthorized trades

### Best Practices

1. **Regular Monitoring**
   - Check logs daily
   - Monitor wallet balances
   - Review trading activity

2. **Risk Management**
   - Start with small position sizes
   - Monitor daily volume limits
   - Review whale performance regularly

3. **Backup & Recovery**
   - Keep mnemonic phrase secure
   - Document configuration
   - Plan for disaster recovery

## 🆘 Troubleshooting

### Common Issues

1. **TEE Not Starting**
   ```bash
   # Check logs
   eigenx app logs username/a3t-trading-bot
   
   # Restart app
   eigenx app restart username/a3t-trading-bot
   ```

2. **API Connection Issues**
   ```bash
   # Test connectivity
   curl https://your-domain.com/health
   
   # Check firewall settings
   # Ensure ports are open
   ```

3. **Trading Not Executing**
   ```bash
   # Check wallet balance
   curl https://your-domain.com/wallet/balance
   
   # Check risk limits
   curl https://your-domain.com/config
   
   # Verify whale monitoring is active
   curl https://your-domain.com/whales/status
   ```

### Support

- Check logs first: `eigenx app logs`
- Verify environment configuration
- Test with health endpoints
- Review risk management settings

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Trading Performance**
   - PnL over time
   - Success rate
   - Average trade size

2. **System Health**
   - API response times
   - Error rates
   - Uptime

3. **Risk Metrics**
   - Daily volume usage
   - Trade count limits
   - Balance utilization

### Recommended Tools

- **Grafana**: For metrics visualization
- **Prometheus**: For metrics collection
- **Slack/Discord**: For alerts
- **Custom Dashboard**: Built into frontend

---

**⚠️ Important**: Always test with small amounts first. Trading involves risk. The TEE provides security but doesn't guarantee profits.
