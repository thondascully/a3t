# Polymarket Scraper API

A comprehensive API for analyzing Polymarket prediction market data, including leaderboard queries and portfolio backtesting.

## Installation

```bash
npm install
```

## Running the API

```bash
# Start the server
npm start

# Development mode with auto-restart
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### 1. Health Check
**GET** `/api/health`

Returns the API status.

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Get Available Categories
**GET** `/api/categories`

Returns all available market categories.

**Response:**
```json
{
  "success": true,
  "data": ["overall", "politics", "sports", "crypto", "culture", "mentions", "weather", "economics"],
  "meta": {
    "total": 8
  }
}
```

### 3. Get Available Time Periods
**GET** `/api/time-periods`

Returns all available time periods for leaderboard queries.

**Response:**
```json
{
  "success": true,
  "data": ["day", "week", "month", "all"],
  "meta": {
    "total": 4
  }
}
```

### 4. Get Leaderboard Data
**GET** `/api/leaderboard`

Retrieves leaderboard data for a specific category and time period.

**Query Parameters:**
- `category` (string, optional): Market category (default: "overall")
- `timePeriod` (string, optional): Time period (default: "all")
- `limit` (number, optional): Number of results (default: 20, max: 100)
- `orderBy` (string, optional): Sort by "PNL" or "VOL" (default: "PNL")

**Example:**
```bash
curl "http://localhost:3000/api/leaderboard?category=politics&timePeriod=week&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": "1",
      "proxyWallet": "0x123...",
      "userName": "trader1",
      "vol": 50000,
      "pnl": 15000,
      "profileImage": "https://..."
    }
  ],
  "meta": {
    "category": "politics",
    "timePeriod": "week",
    "limit": 10,
    "orderBy": "PNL",
    "totalResults": 10,
    "source": "file"
  }
}
```

### 5. Run Portfolio Backtest
**POST** `/api/backtest`

Runs a backtest simulation on a portfolio of wallets across specified categories.

**Request Body:**
```json
{
  "wallets": ["0x123...", "0x456..."],
  "categories": ["politics", "sports"],
  "initialBalance": 1000,
  "positionPercentage": 0.02
}
```

**Parameters:**
- `wallets` (string[]): Array of wallet addresses to test
- `categories` (string[]): Array of categories to analyze
- `initialBalance` (number): Starting balance for the simulation
- `positionPercentage` (number): Percentage of balance to invest per position (0-1)

**Example:**
```bash
curl -X POST "http://localhost:3000/api/backtest" \
  -H "Content-Type: application/json" \
  -d '{
    "wallets": ["0x123...", "0x456..."],
    "categories": ["politics", "sports"],
    "initialBalance": 1000,
    "positionPercentage": 0.02
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "0x123...": {
      "politics": {
        "initialBalance": 1000,
        "finalBalance": 1200,
        "actualPnl": 150
      },
      "sports": {
        "initialBalance": 1000,
        "finalBalance": 950,
        "actualPnl": -25
      }
    }
  },
  "summary": {
    "totalWallets": 2,
    "totalCategories": 2,
    "initialBalance": 1000,
    "positionPercentage": 0.02
  }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- `400`: Bad Request (invalid parameters)
- `404`: Not Found (invalid endpoint)
- `500`: Internal Server Error

Error responses include:
```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Data Sources

The API uses two data sources:
1. **Cached files**: Pre-fetched leaderboard data stored as JSON files
2. **Live API**: Real-time data from Polymarket's API when cached data is unavailable

## Performance Notes

- Leaderboard data is cached in files for faster response times
- Backtest operations may take time for large portfolios
- API includes rate limiting and error handling for external requests

## Development

To run the data collection script:
```bash
node main.js
```

This will fetch and cache leaderboard data for all categories and time periods.
