# DivScout Deployment Guide

This guide covers deploying DivScout to Namecheap Stellar hosting with Python support.

## Prerequisites

- Namecheap hosting account with Python app support (Stellar or Stellar Plus)
- SSH access to your hosting account
- PostgreSQL database (DigitalOcean or similar)
- Database CA certificate

## Step 1: Prepare Your Files Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/chonito7919/DivScoutApp.git
   cd DivScoutApp/public_html
   ```

2. **Create your .env file**
   ```bash
   cp api/.env.example api/.env
   # Edit api/.env with your actual database credentials
   ```

3. **Add your CA certificate**
   - Download from DigitalOcean database dashboard
   - Save as `api/ca-certificate.crt`

4. **Remove unnecessary files for production**
   - Delete `.git/` folder
   - Delete `README.md`, `docs/` folder
   - Keep `.htaccess` files (needed for Apache)

## Step 2: Access Namecheap cPanel

1. Log into your Namecheap account
2. Go to Dashboard → Manage → cPanel
3. Or directly access: `https://server###.web-hosting.com:2083`

## Step 3: Set Up Python Application

1. **In cPanel, find "Setup Python App"** (under Software section)

2. **Create a new application:**
   - Python version: 3.13 (or latest available)
   - Application root: `public_html`
   - Application URL: Leave blank for root domain
   - Application startup file: `api/passenger_wsgi.py`
   - Application Entry point: `application`

3. **Click "CREATE"**

4. **Copy the virtual environment command** (looks like):
   ```bash
   source /home/yourusername/virtualenv/public_html/3.13/bin/activate
   ```

## Step 4: Upload Files via File Manager or FTP

### Using cPanel File Manager:
1. Open File Manager in cPanel
2. Navigate to `public_html`
3. Upload all files maintaining structure:
   ```
   public_html/
   ├── index.html
   ├── css/
   │   └── styles.css
   ├── js/
   │   └── app.js
   └── api/
       ├── app.py
       ├── .env
       ├── requirements.txt
       ├── ca-certificate.crt
       ├── passenger_wsgi.py
       ├── index.cgi
       └── .htaccess
   ```

### Using FTP:
1. Use FileZilla or similar
2. Host: `ftp.yourdomain.com`
3. Username: Your cPanel username
4. Password: Your cPanel password
5. Port: 21
6. Upload to `/public_html/`

## Step 5: Install Python Dependencies

1. **Access SSH** (Terminal in cPanel or SSH client)

2. **Navigate to your app directory:**
   ```bash
   cd ~/public_html
   ```

3. **Activate virtual environment** (use command from Step 3):
   ```bash
   source /home/yourusername/virtualenv/public_html/3.13/bin/activate
   ```

4. **Install dependencies:**
   ```bash
   cd api
   pip install -r requirements.txt
   ```

## Step 6: Configure Application

1. **Verify .htaccess in api/ folder:**
   ```apache
   Options +ExecCGI
   AddHandler cgi-script .cgi

   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ index.cgi/$1 [QSA,L]

   <FilesMatch "^(\.env|requirements\.txt|ca-certificate\.crt)$">
       Order allow,deny
       Deny from all
   </FilesMatch>
   ```

2. **Set file permissions:**
   ```bash
   chmod 755 api/index.cgi
   chmod 644 api/.env
   chmod 644 api/ca-certificate.crt
   ```

3. **Create logs directory (if needed):**
   ```bash
   mkdir -p api/logs
   chmod 755 api/logs
   ```

## Step 7: Test the Deployment

1. **Test API directly:**
   ```
   https://divscout.app/api/
   ```
   Should return: `{"status": "online", "service": "DivScout API", ...}`

2. **Test main site:**
   ```
   https://divscout.app/
   ```
   Should load the dashboard

3. **Check browser console** (F12) for any errors

## Step 8: Troubleshooting

### Common Issues:

**500 Internal Server Error**
- Check `api/stderr.log` for Python errors
- Verify all dependencies installed
- Check file permissions

**Database Connection Failed**
- Verify .env credentials
- Ensure ca-certificate.crt is present
- Check DigitalOcean firewall allows your server IP

**API Not Found (404)**
- Check .htaccess configuration
- Verify RewriteEngine is enabled
- Check api/index.cgi has execute permissions

**Module Import Errors**
- Ensure virtual environment is activated
- Reinstall requirements: `pip install -r requirements.txt`
- Check Python version compatibility

### Viewing Logs:

1. **Application logs:**
   ```bash
   tail -f ~/public_html/api/app_debug.log
   ```

2. **Error logs:**
   ```bash
   tail -f ~/public_html/api/stderr.log
   ```

3. **Apache error log** (in cPanel → Metrics → Errors)

## Step 9: Restart Application

If you make changes to Python files:

1. **Via cPanel:**
   - Go to Setup Python App
   - Find your application
   - Click "Restart"

2. **Via SSH (faster):**
   ```bash
   touch ~/public_html/api/tmp/restart.txt
   ```

## Step 10: Security Checklist

- [ ] .env file is not accessible via web
- [ ] CA certificate is protected
- [ ] Database only accepts SSL connections
- [ ] No debug mode in production
- [ ] Error messages don't expose sensitive info
- [ ] Regular backups configured

## Maintenance

### Updating the Application:

1. **Test changes locally first**

2. **Upload changed files** via FTP/File Manager

3. **If Python dependencies changed:**
   ```bash
   source /home/username/virtualenv/public_html/3.13/bin/activate
   cd ~/public_html/api
   pip install -r requirements.txt
   ```

4. **Restart application:**
   ```bash
   touch ~/public_html/api/tmp/restart.txt
   ```

### Database Maintenance:

- Regular backups via DigitalOcean dashboard
- Monitor connection pool usage
- Update dividend data via separate process

## Performance Optimization

1. **Enable caching** (already configured in app.py)

2. **Use CDN for static assets** (optional):
   - Move CSS/JS to Cloudflare/CDN
   - Update paths in index.html

3. **Monitor resource usage** in cPanel

4. **Database indexes** (run on PostgreSQL):
   ```sql
   CREATE INDEX idx_dividend_dates ON dividend_events(ex_dividend_date, payment_date);
   CREATE INDEX idx_company_ticker ON companies(ticker);
   ```

## Support

- **Namecheap Support**: For hosting issues
- **DigitalOcean Support**: For database issues
- **GitHub Issues**: For application bugs
- **Error Logs**: Always check logs first!

Remember: This is a read-only application displaying public data. No user authentication is required.