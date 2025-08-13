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
            return null;
        }
        return response; // Return the full response
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
        'orders.html': loadOrders,
        'categories.html': handleCategoriesPage // Added categories route
        // Add other pages if needed
    };
    if (routes[path]) routes[path]();

    // --- Vendor Management ---
    async function loadVendors() {
        const response = await fetchAPI('/api/admin/vendors');
        if (!response) return;
        const { data } = await response.json();
        const tbody = document.getElementById('vendors-tbody');
        tbody.innerHTML = '';
        data.forEach(vendor => {
            const row = tbody.insertRow();
            row.innerHTML = `<td>${vendor.store_name}</td>
                           <td>${vendor.store_description || 'N/A'}</td>
                           <td>${vendor.store_location || 'N/A'}</td>
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
        const response = await fetchAPI('/api/products'); // Assuming this endpoint will be admin-protected
        if (!response) return;
        const { data } = await response.json();
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
        const response = await fetchAPI('/api/orders'); // Assuming this is admin-protected
        if (!response) return;
        const { data } = await response.json();
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

    async function handleCategoriesPage() {
        checkAuth(); // Simplified auth check

        const addCategoryForm = document.getElementById('addCategoryForm');
        const categoriesTableBody = document.getElementById('categories-tbody');
        const formMessage = document.createElement('div'); // Create a message element
        addCategoryForm.parentNode.insertBefore(formMessage, addCategoryForm.nextSibling);


        // Function to load categories
        async function loadCategories() {
            try {
                const response = await fetchAPI('/api/categories');
                if (!response) return;

                if (!response.ok) {
                    throw new Error(`Failed to fetch categories: ${response.statusText}`);
                }
                const result = await response.json();
                categoriesTableBody.innerHTML = '';
                if (result.data) {
                    result.data.forEach(category => {
                        const row = categoriesTableBody.insertRow();
                        row.innerHTML = `
                            <td>${category.id}</td>
                            <td>${category.name}</td>
                            <td><img src="http://localhost:3000/uploads/${category.image}" alt="${category.name}" width="50"></td>
                            <td>
                                <button class="btn-sm">Edit</button>
                                <button class="btn-sm btn-danger">Delete</button>
                            </td>
                        `;
                    });
                }
            } catch (error) {
                console.error('Error loading categories:', error);
                categoriesTableBody.innerHTML = '<tr><td colspan="4">Error loading categories.</td></tr>';
            }
        }

        // Handle Add Category form submission
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formMessage.innerHTML = '';
            formMessage.className = 'message';

            const formData = new FormData();
            const categoryName = document.getElementById('categoryName').value;
            const imageInput = document.getElementById('categoryImage');

            if (!categoryName.trim()) {
                formMessage.textContent = 'Category name is required.';
                formMessage.className = 'message error';
                return;
            }

            formData.append('name', categoryName);
            if (imageInput.files.length > 0) {
                formData.append('image', imageInput.files[0]);
            }

            try {
                const response = await fetchAPI('/api/categories', {
                    method: 'POST',
                    body: formData
                });

                if (!response) return; // Early exit if fetch was aborted

                const result = await response.json();

                if (response.ok) {
                    formMessage.textContent = 'Category added successfully!';
                    formMessage.className = 'message success';
                    addCategoryForm.reset();
                    loadCategories();
                } else {
                    formMessage.textContent = result.error || 'Failed to add category.';
                    formMessage.className = 'message error';
                }
            } catch (error) {
                console.error('Error adding category:', error);
                formMessage.textContent = 'An error occurred while adding the category.';
                formMessage.className = 'message error';
            }
        });

        // Initial load of categories
        loadCategories();
    }

    // --- Dashboard ---
    async function loadDashboardSummary() {
        // Placeholder - this would fetch aggregated data
        document.getElementById('total-sales').textContent = 'Loading...';
        document.getElementById('total-orders').textContent = 'Loading...';
        document.getElementById('total-customers').textContent = 'Loading...';
        document.getElementById('total-products').textContent = 'Loading...'; // Corrected from total-vendors
        document.getElementById('total-previews').textContent = 'Loading...'; // Added total-previews
    }

    checkAuth();
});
