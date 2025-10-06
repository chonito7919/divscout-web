// DivScout Frontend Application
// Rate limiting and API interaction

const API_BASE = '/api/index.cgi';

// Rate limiter class
class RateLimiter 
{
    constructor(maxRequests = 30, windowMs = 60000) 
    {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    canMakeRequest() 
    {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) 
        {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }

    getTimeUntilNextRequest() 
    {
        if (this.requests.length === 0) return 0;
        const oldestRequest = Math.min(...this.requests);
        return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
    }
}

const rateLimiter = new RateLimiter();

// API Helper
async function apiCall(endpoint, options = {}) 
{
    if (!rateLimiter.canMakeRequest()) 
    {
        const waitTime = Math.ceil(rateLimiter.getTimeUntilNextRequest() / 1000);
        throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }

    try 
    {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) 
        {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } 
    catch (error) 
    {
        console.error('API call failed:', error);
        throw error;
    }
}

// UI Helpers
function showLoading() 
{
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() 
{
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showError(message) 
{
    const toast = document.getElementById('error-toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

function formatDate(dateString) 
{
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatCurrency(amount) 
{
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    }).format(amount);
}

function getFrequencyBadgeClass(frequency) 
{
    const map = {
        'quarterly': 'badge-quarterly',
        'monthly': 'badge-monthly',
        'annual': 'badge-annual',
        'special': 'badge-special'
    };
    return map[frequency] || 'badge-quarterly';
}

// Dashboard Functions
let currentPage = 1;
let currentLimit = 20;
let allDividendsData = [];

async function loadStats()
{
    try
    {
        const data = await apiCall('/stats');

        if (data.success)
        {
            const stats = data.data;
            const statCards = document.querySelectorAll('.stat-card');

            statCards[0].classList.remove('loading');
            statCards[0].querySelector('.stat-value').textContent = stats.total_companies.toLocaleString();

            statCards[1].classList.remove('loading');
            statCards[1].querySelector('.stat-value').textContent = stats.total_dividends.toLocaleString();

            statCards[2].classList.remove('loading');
            statCards[2].querySelector('.stat-value').textContent = stats.companies_with_dividends.toLocaleString();
        }
    }
    catch (error)
    {
        showError('Failed to load statistics: ' + error.message);
    }
}

async function loadRecentDividends(limit = 20, page = 1)
{
    const container = document.getElementById('recent-dividends');
    container.classList.add('loading');

    currentLimit = limit;
    currentPage = page;

    try
    {
        // Load more data than needed for pagination (100 records max from API)
        const data = await apiCall(`/dividends/recent?limit=100`);

        if (data.success && data.data.length > 0)
        {
            allDividendsData = data.data;
            displayDividendsPage(page, limit);
        }
        else
        {
            container.innerHTML = '<p class="calendar-hint">No recent dividends found.</p>';
        }
    }
    catch (error)
    {
        showError('Failed to load recent dividends: ' + error.message);
        container.innerHTML = '<p class="calendar-hint">Failed to load data.</p>';
    }
    finally
    {
        container.classList.remove('loading');
    }
}

function displayDividendsPage(page, limit) {
    const container = document.getElementById('recent-dividends');
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageData = allDividendsData.slice(start, end);
    const totalPages = Math.ceil(allDividendsData.length / limit);

    if (pageData.length === 0) {
        container.innerHTML = '<p class="calendar-hint">No dividends on this page.</p>';
        return;
    }

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Ex-Dividend Date</th>
                    <th>Payment Date</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                </tr>
            </thead>
            <tbody>
                ${pageData.map(div => `
                    <tr>
                        <td>
                            <a href="#" class="ticker-link" data-ticker="${div.ticker}">
                                ${div.ticker}
                            </a>
                        </td>
                        <td>${div.company_name}</td>
                        <td>${formatDate(div.ex_dividend_date)}</td>
                        <td>${formatDate(div.payment_date)}</td>
                        <td class="amount">${formatCurrency(div.amount)}</td>
                        <td>
                            <span class="badge ${getFrequencyBadgeClass(div.frequency)}">
                                ${div.frequency || 'N/A'}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;

    // Add click handlers to ticker links
    container.querySelectorAll('.ticker-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showCompanyModal(e.target.dataset.ticker);
        });
    });

    // Update pagination controls
    updatePaginationControls(page, totalPages, allDividendsData.length);
}

function updatePaginationControls(currentPage, totalPages, totalRecords) {
    const paginationContainer = document.getElementById('pagination-controls');

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const start = (currentPage - 1) * currentLimit + 1;
    const end = Math.min(currentPage * currentLimit, totalRecords);

    let html = `
        <div class="pagination">
            <button
                class="btn btn-secondary"
                onclick="changePage(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}
            >
                ← Previous
            </button>
            <span class="pagination-info">
                Showing ${start}-${end} of ${totalRecords} | Page ${currentPage} of ${totalPages}
            </span>
            <button
                class="btn btn-secondary"
                onclick="changePage(${currentPage + 1})"
                ${currentPage === totalPages ? 'disabled' : ''}
            >
                Next →
            </button>
        </div>
    `;

    paginationContainer.innerHTML = html;
}

function changePage(page) {
    displayDividendsPage(page, currentLimit);
}

// Companies Page Functions
let allCompanies = [];

async function loadCompanies() 
{
    const container = document.getElementById('companies-list');
    container.classList.add('loading');
    
    try 
    {
        const data = await apiCall('/companies');
        
        if (data.success) 
        {
            allCompanies = data.data;
            populateFilters(allCompanies);
            displayCompanies(allCompanies);
        }
    } 
    catch (error) 
    {
        showError('Failed to load companies: ' + error.message);
        container.innerHTML = '<p class="calendar-hint">Failed to load companies.</p>';
    } 
    finally 
    {
        container.classList.remove('loading');
    }
}

function populateFilters(companies) 
{
    const sectors = [...new Set(companies.map(c => c.sector).filter(Boolean))].sort();
    const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))].sort();
    
    const sectorFilter = document.getElementById('sector-filter');
    const industryFilter = document.getElementById('industry-filter');
    
    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector;
        option.textContent = sector;
        sectorFilter.appendChild(option);
    });
    
    industries.forEach(industry => {
        const option = document.createElement('option');
        option.value = industry;
        option.textContent = industry;
        industryFilter.appendChild(option);
    });
}

function displayCompanies(companies) 
{
    const container = document.getElementById('companies-list');
    
    if (companies.length === 0) 
    {
        container.innerHTML = '<p class="calendar-hint">No companies found.</p>';
        return;
    }
    
    const html = `
        <table>
            <thead>
                <tr>
                    <th>Ticker</th>
                    <th>Company Name</th>
                    <th>Sector</th>
                    <th>Industry</th>
                </tr>
            </thead>
            <tbody>
                ${companies.map(company => `
                    <tr>
                        <td>
                            <a href="#" class="ticker-link" data-ticker="${company.ticker}">
                                ${company.ticker}
                            </a>
                        </td>
                        <td>${company.company_name}</td>
                        <td>${company.sector || '-'}</td>
                        <td>${company.industry || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.ticker-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showCompanyModal(e.target.dataset.ticker);
        });
    });
}

function filterCompanies() 
{
    const searchTerm = document.getElementById('company-search').value.toLowerCase();
    const sector = document.getElementById('sector-filter').value;
    const industry = document.getElementById('industry-filter').value;
    
    let filtered = allCompanies;
    
    if (searchTerm) 
    {
        filtered = filtered.filter(c => 
            c.ticker.toLowerCase().includes(searchTerm) ||
            c.company_name.toLowerCase().includes(searchTerm)
        );
    }
    
    if (sector) 
    {
        filtered = filtered.filter(c => c.sector === sector);
    }
    
    if (industry) 
    {
        filtered = filtered.filter(c => c.industry === industry);
    }
    
    displayCompanies(filtered);
}

// Company Modal
async function showCompanyModal(ticker) 
{
    const modal = document.getElementById('company-modal');
    const modalBody = document.getElementById('modal-body');
    
    modal.classList.add('active');
    modalBody.innerHTML = '<div class="loading">Loading company data...</div>';
    
    try 
    {
        // Load company info
        const companyData = await apiCall(`/companies/${ticker}`);
        
        if (!companyData.success) 
        {
            throw new Error('Company not found');
        }
        
        const company = companyData.data;
        
        // Load dividends
        const dividendsData = await apiCall(`/companies/${ticker}/dividends`);
        const dividends = dividendsData.success ? dividendsData.data : [];
        
        // Calculate some basic stats
        const totalDividends = dividends.length;
        const totalAmount = dividends.reduce((sum, d) => sum + (d.amount || 0), 0);
        const avgAmount = totalDividends > 0 ? totalAmount / totalDividends : 0;
        
        // Render modal content
        const html = `
            <div class="company-header">
                <h2 class="company-title">${company.ticker} - ${company.company_name}</h2>
                <div class="company-meta">
                    <strong>CIK:</strong> ${company.cik || 'N/A'} | 
                    <strong>Sector:</strong> ${company.sector || 'N/A'} | 
                    <strong>Industry:</strong> ${company.industry || 'N/A'}
                    ${company.market_cap_category ? ` | <strong>Market Cap:</strong> ${company.market_cap_category}` : ''}
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Dividends</div>
                    <div class="stat-value">${totalDividends}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Average Amount</div>
                    <div class="stat-value">${formatCurrency(avgAmount)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Last Payment</div>
                    <div class="stat-value" style="font-size: 1.25rem;">
                        ${dividends.length > 0 ? formatDate(dividends[0].payment_date) : 'N/A'}
                    </div>
                </div>
            </div>
            
            <div class="dividend-history">
                <h3>Dividend History</h3>
                ${dividends.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Ex-Div Date</th>
                                <th>Record Date</th>
                                <th>Payment Date</th>
                                <th>Amount</th>
                                <th>Frequency</th>
                                <th>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dividends.slice(0, 20).map(div => `
                                <tr>
                                    <td>${formatDate(div.ex_dividend_date)}</td>
                                    <td>${formatDate(div.record_date)}</td>
                                    <td>${formatDate(div.payment_date)}</td>
                                    <td class="amount">${formatCurrency(div.amount)}</td>
                                    <td>
                                        <span class="badge ${getFrequencyBadgeClass(div.frequency)}">
                                            ${div.frequency || 'N/A'}
                                        </span>
                                    </td>
                                    <td>${div.dividend_type || 'cash'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${dividends.length > 20 ? `<p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.875rem;">Showing 20 of ${dividends.length} dividends</p>` : ''}
                ` : '<p class="calendar-hint">No dividend history available.</p>'}
            </div>
        `;
        
        modalBody.innerHTML = html;
    } 
    catch (error) 
    {
        showError('Failed to load company data: ' + error.message);
        modalBody.innerHTML = `<p class="calendar-hint">Error loading company data: ${error.message}</p>`;
    }
}

function closeModal() 
{
    document.getElementById('company-modal').classList.remove('active');
}

// Calendar Functions
async function loadCalendar()
{
    const startDate = document.getElementById('calendar-start').value;
    const endDate = document.getElementById('calendar-end').value;

    if (!startDate || !endDate)
    {
        showError('Please select both start and end dates');
        return;
    }

    const container = document.getElementById('calendar-view');
    container.innerHTML = '<div class="loading">Loading calendar data...</div>';

    try
    {
        // Use the new calendar endpoint
        console.log(`Loading calendar: ${startDate} to ${endDate}`);
        const data = await apiCall(`/dividends/calendar?start_date=${startDate}&end_date=${endDate}`);

        console.log('Calendar data received:', data);

        if (data.success)
        {
            if (!data.data || data.data.length === 0)
            {
                container.innerHTML = `<p class="calendar-hint">No dividends found between ${formatDate(startDate)} and ${formatDate(endDate)}. Try selecting a different date range.</p>`;
                return;
            }

            // Group by ex-dividend date
            const grouped = {};
            data.data.forEach(div => {
                const date = div.ex_dividend_date;
                if (!grouped[date])
                {
                    grouped[date] = [];
                }
                grouped[date].push(div);
            });

            // Sort dates
            const sortedDates = Object.keys(grouped).sort();

            const html = `
                <div class="calendar-grid">
                    ${sortedDates.map(date => `
                        <div class="calendar-day">
                            <div class="calendar-date">
                                ${formatDate(date)}
                                <span style="font-size: 0.75rem; color: var(--text-tertiary); font-weight: normal;"> (Ex-Div)</span>
                            </div>
                            ${grouped[date].map(div => `
                                <div class="calendar-item">
                                    <div>
                                        <a href="#" class="ticker-link" data-ticker="${div.ticker}">
                                            ${div.ticker}
                                        </a>
                                        - ${div.company_name}
                                    </div>
                                    <div class="amount">${formatCurrency(div.amount)}</div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            `;

            container.innerHTML = html;

            // Add click handlers
            container.querySelectorAll('.ticker-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    showCompanyModal(e.target.dataset.ticker);
                });
            });
        }
        else
        {
            container.innerHTML = `<p class="calendar-hint">Error: ${data.error || 'Unknown error occurred'}</p>`;
        }
    }
    catch (error)
    {
        console.error('Calendar error:', error);
        showError('Failed to load calendar: ' + error.message);
        container.innerHTML = `<p class="calendar-hint">Failed to load calendar data. Error: ${error.message}</p>`;
    }
}

// Navigation
function switchPage(pageName, updateHash = true)
{
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected page
    document.getElementById(`${pageName}-page`).classList.add('active');

    // Activate nav link
    const navLink = document.querySelector(`[data-page="${pageName}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }

    // Update URL hash
    if (updateHash) {
        window.location.hash = pageName;
    }

    // Load page data if needed
    if (pageName === 'dashboard') {
        loadStats();
        loadRecentDividends();
    } else if (pageName === 'companies' && allCompanies.length === 0) {
        loadCompanies();
    }
}

// Handle hash changes (back/forward navigation)
function handleHashChange()
{
    const hash = window.location.hash.slice(1); // Remove the #
    const validPages = ['dashboard', 'companies', 'calendar'];
    const page = validPages.includes(hash) ? hash : 'dashboard';
    switchPage(page, false); // Don't update hash when responding to hash change
}

// Load page from URL on initial load
function loadPageFromURL()
{
    handleHashChange();
}

// Global Search
let searchCompanies = [];

async function initializeSearch() {
    try {
        const data = await apiCall('/companies');
        if (data.success) {
            searchCompanies = data.data;
        }
    } catch (error) {
        console.error('Failed to load companies for search:', error);
    }
}

function performSearch(query) {
    if (!query || query.length < 1) {
        hideSearchResults();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const results = searchCompanies.filter(company =>
        company.ticker.toLowerCase().includes(lowerQuery) ||
        company.company_name.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit to 10 results

    displaySearchResults(results);
}

function displaySearchResults(results) {
    const container = document.getElementById('search-results');

    if (results.length === 0) {
        container.innerHTML = '<div class="search-no-results">No companies found</div>';
        container.classList.remove('hidden');
        return;
    }

    const html = results.map(company => `
        <div class="search-result-item" data-ticker="${company.ticker}">
            <div class="search-result-ticker">${company.ticker}</div>
            <div class="search-result-name">${company.company_name}</div>
        </div>
    `).join('');

    container.innerHTML = html;
    container.classList.remove('hidden');

    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const ticker = item.dataset.ticker;
            showCompanyModal(ticker);
            hideSearchResults();
            document.getElementById('global-search').value = '';
        });
    });
}

function hideSearchResults() {
    document.getElementById('search-results').classList.add('hidden');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load page from URL hash on initial load
    loadPageFromURL();

    // Listen for hash changes (back/forward buttons)
    window.addEventListener('hashchange', handleHashChange);

    // Initialize search
    initializeSearch();

    // Global search
    const searchInput = document.getElementById('global-search');
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    // Handle Enter key to open first result
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const firstResult = document.querySelector('.search-result-item');
            if (firstResult) {
                const ticker = firstResult.dataset.ticker;
                showCompanyModal(ticker);
                hideSearchResults();
                searchInput.value = '';
            }
        }
    });

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-search')) {
            hideSearchResults();
        }
    });

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            switchPage(page);
        });
    });
    
    // Recent dividends limit selector
    document.getElementById('recent-limit').addEventListener('change', (e) => {
        loadRecentDividends(parseInt(e.target.value), 1);
    });
    
    // Company search and filters
    document.getElementById('company-search').addEventListener('input', filterCompanies);
    document.getElementById('sector-filter').addEventListener('change', filterCompanies);
    document.getElementById('industry-filter').addEventListener('change', filterCompanies);
    
    // Calendar filter
    document.getElementById('calendar-filter-btn').addEventListener('click', loadCalendar);
    
    // Set default calendar dates (last 90 days to next 30 days)
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 90);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 30);

    document.getElementById('calendar-start').valueAsDate = pastDate;
    document.getElementById('calendar-end').valueAsDate = futureDate;
    
    // Modal close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('company-modal').addEventListener('click', (e) => {
        if (e.target.id === 'company-modal') 
        {
            closeModal();
        }
    });
    
    // Load initial dashboard data (only if on dashboard)
    if (!window.location.hash || window.location.hash === '#dashboard') {
        loadStats();
        loadRecentDividends();
    }
});