document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split("/").pop();
    const token = localStorage.getItem('token'); // Vendor token

    // --- AUTH & UTILS ---
    function checkAuth() {
        if (!token && path !== 'login.html') {
            window.location.href = 'login.html';
        } else if (token && path === 'login.html') {
            window.location.href = 'dashboard.html';
        }
        // Set user name on all pages
        const userNameSpan = document.getElementById('user-name');
        const user = JSON.parse(localStorage.getItem('user'));
        if(userNameSpan && user) userNameSpan.textContent = user.name;

        // Set up logout button on all pages
        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            });
        }
        return { token, user };
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
            // Token is invalid or expired, clear it and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return null; // Return null to indicate that the request failed
        }
        return response; // Return the raw response
    }

    // --- Page Routing (adapted from admin/app.js) ---
    const routes = {
        'login.html': handleLoginForm,
        'dashboard.html': handleDashboardPage,
        'products.html': handleProductsPage,
        'add-product.html': handleAddProductPage,
        'orders.html': handleOrdersPage // Assuming an orders page exists
        // Add other pages if needed
    };
    if (routes[path]) routes[path]();

    // --- PAGE HANDLERS ---

    function handleRegisterForm() {
        const registerForm = document.getElementById('vendor-register-form');
        const messageDiv = document.getElementById('message');

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.innerHTML = '';
            messageDiv.className = 'message';

            const storeName = document.getElementById('store-name').value;
            const storeDescription = document.getElementById('store-description').value;
            const ownerName = document.getElementById('owner-name').value;
            const ownerEmail = document.getElementById('owner-email').value;
            const ownerPhone = document.getElementById('owner-phone').value;
            const storeLocation = document.getElementById('store-location').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                messageDiv.classList.add('error');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/vendor/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        name: ownerName, // Map to user name
                        email: ownerEmail, // Map to user email
                        phone: ownerPhone, // Map to user phone
                        password: password, // Map to user password
                        store_name: storeName, 
                        store_description: storeDescription,
                        store_location: storeLocation
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    messageDiv.textContent = result.message;
                    messageDiv.classList.add('success');
                    registerForm.reset();
                    // Optionally redirect to login or dashboard after successful application
                    // window.location.href = '/vendor/login.html';
                } else {
                    messageDiv.textContent = result.error || 'Registration failed.';
                    messageDiv.classList.add('error');
                }
            } catch (error) {
                console.error('Error during vendor registration:', error);
                messageDiv.textContent = 'An error occurred during registration.';
                messageDiv.classList.add('error');
            }
        });
    }

    function handleLoginForm() {
        const loginForm = document.getElementById('vendor-login-form');
        const messageDiv = document.getElementById('message');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.innerHTML = '';
            messageDiv.className = 'message';

            const identifier = document.getElementById('identifier').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/user/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ identifier, password })
                });

                const result = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                    messageDiv.textContent = 'Login successful!';
                    messageDiv.classList.add('success');
                    window.location.href = '/vendor/dashboard.html'; // Redirect to vendor dashboard
                } else {
                    messageDiv.textContent = result.error || 'Login failed.';
                    messageDiv.classList.add('error');
                }
            } catch (error) {
                console.error('Error during login:', error);
                messageDiv.textContent = 'An error occurred during login.';
                messageDiv.classList.add('error');
            }
        });
    }

    async function handleDashboardPage() {
        const auth = checkAuth();
        if (!auth) return;

        try {
            const response = await fetchAPI('/api/vendor/dashboard'); // Use fetchAPI
            if (!response) return; // Stop execution if fetchAPI returned null
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            const data = await response.json();

            const approvalDiv = document.getElementById('approval-status');
            if (data.is_approved) {
                approvalDiv.textContent = 'Your vendor account is approved.';
                approvalDiv.classList.remove('alert-warning');
                approvalDiv.classList.add('alert-success');
            } else {
                approvalDiv.textContent = 'Your vendor application is pending approval. You have limited access.';
                approvalDiv.classList.remove('alert-success');
                approvalDiv.classList.add('alert-warning');
            }

            document.getElementById('store-name').textContent = data.store_name;
            document.getElementById('total-products').textContent = data.product_count;
            document.getElementById('pending-orders').textContent = data.pending_orders_count;

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async function handleProductsPage() {
        const auth = checkAuth();
        if (!auth) return;

        const productsTableBody = document.getElementById('productsTable').getElementsByTagName('tbody')[0];

        // Fetch and display products
        async function loadProducts() {
            try {
                const response = await fetchAPI('/api/vendor/products'); // Use fetchAPI
                if (!response) return; // Stop execution if fetchAPI returned null
                if (!response.ok) throw new Error('Failed to fetch products');
                const result = await response.json();
                productsTableBody.innerHTML = ''; // Clear existing rows
                result.data.forEach(product => {
                    const row = productsTableBody.insertRow();
                    row.innerHTML = `
                        <td>${product.id}</td>
                        <td>${product.product_code || 'N/A'}</td>
                        <td>${product.name}</td>
                        <td>${product.description || 'N/A'}</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td><img src="http://localhost:3000/uploads/${product.image.split(',')[0]}" alt="${product.name}" width="50"></td>
                        <td>${product.category || 'N/A'}</td>
                        <td>${product.quantity}</td>
                        <td class="actions">
                            <button class="btn-sm">Edit</button> 
                            <button class="btn-sm btn-danger">Delete</button>
                        </td>
                    `;
                });
            } catch (error) {
                console.error('Error loading products:', error);
                productsTableBody.innerHTML = '<tr><td colspan="9">Error loading products.</td></tr>';
            }
        }

        // Initial load
        loadProducts();
    }

    async function handleAddProductPage() {
        const auth = checkAuth();
        if (!auth) return;

        const addProductForm = document.getElementById('addProductForm');

        // Fetch and populate categories dropdown
        async function loadCategories() {
            const productCategorySelect = document.getElementById('productCategory');
            try {
                const response = await fetchAPI('/api/categories'); // Assuming this endpoint exists
                if (!response) return; // Stop execution if fetchAPI returned null
                if (!response.ok) throw new Error('Failed to fetch categories');
                const result = await response.json();
                result.data.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    productCategorySelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        }

        // Handle Add Product form submission
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('name', document.getElementById('productName').value);
            formData.append('description', document.getElementById('productDescription').value);
            formData.append('price', document.getElementById('productPrice').value);
            formData.append('offer_price', document.getElementById('productOfferPrice').value || 0);
            formData.append('category', document.getElementById('productCategory').value);
            formData.append('condition', document.getElementById('productCondition').value);
            
            formData.append('quantity', document.getElementById('productQuantity').value);
            
            // Handle default image
            const defaultImageInput = document.getElementById('defaultProductImage');
            if (defaultImageInput.files.length > 0) {
                formData.append('default_image', defaultImageInput.files[0]);
            }

            // Handle color-wise images
            const colorImagePairs = document.getElementById('color-image-pairs');
            for (const pair of colorImagePairs.children) {
                const colorInput = pair.querySelector('input[type="text"]');
                const imageInput = pair.querySelector('input[type="file"]');
                if (colorInput.value && imageInput.files.length > 0) {
                    formData.append(`color_image_${colorInput.value}`, imageInput.files[0]);
                }
            }

            try {
                const response = await fetchAPI('/api/products', {
                    method: 'POST',
                    body: formData
                });
                if (!response) return; // Stop execution if fetchAPI returned null

                const result = await response.json();

                if (response.ok) {
                    alert('Product added successfully!');
                    addProductForm.reset();
                    colorImagePairs.innerHTML = ''; // Clear dynamic fields
                    // No need to loadProducts here, as we are on add-product page
                } else {
                    alert('Failed to add product: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error adding product:', error);
                alert('An error occurred while adding the product.');
            }
        });

        // Add event listener for the 'Add Color Image' button
        document.getElementById('addColorImage').addEventListener('click', () => {
            const colorImagePairs = document.getElementById('color-image-pairs');
            if (colorImagePairs.children.length >= 5) {
                alert('You can upload a maximum of 5 color-wise images.');
                return;
            }
            const newPair = document.createElement('div');
            newPair.className = 'color-image-pair';
            newPair.innerHTML = `
                <input type="text" placeholder="Color Name (e.g., Red)">
                <input type="file" accept="image/*">
                <button type="button" class="remove-color-image">Remove</button>
            `;
            colorImagePairs.appendChild(newPair);

            newPair.querySelector('.remove-color-image').addEventListener('click', () => {
                newPair.remove();
                // Re-enable default image if no color images are left
                if (colorImagePairs.children.length === 0) {
                    document.getElementById('defaultProductImage').disabled = false;
                }
            });

            // Disable default image upload
            document.getElementById('defaultProductImage').disabled = true;
        });

        // Add event listener for default image input
        const defaultImageInput = document.getElementById('defaultProductImage');
        defaultImageInput.addEventListener('change', () => {
            const addColorImageBtn = document.getElementById('addColorImage');
            const colorImagePairs = document.getElementById('color-image-pairs');
            if (defaultImageInput.files.length > 0) {
                addColorImageBtn.disabled = true;
                // Clear and disable color-wise inputs
                colorImagePairs.innerHTML = '';
                for (const input of colorImagePairs.querySelectorAll('input')) {
                    input.disabled = true;
                }
            } else {
                addColorImageBtn.disabled = false;
                for (const input of colorImagePairs.querySelectorAll('input')) {
                    input.disabled = false;
                }
            }
        });

        // Initial load
        loadCategories(); // Load categories on page load
    }

    // Placeholder for handleOrdersPage
    async function handleOrdersPage() {
        const auth = checkAuth();
        if (!auth) return;
        const ordersTbody = document.getElementById('orders-tbody');
        try {
            const response = await fetchAPI('/api/vendor/orders'); // Assuming this endpoint exists
            if (!response) return; // Stop execution if fetchAPI returned null
            if (!response.ok) throw new Error('Failed to fetch orders');
            const result = await response.json();
            ordersTbody.innerHTML = result.data.map(order => `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>${order.total.toFixed(2)}</td>
                    <td>${order.status}</td>
                    <td><button class="btn-sm">View</button></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading orders:', error);
            ordersTbody.innerHTML = '<tr><td colspan="5">Error loading orders.</td></tr>';
        }
    }

    // --- PAGE HANDLERS ---

    function handleRegisterForm() {
        const registerForm = document.getElementById('vendor-register-form');
        const messageDiv = document.getElementById('message');

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.innerHTML = '';
            messageDiv.className = 'message';

            const storeName = document.getElementById('store-name').value;
            const storeDescription = document.getElementById('store-description').value;
            const ownerName = document.getElementById('owner-name').value;
            const ownerEmail = document.getElementById('owner-email').value;
            const ownerPhone = document.getElementById('owner-phone').value;
            const storeLocation = document.getElementById('store-location').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                messageDiv.classList.add('error');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/vendor/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        name: ownerName, // Map to user name
                        email: ownerEmail, // Map to user email
                        phone: ownerPhone, // Map to user phone
                        password: password, // Map to user password
                        store_name: storeName, 
                        store_description: storeDescription,
                        store_location: storeLocation
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    messageDiv.textContent = result.message;
                    messageDiv.classList.add('success');
                    registerForm.reset();
                    // Optionally redirect to login or dashboard after successful application
                    // window.location.href = '/vendor/login.html';
                } else {
                    messageDiv.textContent = result.error || 'Registration failed.';
                    messageDiv.classList.add('error');
                }
            } catch (error) {
                console.error('Error during vendor registration:', error);
                messageDiv.textContent = 'An error occurred during registration.';
                messageDiv.classList.add('error');
            }
        });
    }

    function handleLoginForm() {
        const loginForm = document.getElementById('vendor-login-form');
        const messageDiv = document.getElementById('message');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.innerHTML = '';
            messageDiv.className = 'message';

            const identifier = document.getElementById('identifier').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/user/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ identifier, password })
                });

                const result = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                    messageDiv.textContent = 'Login successful!';
                    messageDiv.classList.add('success');
                    window.location.href = '/vendor/dashboard.html'; // Redirect to vendor dashboard
                } else {
                    messageDiv.textContent = result.error || 'Login failed.';
                    messageDiv.classList.add('error');
                }
            } catch (error) {
                console.error('Error during login:', error);
                messageDiv.textContent = 'An error occurred during login.';
                messageDiv.classList.add('error');
            }
        });
    }

    async function handleDashboardPage() {
        const auth = checkAuth();
        if (!auth) return;

        try {
            const response = await fetchAPI('/api/vendor/dashboard'); // Use fetchAPI
            if (!response) return; // Stop execution if fetchAPI returned null
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            const data = await response.json();

            const approvalDiv = document.getElementById('approval-status');
            if (data.is_approved) {
                approvalDiv.textContent = 'Your vendor account is approved.';
                approvalDiv.classList.remove('alert-warning');
                approvalDiv.classList.add('alert-success');
            } else {
                approvalDiv.textContent = 'Your vendor application is pending approval. You have limited access.';
                approvalDiv.classList.remove('alert-success');
                approvalDiv.classList.add('alert-warning');
            }

            document.getElementById('store-name').textContent = data.store_name;
            document.getElementById('total-products').textContent = data.product_count;
            document.getElementById('pending-orders').textContent = data.pending_orders_count;

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    async function handleProductsPage() {
        const auth = checkAuth();
        if (!auth) return;

        const productsTableBody = document.getElementById('productsTable').getElementsByTagName('tbody')[0];

        // Fetch and display products
        async function loadProducts() {
            try {
                const response = await fetchAPI('/api/vendor/products'); // Use fetchAPI
                if (!response) return; // Stop execution if fetchAPI returned null
                if (!response.ok) throw new Error('Failed to fetch products');
                const result = await response.json();
                productsTableBody.innerHTML = ''; // Clear existing rows
                result.data.forEach(product => {
                    const row = productsTableBody.insertRow();
                    row.innerHTML = `
                        <td>${product.id}</td>
                        <td>${product.product_code || 'N/A'}</td>
                        <td>${product.name}</td>
                        <td>${product.description || 'N/A'}</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td><img src="http://localhost:3000/uploads/${product.image.split(',')[0]}" alt="${product.name}" width="50"></td>
                        <td>${product.category || 'N/A'}</td>
                        <td>${product.quantity}</td>
                        <td class="actions">
                            <button class="btn-sm">Edit</button> 
                            <button class="btn-sm btn-danger">Delete</button>
                        </td>
                    `;
                });
            } catch (error) {
                console.error('Error loading products:', error);
                productsTableBody.innerHTML = '<tr><td colspan="9">Error loading products.</td></tr>';
            }
        }

        // Initial load
        loadProducts();
    }

    // Placeholder for handleOrdersPage
    async function handleOrdersPage() {
        const auth = checkAuth();
        if (!auth) return;
        const ordersTbody = document.getElementById('orders-tbody');
        try {
            const response = await fetchAPI('/api/vendor/orders'); // Assuming this endpoint exists
            if (!response) return; // Stop execution if fetchAPI returned null
            if (!response.ok) throw new Error('Failed to fetch orders');
            const result = await response.json();
            ordersTbody.innerHTML = result.data.map(order => `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>${order.total.toFixed(2)}</td>
                    <td>${order.status}</td>
                    <td><button class="btn-sm">View</button></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading orders:', error);
            ordersTbody.innerHTML = '<tr><td colspan="5">Error loading orders.</td></tr>';
        }
    }

    // Initial check and route handling
    checkAuth();
});