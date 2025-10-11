# 🚀 A3T Local Development Setup

This guide will help you run the A3T application locally on your machine.

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## 🏃‍♂️ Quick Start

### Option 1: Using the Startup Script (Recommended)

1. **Navigate to the project directory:**
   ```bash
   cd /Users/andrewchoy/Desktop/CS\ Projects/a3t
   ```

2. **Run the startup script:**
   ```bash
   ./run-local.sh
   ```

3. **Access the application:**
   - **Frontend:** http://localhost:3002
   - **Scraper Backend API:** http://localhost:3000

4. **Stop all services:**
   ```bash
   ./stop-local.sh
   ```

### Option 2: Manual Setup

#### 1. Start Scraper Backend

```bash
cd scraper-backend
npm install  # Only needed first time
npm start
```

The scraper backend will start on **http://localhost:3000**

#### 2. Start Frontend (in a new terminal)

```bash
cd frontend
npm install  # Only needed first time
npm run dev
```

The frontend will start on **http://localhost:3002**

## 🔧 Services Overview

### Scraper Backend (Port 3000)
- **Main API:** http://localhost:3000
- **Health Check:** http://localhost:3000/api/health
- **Leaderboard:** http://localhost:3000/api/leaderboard
- **Categories:** http://localhost:3000/api/categories
- **Backtest:** http://localhost:3000/api/backtest

### Frontend (Port 3002)
- **Main App:** http://localhost:3002
- **Features:** Whale leaderboard, portfolio backtesting, copy trading interface

## 🧪 Testing the Setup

### 1. Test Scraper Backend
```bash
curl http://localhost:3000/api/health
```
Should return: `{"success":true,"message":"Simple Polymarket API is running",...}`

### 2. Test Leaderboard API
```bash
curl "http://localhost:3000/api/leaderboard?category=overall&limit=3"
```
Should return leaderboard data with whale information.

### 3. Test Frontend
Open http://localhost:3002 in your browser. You should see:
- Whale Tracker interface
- Leaderboard table with real data (or mock data as fallback)
- Category and timeframe filters
- Copy trading controls

## 🛠️ Development Workflow

### Making Changes

1. **Frontend changes:** The Next.js dev server will auto-reload
2. **Backend changes:** Restart the scraper backend:
   ```bash
   cd scraper-backend
   npm start
   ```

### Environment Variables

The application uses these default configurations:
- **Scraper API:** http://localhost:3000
- **Main API:** http://localhost:8080 (for TEE integration)

You can override these by setting environment variables:
```bash
export NEXT_PUBLIC_SCRAPER_API_URL=http://localhost:3000
export NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## 🐛 Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

### Services Not Starting
1. **Check Node.js version:** `node --version` (should be v18+)
2. **Reinstall dependencies:**
   ```bash
   cd scraper-backend && rm -rf node_modules && npm install
   cd ../frontend && rm -rf node_modules && npm install
   ```

### API Connection Issues
1. **Check if services are running:**
   ```bash
   lsof -i :3000 -i :3002
   ```
2. **Test API endpoints manually:**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Frontend Shows Mock Data
This is normal! The frontend falls back to mock data if:
- The API is not responding
- The API returns no data
- There's a network error

Check the browser console for any error messages.

## 📁 Project Structure

```
a3t/
├── scraper-backend/          # API server with leaderboard data
│   ├── simple-api.js        # Main API server
│   ├── main.js              # Core functions
│   └── package.json         # Dependencies
├── frontend/                 # Next.js React application
│   ├── src/app/             # App router pages
│   ├── src/components/      # UI components
│   └── package.json         # Frontend dependencies
├── run-local.sh             # Startup script
├── stop-local.sh            # Stop script
└── LOCAL_SETUP.md           # This file
```

## 🎯 What You Can Do

1. **View Leaderboards:** Filter by category (Politics, Crypto, Sports, etc.)
2. **Time Periods:** Switch between Daily, Weekly, Monthly views
3. **Backtest Portfolios:** See simulated performance following whales
4. **Copy Trading:** Add whales to your masterlist (UI ready)
5. **Bot Controls:** Start/stop trading bot (UI ready)

## 🔗 Useful Commands

```bash
# Start everything
./run-local.sh

# Stop everything  
./stop-local.sh

# Check what's running
lsof -i :3000 -i :3002

# View logs (if running manually)
cd scraper-backend && npm start
cd frontend && npm run dev
```

## 📞 Need Help?

- Check the browser console for errors
- Verify both services are running on correct ports
- Test API endpoints manually with curl
- Restart services if needed

Happy coding! 🎉
