#!/bin/bash

# DivScout Web Setup Script
# Helps automate initial setup and deployment checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Check if we're in the right directory
check_directory() {
    print_header "Checking Directory Structure"
    
    if [[ ! -f "index.html" ]] || [[ ! -d "api" ]]; then
        print_error "This script must be run from the DivScout web root directory"
        echo "Expected structure:"
        echo "  - index.html"
        echo "  - api/"
        echo "  - css/"
        echo "  - js/"
        exit 1
    fi
    
    print_success "Directory structure verified"
}

# Setup environment file
setup_env() {
    print_header "Setting Up Environment File"
    
    if [[ -f "api/.env" ]]; then
        print_warning ".env file already exists"
        read -p "Do you want to reconfigure it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    if [[ ! -f "api/.env.example" ]]; then
        print_error ".env.example not found in api/ directory"
        exit 1
    fi
    
    cp api/.env.example api/.env
    
    echo "Please enter your database configuration:"
    read -p "Database Host: " db_host
    read -p "Database Port [25060]: " db_port
    db_port=${db_port:-25060}
    read -p "Database Name [defaultdb]: " db_name
    db_name=${db_name:-defaultdb}
    read -p "Database User: " db_user
    read -s -p "Database Password: " db_password
    echo
    
    # Update .env file
    sed -i.bak "s|your-database-cluster.db.ondigitalocean.com|$db_host|g" api/.env
    sed -i.bak "s|DB_PORT=25060|DB_PORT=$db_port|g" api/.env
    sed -i.bak "s|DB_NAME=defaultdb|DB_NAME=$db_name|g" api/.env
    sed -i.bak "s|DB_USER=doadmin|DB_USER=$db_user|g" api/.env
    sed -i.bak "s|your-secure-password-here|$db_password|g" api/.env
    
    # Remove backup file
    rm -f api/.env.bak
    
    print_success ".env file configured"
}

# Check for CA certificate
check_certificate() {
    print_header "Checking CA Certificate"
    
    if [[ ! -f "api/ca-certificate.crt" ]]; then
        print_warning "CA certificate not found"
        echo "Please download your database CA certificate from DigitalOcean"
        echo "and save it as: api/ca-certificate.crt"
        read -p "Press Enter when done, or Ctrl+C to exit..."
        
        if [[ ! -f "api/ca-certificate.crt" ]]; then
            print_error "CA certificate still not found"
            exit 1
        fi
    fi
    
    print_success "CA certificate found"
}

# Set correct permissions
set_permissions() {
    print_header "Setting File Permissions"
    
    # Make CGI executable
    if [[ -f "api/index.cgi" ]]; then
        chmod 755 api/index.cgi
        print_success "CGI script made executable"
    fi
    
    # Protect sensitive files
    chmod 600 api/.env 2>/dev/null || true
    chmod 644 api/ca-certificate.crt 2>/dev/null || true
    
    # Create necessary directories
    mkdir -p api/logs
    mkdir -p api/tmp
    chmod 755 api/logs
    chmod 755 api/tmp
    
    print_success "Permissions set correctly"
}

# Install Python dependencies
install_dependencies() {
    print_header "Installing Python Dependencies"
    
    # Check if we're in a virtual environment
    if [[ -z "$VIRTUAL_ENV" ]]; then
        print_warning "Not in a virtual environment"
        echo "For Namecheap hosting, activate your virtual environment first:"
        echo "source /home/username/virtualenv/public_html/3.13/bin/activate"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Check for pip
    if ! command -v pip &> /dev/null; then
        print_error "pip not found. Please install Python and pip first."
        exit 1
    fi
    
    # Install requirements
    pip install -r api/requirements.txt
    
    print_success "Python dependencies installed"
}

# Test database connection
test_database() {
    print_header "Testing Database Connection"
    
    python3 -c "
import sys
sys.path.insert(0, 'api')
from app import get_db_connection
try:
    conn = get_db_connection()
    conn.close()
    print('Database connection successful!')
except Exception as e:
    print(f'Database connection failed: {e}')
    sys.exit(1)
" || {
        print_error "Database connection test failed"
        echo "Please check your .env configuration and CA certificate"
        return 1
    }
    
    print_success "Database connection verified"
}

# Create test endpoints file
create_test_file() {
    print_header "Creating API Test File"
    
    cat > test_api.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>DivScout API Test</title>
    <style>
        body { font-family: monospace; padding: 20px; }
        .test { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
        .success { background: #d4edda; }
        .error { background: #f8d7da; }
    </style>
</head>
<body>
    <h1>DivScout API Test</h1>
    <div id="results"></div>
    
    <script>
        const tests = [
            '/api/',
            '/api/stats',
            '/api/companies',
            '/api/companies/AAPL',
            '/api/dividends/recent?limit=5'
        ];
        
        async function runTests() {
            const results = document.getElementById('results');
            
            for (const endpoint of tests) {
                const div = document.createElement('div');
                div.className = 'test';
                
                try {
                    const response = await fetch(endpoint);
                    const data = await response.json();
                    
                    if (response.ok && (data.success !== false)) {
                        div.className += ' success';
                        div.innerHTML = `✓ ${endpoint} - OK`;
                    } else {
                        div.className += ' error';
                        div.innerHTML = `✗ ${endpoint} - Failed: ${data.error || 'Unknown error'}`;
                    }
                } catch (error) {
                    div.className += ' error';
                    div.innerHTML = `✗ ${endpoint} - Error: ${error.message}`;
                }
                
                results.appendChild(div);
            }
        }
        
        runTests();
    </script>
</body>
</html>
EOF
    
    print_success "Created test_api.html - Open in browser to test endpoints"
}

# Main execution
main() {
    print_header "DivScout Web Setup Script"
    
    check_directory
    setup_env
    check_certificate
    set_permissions
    
    read -p "Install Python dependencies? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_dependencies
    fi
    
    read -p "Test database connection? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_database
    fi
    
    create_test_file
    
    print_header "Setup Complete!"
    echo "Next steps:"
    echo "1. Upload all files to your web hosting"
    echo "2. Configure Python app in cPanel"
    echo "3. Open test_api.html in your browser to verify API"
    echo "4. Visit your domain to see the dashboard"
    echo ""
    echo "If on Namecheap, remember to restart the app:"
    echo "  touch api/tmp/restart.txt"
}

# Run main function
main