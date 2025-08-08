document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // --- Authentication Logic ---
    function checkAuth() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (!isLoggedIn && !path.includes('login.html')) {
            window.location.href = 'login.html';
        } else if (isLoggedIn && path.includes('login.html')) {
            window.location.href = 'index.html';
        }
    }

    async function login(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginMessage = document.getElementById('loginMessage');

        try {
            const response = await fetch('http://localhost:3000/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'index.html';
            } else {
                loginMessage.textContent = data.error || 'Login failed';
                loginMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Error during login:', error);
            loginMessage.textContent = 'An error occurred during login.';
            loginMessage.style.color = 'red';
        }
    }

    function logout() {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    }

    // Run authentication check on every page load
    checkAuth();

    // --- Page Specific Logic ---
    if (path.includes('products.html')) {
        loadProducts();
        loadCategoriesForProducts();
        document.getElementById('addProductForm').addEventListener('submit', addProduct);
    } else if (path.includes('categories.html')) {
        loadCategories();
        document.getElementById('addCategoryForm').addEventListener('submit', addCategory);
    } else if (path.includes('orders.html')) {
        loadOrders();
    } else if (path.includes('customers.html')) {
        loadCustomers();
    } else if (path.includes('previews.html')) {
        loadPreviews();
    } else if (path.includes('banners.html')) {
        loadBanners();
        document.getElementById('bannerUploadForm').addEventListener('submit', addBanner);
    } else if (path.includes('index.html') || path === '/admin/') {
        loadDashboardSummary();
    } else if (path.includes('login.html')) {
        document.getElementById('loginForm').addEventListener('submit', login);
    }

    // --- Existing Functions (moved below for clarity) ---
    async function loadProducts(page = 1) {
        const response = await fetch(`http://localhost:3000/api/products?page=${page}`);
        const data = await response.json();
        const productsTableBody = document.querySelector('#productsTable tbody');
        productsTableBody.innerHTML = '';
        data.data.forEach(product => {
            const row = productsTableBody.insertRow();
            row.insertCell().textContent = product.id;
            row.insertCell().textContent = product.product_code;
            row.insertCell().textContent = product.name;
            row.insertCell().textContent = product.description;
            row.insertCell().textContent = product.price;
            row.insertCell().textContent = product.image ? product.image.split(',')[0] : ''; // Display first image if multiple
            row.insertCell().textContent = product.category;
            row.insertCell().textContent = product.quantity;
            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = () => editProduct(product);
            actionsCell.appendChild(editButton);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteProduct(product.id);
            actionsCell.appendChild(deleteButton);
        });
        renderPagination(data.total_pages, data.current_page);
    }

    function renderPagination(totalPages, currentPage) {
        const paginationContainer = document.querySelector('#pagination-container');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = ''; // Clear existing pagination

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none'; // Hide pagination if only one page or less
            return;
        }

        paginationContainer.style.display = 'flex'; // Show pagination

        let paginationHtml = `
            <ul class="pagination justify-content-center">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        paginationHtml += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        `;

        paginationContainer.innerHTML = paginationHtml;

        // Add event listeners to pagination links
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const newPage = parseInt(this.dataset.page);
                if (newPage >= 1 && newPage <= totalPages) {
                    loadProducts(newPage);
                }
            });
        });
    }

    function renderPagination(totalPages, currentPage) {
        const paginationContainer = document.querySelector('#pagination-container');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = ''; // Clear existing pagination

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none'; // Hide pagination if only one page or less
            return;
        }

        paginationContainer.style.display = 'flex'; // Show pagination

        let paginationHtml = `
            <ul class="pagination justify-content-center">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
        `;

        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        paginationHtml += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        `;

        paginationContainer.innerHTML = paginationHtml;

        // Add event listeners to pagination links
        paginationContainer.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const newPage = parseInt(this.dataset.page);
                if (newPage >= 1 && newPage <= totalPages) {
                    loadProducts(newPage);
                }
            });
        });
    }

    async function addProduct(event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('productName').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('price', parseFloat(document.getElementById('productPrice').value));
        formData.append('offer_price', parseFloat(document.getElementById('productOfferPrice').value) || 0.0);
        formData.append('category', document.getElementById('productCategory').value);
        formData.append('condition', document.getElementById('productCondition').value);
        formData.append('quantity', parseInt(document.getElementById('productQuantity').value));

        const colors = [];
        document.querySelectorAll('input[name="color"]:checked').forEach(checkbox => {
            colors.push(checkbox.value);
        });
        formData.append('colors', colors.join(','));

        const imageInput = document.getElementById('productImage');
        if (imageInput.files.length > 5) {
            alert('You can upload a maximum of 5 images.');
            return;
        }
        for (const file of imageInput.files) {
            formData.append('images', file); // Append each file with the key 'images'
        }

        fetch('http://localhost:3000/api/products', {
            method: 'POST',
            body: formData // FormData does not need Content-Type header
        }).then(response => {
            if (response.ok) {
                loadProducts();
                event.target.reset();
            }
        });
    }

    async function editProduct(product) {
        const newName = prompt('Enter new name:', product.name);
        if (newName === null) return;
        const newDescription = prompt('Enter new description:', product.description);
        if (newDescription === null) return;
        const newPrice = prompt('Enter new price:', product.price);
        if (newPrice === null) return;
        const newImage = prompt('Enter new image URL:', product.image);
        if (newImage === null) return;
        const newCategory = prompt('Enter new category:', product.category);
        if (newCategory === null) return;

        const updatedProduct = {
            name: newName,
            description: newDescription,
            price: parseFloat(newPrice),
            image: newImage,
            category: newCategory
        };

        await fetch(`http://localhost:3000/api/products/${product.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProduct)
        });
        loadProducts();
    }

    async function deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        await fetch(`http://localhost:3000/api/products/${id}`, {
            method: 'DELETE'
        });
        loadProducts();
    }

    async function loadCategories() {
        const response = await fetch('http://localhost:3000/api/categories');
        const data = await response.json();
        const categoriesTableBody = document.querySelector('#categoriesTable tbody');
        categoriesTableBody.innerHTML = '';
        data.data.forEach(category => {
            const row = categoriesTableBody.insertRow();
            row.insertCell().textContent = category.id;
            row.insertCell().textContent = category.name;
            const imageCell = row.insertCell();
            if (category.image) {
                const img = document.createElement('img');
                img.src = `http://localhost:3000/uploads/${category.image}`;
                img.style.width = '50px';
                img.style.height = '50px';
                img.style.objectFit = 'cover';
                imageCell.appendChild(img);
            } else {
                imageCell.textContent = 'No Image';
            }
            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.onclick = () => editCategory(category);
            actionsCell.appendChild(editButton);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteCategory(category.id);
            actionsCell.appendChild(deleteButton);
        });
    }

    async function editCategory(category) {
        const newName = prompt('Enter new category name:', category.name);
        if (newName === null || newName.trim() === '') return;

        await fetch(`http://localhost:3000/api/categories/${category.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });
        loadCategories();
        loadCategoriesForProducts(); // Refresh categories in product form
    }

    async function deleteCategory(id) {
        if (!confirm('Are you sure you want to delete this category?')) return;
        await fetch(`http://localhost:3000/api/categories/${id}`, {
            method: 'DELETE'
        });
        loadCategories();
        loadCategoriesForProducts(); // Refresh categories in product form
    }

    async function loadCategoriesForProducts() {
        const response = await fetch('http://localhost:3000/api/categories');
        const data = await response.json();
        const productCategorySelect = document.getElementById('productCategory');
        // Clear existing options except the first one (Select a Category)
        productCategorySelect.innerHTML = '<option value="">Select a Category</option>';
        data.data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            productCategorySelect.appendChild(option);
        });
    }

    async function addCategory(event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('categoryName').value);
        const imageInput = document.getElementById('categoryImage');
        if (imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        }

        await fetch('http://localhost:3000/api/categories', {
            method: 'POST',
            body: formData
        });
        loadCategories();
        event.target.reset();
    }

    async function loadOrders() {
        const response = await fetch('http://localhost:3000/api/orders');
        const data = await response.json();
        const ordersTableBody = document.querySelector('#ordersTable tbody');
        ordersTableBody.innerHTML = '';
        data.data.forEach(order => {
            const row = ordersTableBody.insertRow();
            row.insertCell().textContent = order.id;
            row.insertCell().textContent = order.customer_name;
            row.insertCell().textContent = order.customer_phone;
            row.insertCell().textContent = order.delivery_address;
            row.insertCell().textContent = order.products;
            row.insertCell().textContent = order.total;
            const statusCell = row.insertCell();
            const statusSelect = document.createElement('select');
            statusSelect.innerHTML = `
                <option value="New" ${order.status === 'New' ? 'selected' : ''}>New</option>
                <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Packaging" ${order.status === 'Packaging' ? 'selected' : ''}>Packaging</option>
                <option value="Delivering" ${order.status === 'Delivering' ? 'selected' : ''}>Delivering</option>
                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            `;
            statusCell.appendChild(statusSelect);
            const actionsCell = row.insertCell();
            const updateButton = document.createElement('button');
            updateButton.textContent = 'Update';
            updateButton.onclick = () => updateOrderStatus(order.id, statusSelect.value);
            actionsCell.appendChild(updateButton);
        });
    }

    async function updateOrderStatus(id, status) {
        await fetch(`http://localhost:3000/api/orders/${id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
        loadOrders();
    }

    async function loadCustomers() {
        const response = await fetch('http://localhost:3000/api/users');
        const data = await response.json();
        const customersTableBody = document.querySelector('#customersTable tbody');
        customersTableBody.innerHTML = '';
        data.data.forEach(user => {
            const row = customersTableBody.insertRow();
            row.insertCell().textContent = user.name;
            row.insertCell().textContent = user.phone;
            row.insertCell().textContent = user.order_count || 0;
            const actionsCell = row.insertCell();
            const statusButton = document.createElement('button');
            statusButton.textContent = user.is_active ? 'Deactivate' : 'Activate';
            statusButton.onclick = () => toggleUserStatus(user.id, !user.is_active);
            actionsCell.appendChild(statusButton);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteUser(user.id);
            actionsCell.appendChild(deleteButton);
        });
    }

    async function toggleUserStatus(userId, newStatus) {
        await fetch(`http://localhost:3000/api/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: newStatus })
        });
        loadCustomers();
    }

    async function deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        await fetch(`http://localhost:3000/api/users/${userId}`, {
            method: 'DELETE'
        });
        loadCustomers();
    }

    async function loadPreviews() {
        const response = await fetch('http://localhost:3000/api/previews');
        const data = await response.json();
        const previewsTableBody = document.querySelector('#previewsTable tbody');
        previewsTableBody.innerHTML = '';
        data.data.forEach(preview => {
            const row = previewsTableBody.insertRow();
            row.insertCell().textContent = preview.user_name;
            row.insertCell().textContent = preview.user_phone;
            row.insertCell().textContent = preview.preview_address;
            row.insertCell().textContent = preview.schedule_date;
            row.insertCell().textContent = preview.products;
            const statusCell = row.insertCell();
            const statusSelect = document.createElement('select');
            statusSelect.innerHTML = `
                <option value="Pending" ${preview.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Confirmed" ${preview.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Completed" ${preview.status === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Cancelled" ${preview.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            `;
            statusCell.appendChild(statusSelect);
            const actionsCell = row.insertCell();
            const updateButton = document.createElement('button');
            updateButton.textContent = 'Update';
            updateButton.onclick = () => updatePreviewStatus(preview.id, statusSelect.value);
            actionsCell.appendChild(updateButton);
        });
    }

    async function updatePreviewStatus(previewId, newStatus) {
        await fetch(`http://localhost:3000/api/previews/${previewId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        loadPreviews();
    }

    async function loadDashboardSummary() {
        const productsResponse = await fetch('http://localhost:3000/api/products');
        const productsData = await productsResponse.json();
        document.getElementById('total-products').textContent = productsData.total_products;

        const ordersResponse = await fetch('http://localhost:3000/api/orders');
        const ordersData = await ordersResponse.json();
        document.getElementById('total-orders').textContent = ordersData.data.length;

        const usersResponse = await fetch('http://localhost:3000/api/users');
        const usersData = await usersResponse.json();
        document.getElementById('total-customers').textContent = usersData.data.length;

        const salesResponse = await fetch('http://localhost:3000/api/dashboard/sales');
        const salesData = await salesResponse.json();
        document.getElementById('total-sales').textContent = `৳${salesData.total_sales.toFixed(2)}`;

        const previewsResponse = await fetch('http://localhost:3000/api/dashboard/previews/count');
        const previewsData = await previewsResponse.json();
        document.getElementById('total-previews').textContent = previewsData.preview_count;

        // Fetch monthly sales and previews data for charts
        const monthlySalesResponse = await fetch('http://localhost:3000/api/dashboard/monthly_sales');
        const monthlySalesData = await monthlySalesResponse.json();

        const monthlyPreviewsResponse = await fetch('http://localhost:3000/api/dashboard/monthly_previews');
        const monthlyPreviewsData = await monthlyPreviewsResponse.json();

        renderCharts(monthlySalesData.data, monthlyPreviewsData.data);
    }

    function renderCharts(salesData, previewsData) {
        const salesCtx = document.getElementById('monthlySalesChart').getContext('2d');
        const previewCtx = document.getElementById('monthlyPreviewsChart').getContext('2d');

        const salesLabels = salesData.map(item => item.month);
        const salesValues = salesData.map(item => item.total_amount);

        const previewLabels = previewsData.map(item => item.month);
        const previewValues = previewsData.map(item => item.total_previews);

        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: salesLabels,
                datasets: [{
                    label: 'Monthly Sales (৳)',
                    data: salesValues,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Sales Overview'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        new Chart(previewCtx, {
            type: 'bar',
            data: {
                labels: previewLabels,
                datasets: [{
                    label: 'Monthly Preview Requests',
                    data: previewValues,
                    backgroundColor: 'rgb(255, 99, 132)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Preview Requests Overview'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async function loadBanners() {
        console.log('Attempting to load banners...');
        const response = await fetch('http://localhost:3000/api/banners');
        const data = await response.json();
        console.log('Banners API response data:', data);
        const bannerList = document.getElementById('bannerList');
        bannerList.innerHTML = '';
        if (data.data.length === 0) {
            document.getElementById('noBannersMessage').style.display = 'block';
        } else {
            document.getElementById('noBannersMessage').style.display = 'none';
            data.data.forEach(banner => {
                console.log('Rendering banner:', banner);
                const bannerItem = document.createElement('div');
                bannerItem.className = 'banner-item';
                bannerItem.innerHTML = `
                    <img src="http://localhost:3000/uploads/${banner.image}" alt="Banner Image">
                    <button class="btn-delete" data-id="${banner.id}">Delete</button>
                `;
                bannerList.appendChild(bannerItem);
                console.log('Banner item appended:', bannerItem);
            });

            bannerList.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const bannerId = event.target.dataset.id;
                    if (confirm('Are you sure you want to delete this banner?')) {
                        const response = await fetch(`http://localhost:3000/api/banners/${bannerId}`, {
                            method: 'DELETE'
                        });
                        const result = await response.json();
                        if (response.ok) {
                            alert(result.message);
                            loadBanners();
                        } else {
                            alert(`Error: ${result.error}`);
                        }
                    }
                });
            });
        }
    }

    async function addBanner(event) {
        event.preventDefault();
        const formData = new FormData();
        const imageInput = document.getElementById('bannerImage');
        if (imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        } else {
            alert('Please select an image to upload.');
            return;
        }

        const uploadMessage = document.getElementById('uploadMessage');
        uploadMessage.textContent = 'Uploading...';
        uploadMessage.style.color = 'blue';

        const response = await fetch('http://localhost:3000/api/banners', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (response.ok) {
            uploadMessage.textContent = 'Upload successful!';
            uploadMessage.style.color = 'green';
            event.target.reset();
            loadBanners();
        } else {
            uploadMessage.textContent = `Upload failed: ${result.error}`;
            uploadMessage.style.color = 'red';
        }
    }

    if (path.includes('banners.html')) {
        loadBanners();
        document.getElementById('bannerUploadForm').addEventListener('submit', addBanner);
    } else if (path.includes('login.html')) {
        console.log('Login page detected. Attaching login form listener.');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', login);
            console.log('Login form listener attached.');
        } else {
            console.error('Login form not found!');
        }
    }

    // Attach logout event listener to the logout button on all admin pages
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});