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
        if (token && !url.startsWith("/api/categories")) {
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
        'orders.html': handleOrdersPage, // Assuming an orders page exists
        'register.html': handleRegisterForm
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
                            <button class="btn-sm edit-btn" data-product-id="${product.id}">Edit</button>
                            <button class="btn-sm btn-danger delete-btn" data-product-id="${product.id}">Delete</button>
                        </td>
                    `;
                });

                // Add event listeners for delete buttons
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const productId = e.target.dataset.productId;
                        if (confirm('Are you sure you want to delete this product?')) {
                            try {
                                const response = await fetchAPI(`/api/products/${productId}`, {
                                    method: 'DELETE'
                                });
                                if (!response) return;
                                if (response.ok) {
                                    // Reload products after deletion
                                    loadProducts();
                                } else {
                                    const result = await response.json();
                                    alert('Failed to delete product: ' + (result.error || 'Unknown error'));
                                }
                            } catch (error) {
                                console.error('Error deleting product:', error);
                                alert('An error occurred while deleting the product.');
                            }
                        }
                    });
                });

                // Add event listeners for edit buttons
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const productId = e.target.dataset.productId;
                        window.location.href = `add-product.html?edit=true&id=${productId}`;
                    });
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
    const pageTitle = document.getElementById('page-title');
    const submitBtn = document.getElementById('submit-btn');
    const existingImagesContainer = document.getElementById('existing-images-container');
    const productCategorySelect = document.getElementById('productCategory');

    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('edit') === 'true';
    const productId = urlParams.get('id');
    let deletedImages = [];

    async function loadInitialData() {
        // First, load categories
        try {
            const response = await fetchAPI('/api/categories');
            if (!response) return;
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

        // If in edit mode, then load product data
        if (isEditMode && productId) {
            pageTitle.textContent = 'Edit Product';
            submitBtn.textContent = 'Update Product';

            try {
                const response = await fetchAPI(`/api/products/${productId}`);
                if (!response) return;
                if (!response.ok) throw new Error('Failed to fetch product data');
                const result = await response.json();
                const product = result.data;

                document.getElementById('productName').value = product.name;
                document.getElementById('productDescription').value = product.description;
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productOfferPrice').value = product.offer_price;
                document.getElementById('productCondition').value = product.condition;
                document.getElementById('productQuantity').value = product.quantity;
                
                // Set the selected category
                productCategorySelect.value = product.category;


                // Display existing images
                if (product.image) {
                    const images = product.image.split(',');
                    images.forEach(filename => {
                        if (filename) {
                            const imgPreview = document.createElement('div');
                            imgPreview.className = 'img-preview';
                            imgPreview.innerHTML = `
                                <img src="http://localhost:3000/uploads/${filename.trim()}" alt="Product Image">
                                <button type="button" class="delete-img-btn" data-filename="${filename.trim()}">X</button>
                            `;
                            existingImagesContainer.appendChild(imgPreview);
                        }
                    });

                    // Add event listeners to delete buttons
                    document.querySelectorAll('.delete-img-btn').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const filename = e.target.dataset.filename;
                            deletedImages.push(filename);
                            e.target.parentElement.remove();
                        });
                    });
                }

            } catch (error) {
                console.error('Error loading product data for editing:', error);
                alert('Failed to load product data for editing.');
            }
        }
    }

    // Handle Add/Edit Product form submission
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        if (!isEditMode) {
            const productCode = 'SF' + Date.now(); // Auto-generate product code for new products
            formData.append('product_code', productCode);
        }
        formData.append('name', document.getElementById('productName').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('offer_price', document.getElementById('productOfferPrice').value || 0);
        formData.append('category', document.getElementById('productCategory').value);
        formData.append('condition', document.getElementById('productCondition').value);
        formData.append('quantity', document.getElementById('productQuantity').value);
        formData.append('deleted_images', deletedImages.join(','));


        // Handle image updates if necessary (this part can be complex)
        const defaultImageInput = document.getElementById('defaultProductImage');
        for (let i = 0; i < defaultImageInput.files.length; i++) {
            formData.append('images', defaultImageInput.files[i]);
        }


        const url = isEditMode ? `/api/products/${productId}` : '/api/products';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetchAPI(url, {
                method: method,
                body: formData
            });
            if (!response) return;

            const result = await response.json();

            if (response.ok) {
                alert(`Product ${isEditMode ? 'updated' : 'added'} successfully!`);
                window.location.href = 'products.html';
            } else {
                alert(`Failed to ${isEditMode ? 'update' : 'add'} product: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} product:`, error);
            alert(`An error occurred while ${isEditMode ? 'updating' : 'adding'} the product.`);
        }
    });

    // Initial load
    loadInitialData();
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
