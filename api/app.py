"""
DivScout API - Flask backend for dividend data
Fixed version with proper routing and error handling
"""

import os
import sys
import logging
from flask import Flask, jsonify, request, make_response
from functools import wraps
from flask_cors import CORS
import pg8000.native
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Configure logging - FIXED PATH
try:
    logging.basicConfig(
        filename='/home/divsffoy/public_html/api/app_debug.log',
        level=logging.DEBUG,
        format='%(asctime)s %(levelname)s: %(message)s'
    )
    logging.info("Application starting...")
except Exception as e:
    # If logging fails, continue anyway
    print(f"Logging setup failed: {e}", file=sys.stderr)

app = Flask(__name__)
CORS(app)

# Database configuration with defaults
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 25060)),
    'database': os.getenv('DB_NAME', 'defaultdb'),
    'user': os.getenv('DB_USER', 'doadmin'),
    'password': os.getenv('DB_PASSWORD', '')
}


def get_db_connection():
    """Create database connection using pg8000"""
    import ssl
    
    try:
        # Check if CA certificate exists
        ca_cert_path = os.path.join(os.path.dirname(__file__), 'ca-certificate.crt')
        
        if os.path.exists(ca_cert_path):
            ssl_context = ssl.create_default_context(cafile=ca_cert_path)
        else:
            # Try without SSL if certificate not found
            ssl_context = None
            logging.warning("CA certificate not found, attempting connection without SSL")
        
        conn = pg8000.native.Connection(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            database=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            ssl_context=ssl_context
        )
        logging.debug("Database connection established")
        return conn
    except Exception as e:
        logging.error(f"Database connection failed: {str(e)}")
        raise


def cache_for(seconds=300):
    """Decorator to add cache headers to responses"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            response = make_response(f(*args, **kwargs))
            response.cache_control.max_age = seconds
            response.cache_control.public = True
            return response
        return decorated_function
    return decorator


# Health check endpoints - both with and without /api prefix
@app.route('/')
@app.route('/api')
@app.route('/api/')
def index():
    """API root - health check"""
    return jsonify({
        'status': 'online',
        'service': 'DivScout API',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    })


# Stats endpoint
@app.route('/stats')
@app.route('/api/stats')
@cache_for(300)  # 5 minutes
def get_stats():
    """Get database statistics"""
    conn = None
    try:
        conn = get_db_connection()
        
        # Get counts with safe defaults
        try:
            company_count = conn.run(
                "SELECT COUNT(*) FROM companies WHERE is_active = true"
            )[0][0]
        except:
            company_count = 0
            
        try:
            dividend_count = conn.run(
                """SELECT COUNT(*) FROM dividend_events 
                   WHERE confidence >= 0.8 AND (review_status != 'deleted' OR review_status IS NULL)"""
            )[0][0]
        except:
            dividend_count = 0
            
        try:
            companies_with_dividends = conn.run(
                """SELECT COUNT(DISTINCT company_id) FROM dividend_events 
                   WHERE confidence >= 0.8 AND (review_status != 'deleted' OR review_status IS NULL)"""
            )[0][0]
        except:
            companies_with_dividends = 0
        
        return jsonify({
            'success': True,
            'data': {
                'total_companies': company_count,
                'total_dividends': dividend_count,
                'companies_with_dividends': companies_with_dividends
            }
        })
        
    except Exception as e:
        logging.error(f"Error in get_stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve statistics'
        }), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


# Companies endpoints
@app.route('/companies')
@app.route('/api/companies')
@cache_for(600)  # 10 minutes
def get_companies():
    """Get all companies"""
    conn = None
    try:
        conn = get_db_connection()
        
        companies = conn.run("""
            SELECT 
                company_id,
                ticker,
                company_name,
                sector,
                industry,
                is_active
            FROM companies
            WHERE is_active = true
            ORDER BY ticker
        """)
        
        result = []
        for row in companies:
            result.append({
                'company_id': row[0],
                'ticker': row[1],
                'company_name': row[2],
                'sector': row[3],
                'industry': row[4],
                'is_active': row[5]
            })
        
        return jsonify({
            'success': True,
            'count': len(result),
            'data': result
        })
        
    except Exception as e:
        logging.error(f"Error in get_companies: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve companies'
        }), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


# Company detail endpoints
@app.route('/companies/<ticker>')
@app.route('/api/companies/<ticker>')
@cache_for(1800)  # 30 minutes
def get_company(ticker):
    """Get single company by ticker"""
    conn = None
    try:
        conn = get_db_connection()
        
        result = conn.run("""
            SELECT 
                company_id,
                ticker,
                company_name,
                cik,
                sector,
                industry,
                market_cap_category,
                is_active
            FROM companies
            WHERE UPPER(ticker) = UPPER(:ticker)
        """, ticker=ticker)
        
        if not result:
            return jsonify({
                'success': False,
                'error': 'Company not found'
            }), 404
        
        row = result[0]
        company = {
            'company_id': row[0],
            'ticker': row[1],
            'company_name': row[2],
            'cik': row[3],
            'sector': row[4],
            'industry': row[5],
            'market_cap_category': row[6],
            'is_active': row[7]
        }
        
        return jsonify({
            'success': True,
            'data': company
        })
        
    except Exception as e:
        logging.error(f"Error in get_company: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve company'
        }), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


# Company dividends endpoints
@app.route('/companies/<ticker>/dividends')
@app.route('/api/companies/<ticker>/dividends')
@cache_for(1800)  # 30 minutes
def get_company_dividends(ticker):
    """Get dividends for a company"""
    conn = None
    try:
        conn = get_db_connection()
        
        company_result = conn.run(
            "SELECT company_id FROM companies WHERE UPPER(ticker) = UPPER(:ticker)",
            ticker=ticker
        )
        
        if not company_result:
            return jsonify({
                'success': False,
                'error': 'Company not found'
            }), 404
        
        company_id = company_result[0][0]
        
        dividends_result = conn.run("""
            SELECT 
                dividend_id,
                declaration_date,
                ex_dividend_date,
                record_date,
                payment_date,
                amount,
                frequency,
                dividend_type,
                fiscal_year,
                fiscal_quarter,
                confidence
            FROM dividend_events
            WHERE company_id = :company_id
                AND confidence >= 0.8
                AND (review_status != 'deleted' OR review_status IS NULL)
            ORDER BY ex_dividend_date DESC
        """, company_id=company_id)
        
        dividends = []
        for row in dividends_result:
            dividends.append({
                'dividend_id': row[0],
                'declaration_date': str(row[1]) if row[1] else None,
                'ex_dividend_date': str(row[2]) if row[2] else None,
                'record_date': str(row[3]) if row[3] else None,
                'payment_date': str(row[4]) if row[4] else None,
                'amount': float(row[5]) if row[5] else None,
                'frequency': row[6],
                'dividend_type': row[7],
                'fiscal_year': row[8],
                'fiscal_quarter': row[9],
                'confidence': float(row[10]) if row[10] else None
            })
        
        return jsonify({
            'success': True,
            'ticker': ticker.upper(),
            'count': len(dividends),
            'data': dividends
        })
        
    except Exception as e:
        logging.error(f"Error in get_company_dividends: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve dividends'
        }), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


# Recent dividends endpoints
@app.route('/dividends/recent')
@app.route('/api/dividends/recent')
@cache_for(300)
def get_recent_dividends():
    """Get recent dividends across all companies"""
    conn = None
    try:
        limit = request.args.get('limit', 20, type=int)
        if limit > 100:
            limit = 100
        
        conn = get_db_connection()
        
        result = conn.run("""
            SELECT 
                c.ticker,
                c.company_name,
                de.ex_dividend_date,
                de.payment_date,
                de.amount,
                de.frequency,
                de.dividend_type
            FROM dividend_events de
            JOIN companies c ON de.company_id = c.company_id
            WHERE c.is_active = true
                AND de.confidence >= 0.8
                AND (de.review_status != 'deleted' OR de.review_status IS NULL)
            ORDER BY de.ex_dividend_date DESC
            LIMIT :limit
        """, limit=limit)
        
        dividends = []
        for row in result:
            dividends.append({
                'ticker': row[0],
                'company_name': row[1],
                'ex_dividend_date': str(row[2]) if row[2] else None,
                'payment_date': str(row[3]) if row[3] else None,
                'amount': float(row[4]) if row[4] else None,
                'frequency': row[5],
                'dividend_type': row[6]
            })
        
        return jsonify({
            'success': True,
            'count': len(dividends),
            'data': dividends
        })
        
    except Exception as e:
        logging.error(f"Error in get_recent_dividends: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve recent dividends'
        }), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


# Calendar endpoints
@app.route('/dividends/calendar')
@app.route('/api/dividends/calendar')
@cache_for(3600)
def get_dividend_calendar():
    """Get dividends within a date range"""
    conn = None
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({
                'success': False,
                'error': 'start_date and end_date parameters required'
            }), 400
        
        conn = get_db_connection()
        
        result = conn.run("""
            SELECT
                c.ticker,
                c.company_name,
                de.ex_dividend_date,
                de.payment_date,
                de.amount,
                de.frequency,
                de.dividend_type
            FROM dividend_events de
            JOIN companies c ON de.company_id = c.company_id
            WHERE c.is_active = true
                AND de.ex_dividend_date >= :start_date::date
                AND de.ex_dividend_date <= :end_date::date
                AND de.confidence >= 0.8
                AND (de.review_status != 'deleted' OR de.review_status IS NULL)
            ORDER BY de.payment_date ASC
        """, start_date=start_date, end_date=end_date)
        
        dividends = []
        for row in result:
            dividends.append({
                'ticker': row[0],
                'company_name': row[1],
                'ex_dividend_date': str(row[2]) if row[2] else None,
                'payment_date': str(row[3]) if row[3] else None,
                'amount': float(row[4]) if row[4] else None,
                'frequency': row[5],
                'dividend_type': row[6]
            })
        
        return jsonify({
            'success': True,
            'count': len(dividends),
            'start_date': start_date,
            'end_date': end_date,
            'data': dividends
        })
        
    except Exception as e:
        logging.error(f"Error in get_dividend_calendar: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve calendar data'
        }), 500
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def server_error(e):
    logging.error(f"Server error: {str(e)}")
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    app.run(debug=False)  # Never use debug=True in production

# Required for CGI
application = app