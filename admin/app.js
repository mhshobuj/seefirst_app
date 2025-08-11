document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split("/").pop();
    const token = localStorage.getItem('adminToken');

    // --- Authentication & API --- 
    function checkAuth() {
        if (!token && path !== 'login.html') {
            window.location.href = 'login.html';
        } else if (token && path === 'login.html') {
            window.location.href = 'index.html';
        }
    }

    async function login(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const message = document.getElementById('loginMessage');
        try {
            const response = await fetch('http://localhost:3000/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('adminToken', data.token);
                window.location.href = 'index.html';
            } else {
                message.textContent = data.error || 'Login failed';
            }
        } catch (error) {
            message.textContent = 'An error occurred.';
        }
    }

    function logout() {
        localStorage.removeItem('adminToken');
        window.location.href = 'login.html';
    }

    async function fetchAPI(url, options = {}) {
        const headers = { ...options.headers };
        if (token) {
            headers['x-access-token'] = token;
        }
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        const response = await fetch('http://localhost:3000' + url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        return response.json();
    }

    // --- Page Routing ---
    const routes = {
        'login.html': () => document.getElementById('loginForm').addEventListener('submit', login),
        'index.html': loadDashboardSummary,
        '': loadDashboardSummary, // For root path /admin/
        'vendors.html': loadVendors,
        'products.html': () => {
            loadProducts();
            document.getElementById('addProductForm').addEventListener('submit', addProduct);
        },
        'orders.html': loadOrders
        // Add other pages if needed
    };
    if (routes[path]) routes[path]();

    // --- Vendor Management ---
    async function loadVendors() {
        const { data } = await fetchAPI('/api/admin/vendors');
        const tbody = document.getElementById('vendors-tbody');
        tbody.innerHTML = '';
        data.forEach(vendor => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${vendor.store_name}</td>
                           <td>${vendor.name}</td>
                           <td>${vendor.email || 'N/A'}</td>
                           <td>${vendor.phone}</td>
                           <td>${vendor.is_approved ? '<span class="status-approved">Approved</span>' : '<span class="status-pending">Pending</span>'}</td>
                           <td class="actions"></td>`;
            if (!vendor.is_approved) {
                const btn = document.createElement('button');
                btn.textContent = 'Approve';
                btn.onclick = () => approveVendor(vendor.id);
                row.cells[5].appendChild(btn);
            }
        });
    }

    async function approveVendor(vendorId) {
        if (!confirm('Approve this vendor?')) return;
        await fetchAPI(`/api/admin/vendors/${vendorId}/approve`, { method: 'PUT' });
        loadVendors();
    }

    // --- Product Management ---
    async function loadProducts() {
        const { data } = await fetchAPI('/api/products'); // Assuming this endpoint will be admin-protected
        const tbody = document.getElementById('products-tbody');
        tbody.innerHTML = '';
        data.forEach(product => {
            const row = tbody.insertRow();
            // This needs to be updated to show vendor info
            row.innerHTML = `<td>${product.id}</td>
                           <td>${product.name}</td>
                           <td>${product.vendor_id || 'N/A'}</td> <!-- TODO: Show vendor name -->
                           <td>${product.price}</td>
                           <td>${product.quantity}</td>
                           <td class="actions"><button>Delete</button></td>`;
        });
    }

    async function addProduct(e) {
        e.preventDefault();
        // Admin add product logic would be different from vendor
        // This is a placeholder for a future implementation if needed
        alert('Admin product creation not implemented yet. Products should be added by vendors.');
    }

    // --- Order Management ---
    async function loadOrders() {
        const { data } = await fetchAPI('/api/orders'); // Assuming this is admin-protected
        const tbody = document.getElementById('orders-tbody');
        tbody.innerHTML = '';
        data.forEach(order => {
            const row = tbody.insertRow();
            // This needs to be updated to show vendor info per item
            row.innerHTML = `<td>${order.id}</td>
                           <td>${order.customer_name}</td>
                           <td>${order.total}</td>
                           <td>${order.status}</td>
                           <td class="actions"><button>View</button></td>`;
        });
    }

    // --- Dashboard ---
    async function loadDashboardSummary() {
        // Placeholder - this would fetch aggregated data
        document.getElementById('total-sales').textContent = 'Loading...';
        document.getElementById('total-orders').textContent = 'Loading...';
        document.getElementById('total-customers').textContent = 'Loading...';
        document.getElementById('total-vendors').textContent = 'Loading...';
    }

    checkAuth();
});
