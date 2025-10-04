# DivScout API Documentation

RESTful API for accessing dividend data from SEC XBRL filings.

## Base URL

```
https://yourdomain.com/api
```

## Response Format

All responses are JSON with consistent structure:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "count": 10
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Rate Limiting

- **Client-side**: 30 requests per minute
- **Server-side**: Standard web hosting limits apply
- Returns 429 status code when exceeded

## Caching

Responses include cache headers:
- Statistics: 1 hour
- Company data: 1 hour  
- Recent dividends: 5 minutes

## Endpoints

### Health Check

Check if API is online and responding.

**Endpoint:** `GET /api/`

**Response:**
```json
{
  "status": "online",
  "service": "DivScout API",
  "version": "1.0.0",
  "timestamp": "2025-10-03T12:00:00Z"
}
```

---

### Database Statistics

Get overview statistics about the database.

**Endpoint:** `GET /api/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_companies": 3,
    "total_dividends": 146,
    "companies_with_dividends": 3
  }
}
```

---

### List All Companies

Get list of all companies in the database.

**Endpoint:** `GET /api/companies`

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "company_id": 1,
      "ticker": "AAPL",
      "company_name": "Apple Inc.",
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "is_active": true
    }
  ]
}
```

---

### Get Company Details

Get detailed information about a specific company.

**Endpoint:** `GET /api/companies/{ticker}`

**Parameters:**
- `ticker` (path): Company ticker symbol (case-insensitive)

**Example:** `GET /api/companies/AAPL`

**Response:**
```json
{
  "success": true,
  "data": {
    "company_id": 1,
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "cik": "0000320193",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "market_cap_category": "Large Cap",
    "is_active": true
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Company not found"
}
```

---

### Get Company Dividends

Get dividend history for a specific company.

**Endpoint:** `GET /api/companies/{ticker}/dividends`

**Parameters:**
- `ticker` (path): Company ticker symbol

**Example:** `GET /api/companies/JNJ/dividends`

**Response:**
```json
{
  "success": true,
  "ticker": "JNJ",
  "count": 52,
  "data": [
    {
      "dividend_id": 101,
      "declaration_date": "2024-07-15",
      "ex_dividend_date": "2024-08-26",
      "record_date": "2024-08-27",
      "payment_date": "2024-09-10",
      "amount": 1.24,
      "frequency": "quarterly",
      "dividend_type": "cash",
      "fiscal_year": 2024,
      "fiscal_quarter": "Q3",
      "confidence": 1.0
    }
  ]
}
```

**Notes:**
- Results ordered by ex_dividend_date descending (newest first)
- Only includes high-confidence dividends (>= 0.8)
- Excludes deleted/flagged entries

---

### Recent Dividends

Get recent dividend payments across all companies.

**Endpoint:** `GET /api/dividends/recent`

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 20, max: 100)

**Example:** `GET /api/dividends/recent?limit=10`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "ticker": "AAPL",
      "company_name": "Apple Inc.",
      "ex_dividend_date": "2024-08-12",
      "payment_date": "2024-08-15",
      "amount": 0.25,
      "frequency": "quarterly",
      "dividend_type": "cash"
    }
  ]
}
```

---

### Dividend Calendar

Get dividends within a specific date range.

**Endpoint:** `GET /api/dividends/calendar`

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format

**Example:** `GET /api/dividends/calendar?start_date=2024-10-01&end_date=2024-10-31`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "start_date": "2024-10-01",
  "end_date": "2024-10-31",
  "data": [
    {
      "ticker": "JNJ",
      "company_name": "Johnson & Johnson",
      "ex_dividend_date": "2024-10-15",
      "payment_date": "2024-10-28",
      "amount": 1.24,
      "frequency": "quarterly",
      "dividend_type": "cash"
    }
  ]
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "start_date and end_date parameters required"
}
```

---

## Data Quality Notes

### Confidence Scoring
- Only dividends with confidence >= 0.8 are returned
- Confidence score based on:
  - Amount reasonableness
  - Statistical analysis vs historical data
  - Period type (filters annual totals)
  - Data completeness

### Known Limitations
1. **Coverage**: Currently only 3 companies (AAPL, JNJ, TGT)
2. **Dates**: Some declaration/payment dates may be null
3. **Historical**: No forward-looking predictions
4. **Accuracy**: ~85-90% automated accuracy

### Data Sources
- SEC EDGAR XBRL filings
- Parsed using DivScout parser
- Manual review for low-confidence entries

---

## Error Handling

### HTTP Status Codes
- `200 OK`: Successful request
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Messages
All errors return consistent JSON structure with descriptive messages.

---

## Example Usage

### JavaScript (Fetch API)
```javascript
async function getCompanyDividends(ticker) {
  try {
    const response = await fetch(`/api/companies/${ticker}/dividends`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.count} dividends`);
      return data.data;
    } else {
      console.error(data.error);
    }
  } catch (error) {
    console.error('API request failed:', error);
  }
}
```

### Python
```python
import requests

def get_recent_dividends(limit=20):
    response = requests.get(
        'https://yourdomain.com/api/dividends/recent',
        params={'limit': limit}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            return data['data']
    
    return None
```

### cURL
```bash
# Get company details
curl https://yourdomain.com/api/companies/AAPL

# Get recent dividends
curl "https://yourdomain.com/api/dividends/recent?limit=10"

# Get calendar range
curl "https://yourdomain.com/api/dividends/calendar?start_date=2024-10-01&end_date=2024-10-31"
```

---

## Future Endpoints (Planned)

- `GET /api/companies/{ticker}/metrics` - Calculated financial metrics
- `GET /api/search?q={query}` - Search companies by name/ticker
- `GET /api/sectors` - List all sectors with counts
- `GET /api/export/{format}` - Export data as CSV/Excel

---

## Support

For API issues or feature requests, please open an issue on GitHub.