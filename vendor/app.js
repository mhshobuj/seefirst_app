document.addEventListener('DOMContentLoaded', () => {
    // Router-like behavior based on element IDs
    if (document.getElementById('vendor-register-form')) {
        handleRegisterForm();
    } else if (document.getElementById('vendor-login-form')) {
        handleLoginForm();
    } else if (document.getElementById('products-table')) {
        handleProductsPage();
    } else if (document.querySelector('.dashboard-container')) {
        // This should be last as products page also has this class
        handleDashboardPage();
    }
});

// --- AUTH & UTILS ---
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!token || !user) {
        window.location.href = '/vendor/login.html';
        return null;
    }
    // Set user name on all pages
    const userNameSpan = document.getElementById('user-name');
    if(userNameSpan) userNameSpan.textContent = user.name;

    // Set up logout button on all pages
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/vendor/login.html';
        });
    }
    return { token, user };
}

// --- PAGE HANDLERS ---

function handleRegisterForm() {
    // ... (logic from previous steps)
}

function handleLoginForm() {
    // ... (logic from previous steps)
}

async function handleDashboardPage() {
    const auth = checkAuth();
    if (!auth) return;

    try {
        const response = await fetch('http://localhost:3000/api/vendor/dashboard', {
            headers: { 'x-access-token': auth.token }
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();

        const approvalDiv = document.getElementById('approval-status');
        if (data.is_approved) {
            approvalDiv.textContent = 'Your vendor account is approved.';
            approvalDiv.className = 'status-banner approved';
        } else {
            approvalDiv.textContent = 'Your vendor application is pending approval. You have limited access.';
            approvalDiv.className = 'status-banner pending';
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

    const addProductForm = document.getElementById('add-product-form');
    const productsTbody = document.getElementById('products-tbody');
    const formMessage = document.getElementById('form-message');

    // Fetch and display products
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/vendor/products', {
                headers: { 'x-access-token': auth.token }
            });
            if (!response.ok) throw new Error('Failed to fetch products');
            const result = await response.json();
            productsTbody.innerHTML = result.data.map(product => `
                <tr>
                    <td><img src="http://localhost:3000/uploads/${product.image.split(',')[0]}" alt="${product.name}" width="50"></td>
                    <td>${product.name}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>${product.quantity}</td>
                    <td><button class="btn-sm">Edit</button> <button class="btn-sm btn-danger">Delete</button></td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading products:', error);
            productsTbody.innerHTML = '<tr><td colspan="5">Error loading products.</td></tr>';
        }
    }

    // Handle Add Product form submission
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.innerHTML = '';
        formMessage.className = 'message';

        const formData = new FormData();
        formData.append('name', document.getElementById('product-name').value);
        formData.append('description', document.getElementById('product-description').value);
        formData.append('price', document.getElementById('product-price').value);
        formData.append('quantity', document.getElementById('product-quantity').value);
        
        const imageInput = document.getElementById('product-images');
        for (const file of imageInput.files) {
            formData.append('images', file);
        }

        try {
            const response = await fetch('http://localhost:3000/api/products', {
                method: 'POST',
                headers: {
                    'x-access-token': auth.token
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                formMessage.textContent = 'Product added successfully!';
                formMessage.classList.add('success');
                addProductForm.reset();
                loadProducts(); // Refresh the list
            } else {
                formMessage.textContent = result.error || 'Failed to add product.';
                formMessage.classList.add('error');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            formMessage.textContent = 'An error occurred while adding the product.';
            formMessage.classList.add('error');
        }
    });

    // Initial load
    loadProducts();
}
