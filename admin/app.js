document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('products.html')) {
        loadProducts();
        loadCategoriesForProducts(); // New function to load categories for product form
        document.getElementById('addProductForm').addEventListener('submit', addProduct);
    } else if (path.includes('categories.html')) {
        loadCategories();
        document.getElementById('addCategoryForm').addEventListener('submit', addCategory);
    } else if (path.includes('orders.html')) {
        loadOrders();
    } else if (path.includes('customers.html')) {
        loadCustomers();
    } else if (path.includes('index.html') || path === '/admin/') {
        loadDashboardSummary();
    }

    async function loadProducts() {
        const response = await fetch('http://localhost:3000/api/products');
        const data = await response.json();
        const productsTableBody = document.querySelector('#productsTable tbody');
        productsTableBody.innerHTML = '';
        data.data.forEach(product => {
            const row = productsTableBody.insertRow();
            row.insertCell().textContent = product.id;
            row.insertCell().textContent = product.name;
            row.insertCell().textContent = product.description;
            row.insertCell().textContent = product.price;
            row.insertCell().textContent = product.image ? product.image.split(',')[0] : ''; // Display first image if multiple
            row.insertCell().textContent = product.category;
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
    }

    async function addProduct(event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('productName').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('price', parseFloat(document.getElementById('productPrice').value));
        formData.append('category', document.getElementById('productCategory').value);

        const imageInput = document.getElementById('productImage');
        for (const file of imageInput.files) {
            formData.append('images', file); // Append each file with the key 'images'
        }

        await fetch('http://localhost:3000/api/products', {
            method: 'POST',
            body: formData // FormData does not need Content-Type header
        });
        loadProducts();
        event.target.reset();
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
            row.insertCell().textContent = order.product_id;
            row.insertCell().textContent = order.quantity;
            row.insertCell().textContent = order.customer_name;
            row.insertCell().textContent = order.customer_phone;
            const statusCell = row.insertCell();
            statusCell.textContent = order.status;
            const actionsCell = row.insertCell();
            if (order.status === 'pending') {
                const completeButton = document.createElement('button');
                completeButton.textContent = 'Mark as Complete';
                completeButton.onclick = () => updateOrderStatus(order.id, 'completed');
                actionsCell.appendChild(completeButton);
            }
        });
    }

    async function updateOrderStatus(id, status) {
        await fetch(`http://localhost:3000/api/orders/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        loadOrders();
    }

    async function loadCustomers() {
        // This is a simplified example. In a real app, you'd fetch customer data.
        // For now, we'll aggregate from orders.
        const response = await fetch('http://localhost:3000/api/orders');
        const data = await response.json();
        const customers = {};
        data.data.forEach(order => {
            if (customers[order.customer_phone]) {
                customers[order.customer_phone].orderCount++;
            } else {
                customers[order.customer_phone] = {
                    name: order.customer_name,
                    orderCount: 1
                };
            }
        });

        const customersTableBody = document.querySelector('#customersTable tbody');
        customersTableBody.innerHTML = '';
        for (const phone in customers) {
            const customer = customers[phone];
            const row = customersTableBody.insertRow();
            row.insertCell().textContent = customer.name;
            row.insertCell().textContent = phone;
            row.insertCell().textContent = customer.orderCount;
        }
    }

    async function loadDashboardSummary() {
        const productsResponse = await fetch('http://localhost:3000/api/products');
        const productsData = await productsResponse.json();
        document.getElementById('total-products').textContent = productsData.data.length;

        const ordersResponse = await fetch('http://localhost:3000/api/orders');
        const ordersData = await ordersResponse.json();
        document.getElementById('total-orders').textContent = ordersData.data.length;

        const customersResponse = await fetch('http://localhost:3000/api/orders');
        const customersData = await customersResponse.json();
        const uniqueCustomers = new Set();
        customersData.data.forEach(order => uniqueCustomers.add(order.customer_phone));
        document.getElementById('total-customers').textContent = uniqueCustomers.size;
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
    }
});