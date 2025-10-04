# DivScout Web Interface

A clean, responsive web interface for viewing SEC dividend data parsed from XBRL filings.

## Overview

DivScout displays dividend data for US publicly traded companies with high confidence scores (>= 0.8). The data is sourced from SEC XBRL filings and filtered to remove annual totals and low-confidence entries.

**Current Coverage**: AAPL, JNJ, TGT (146 verified dividend records)

## Features

- **Dashboard**: Overview statistics and recent dividend payments
- **Companies**: Browse all companies with sector/industry filtering
- **Calendar**: View upcoming dividend payments by date range
- **Company Details**: Detailed dividend history per company

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (no framework dependencies)
- **Backend**: Flask API with pg8000 PostgreSQL driver
- **Database**: PostgreSQL on DigitalOcean
- **Hosting**: Namecheap Stellar hosting with Python 3.13

## Project Structure

```
public_html/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # All styles
├── js/
│   └── app.js            # Frontend JavaScript
└── api/
    ├── app.py            # Flask API
    ├── .env              # Database credentials
    ├── requirements.txt  # Python dependencies
    ├── ca-certificate.crt # DigitalOcean SSL cert
    ├── .htaccess         # Apache config
    ├── passenger_wsgi.py # Passenger entry point
    └── index.cgi        # CGI fallback
```

## Installation

### Prerequisites

- Python 3.8+ with virtual environment
- PostgreSQL database
- SSL certificate for database connection

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/chonito7919/DivScoutApp.git
cd DivScoutApp/public_html
```

2. **Set up Python virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r api/requirements.txt
```

4. **Configure database connection**

Create `api/.env` file:
```env
DB_HOST=your-database-host
DB_PORT=25060
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
```

5. **Add SSL certificate**

Place your database's CA certificate as `api/ca-certificate.crt`

6. **Deploy files**

Upload all files to your web hosting maintaining the directory structure.

## API Endpoints

All endpoints return JSON with `success` boolean and `data` object.

### Core Endpoints

- `GET /api/` - Health check
- `GET /api/stats` - Database statistics
- `GET /api/companies` - List all companies
- `GET /api/companies/{ticker}` - Get company details
- `GET /api/companies/{ticker}/dividends` - Get company's dividend history
- `GET /api/dividends/recent?limit=20` - Recent dividends (max 100)
- `GET /api/dividends/calendar?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Date range

### Response Format

```json
{
  "success": true,
  "data": {...},
  "count": 10
}
```

### Error Format

```json
{
  "success": false,
  "error": "Error message"
}
```

## Frontend Features

### Rate Limiting
- Client-side rate limiting: 30 requests per minute
- Graceful error handling with user feedback

### Caching
- API responses cached for 5-60 minutes
- Reduces database load and improves performance

### Responsive Design
- Mobile-first approach
- Works on all screen sizes
- Touch-friendly interface

## Data Quality

- Only displays dividends with confidence >= 0.8
- Filters out annual totals and statistical outliers
- Review status tracking (excludes deleted entries)
- ~85-90% accuracy from automated parsing

## Known Limitations

1. **Limited Coverage**: Currently only 3 companies (AAPL, JNJ, TGT)
2. **Historical Data Only**: No forward-looking dividend predictions
3. **Missing Dates**: Some declaration/payment dates unavailable in XBRL
4. **No Real-time Updates**: Data updated via batch process

## Security Considerations

- Database credentials in `.env` (never commit)
- SSL/TLS for database connections
- No user authentication (read-only public data)
- Input sanitization on all queries
- Rate limiting to prevent abuse

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

See [CONTRIBUTING.md](https://github.com/chonito7919/DivScout/blob/main/CONTRIBUTING.md) in the main DivScout repository.

## License

Apache 2.0 - See [LICENSE](https://github.com/chonito7919/DivScout/blob/main/LICENSE)

## Disclaimer

**This is not financial advice.** All dividend data should be independently verified before making investment decisions. Historical dividend payments do not guarantee future payments.

## Data Pipeline

### DivScout Parser

The dividend data displayed in this web interface is extracted from SEC EDGAR filings using the [DivScout Parser](https://github.com/chonito7919/DivScout), a Python tool that:

- **Fetches data** from SEC CompanyFacts API (official XBRL JSON format)
- **Parses standardized tags** from financial statements to identify dividend events
- **Applies quality checks** including statistical analysis and outlier detection
- **Generates confidence scores** for each dividend entry (only >= 0.8 displayed)
- **Stores structured data** in PostgreSQL for this web interface to query

**Parser Usage:**
```bash
# Install the parser
git clone https://github.com/chonito7919/DivScout.git
cd DivScout
pip install -r requirements.txt

# Process companies
python main.py AAPL MSFT JNJ
```

**Parser Dependencies:**
- Python 3.8+
- requests, psycopg2-binary, python-dotenv
- PostgreSQL database
- SEC API access (free, no authentication required)

See the [DivScout repository](https://github.com/chonito7919/DivScout) for full parser documentation, contributing guidelines, and license information.

## Related

- [DivScout Parser](https://github.com/chonito7919/DivScout) - The XBRL parsing engine
- [Blog Post](https://dev.to/chonito7919/i-built-a-tool-to-parse-sec-dividend-data-and-actually-shipped-it-327g) - Development journey

## Support

For issues or questions, open an issue on GitHub or check existing documentation.