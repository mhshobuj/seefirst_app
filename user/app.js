document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // Function to fetch and display products
    async function loadProducts(containerSelector, limit = null, cardClass = '', categoryId = null, sort = null, isCarousel = false) {
        let apiUrl = 'http://localhost:3000/api/products';
        const params = new URLSearchParams();
        if (categoryId && categoryId !== 'all') {
            params.append('category_id', categoryId);
        }
        if (sort) {
            params.append('sort', sort);
        }
        if (params.toString()) {
            apiUrl += `?${params.toString()}`;
        }
        const response = await fetch(apiUrl);
        const data = await response.json();
        const products = limit ? data.data.slice(0, limit) : data.data;

        const productContainer = document.querySelector(containerSelector);
        if (!productContainer) return;
        productContainer.innerHTML = ''; // Clear existing content

        if (isCarousel) {
            for (let i = 0; i < products.length; i += 5) {
                const carouselItem = document.createElement('div');
                carouselItem.className = `carousel-item ${i === 0 ? 'active' : ''}`;
                const row = document.createElement('div');
                row.className = 'row justify-content-center';

                for (let j = i; j < i + 5 && j < products.length; j++) {
                    const product = products[j];
                    const imageUrl = product.image ? `http://localhost:3000/uploads/${product.image.split(',')[0].trim()}` : 'https://placehold.co/400x300';
                    const productCard = `
                        <div class="new-arrival-item">
                            <div class="card shadow-sm h-100 new-arrival-card">
                                <img src="${imageUrl}" class="card-img-top" alt="${product.name}">
                                <div class="card-body p-2">
                                    <h6 class="card-title text-primary fw-bold mb-1"><a href="product-detail.html?id=${product.id}" class="text-decoration-none text-primary">${product.name}</a></h6>
                                    <p class="card-text fs-6 fw-semibold text-dark mb-2"><strong>৳${product.price.toFixed(2)}</strong></p>
                                    <a href="product-detail.html?id=${product.id}" class="btn btn-primary btn-sm rounded-pill w-100">View Details</a>
                                </div>
                            </div>
                        </div>
                    `;
                    row.innerHTML += productCard;
                }
                // Ensure the row is a flex container for horizontal alignment
                row.style.display = 'flex';
                row.style.justifyContent = 'center'; // Center the items
                carouselItem.appendChild(row);
                productContainer.appendChild(carouselItem);
            }
            console.log('New Arrivals loaded.');
        } else {
            console.log(`Loading products for ${containerSelector}`);
            products.forEach(product => {
                const imageUrl = product.image ? `http://localhost:3000/uploads/${product.image.split(',')[0].trim()}` : 'https://placehold.co/400x300';
                const productCard = `
                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm h-100 ${cardClass}">
                            <img src="${imageUrl}" class="card-img-top" alt="${product.name}">
                            <div class="card-body p-2">
                                <h6 class="card-title text-primary fw-bold mb-1"><a href="product-detail.html?id=${product.id}" class="text-decoration-none text-primary">${product.name}</a></h6>
                                <p class="card-text fs-6 fw-semibold text-dark mb-2"><strong>৳${product.price.toFixed(2)}</strong></p>
                                <a href="product-detail.html?id=${product.id}" class="btn btn-primary btn-sm rounded-pill w-100">View Details</a>
                            </div>
                        </div>
                    </div>
                `;
                productContainer.innerHTML += productCard;
            });
        }
    }

    // Function to fetch and display categories
    async function loadCategories() {
        console.log('Loading categories...');
        const response = await fetch('http://localhost:3000/api/categories');
        const data = await response.json();
        console.log('Categories data:', data);

        const categoryFilterContainer = document.querySelector('#category-filter-container');
        if (categoryFilterContainer) {
            categoryFilterContainer.innerHTML = '<a href="#" class="btn btn-outline-primary btn-sm text-nowrap me-2 active" data-category-id="all">All Products</a>';
            data.data.forEach(category => {
                const categoryButton = `<a href="#" class="btn btn-outline-primary btn-sm text-nowrap me-2" data-category-id="${category.id}">${category.name}</a>`;
                categoryFilterContainer.innerHTML += categoryButton;
            });

            // Add event listeners to category filter buttons
            categoryFilterContainer.querySelectorAll('a.btn').forEach(button => {
                button.addEventListener('click', function(event) {
                    event.preventDefault();
                    categoryFilterContainer.querySelectorAll('a.btn').forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    const categoryId = this.dataset.categoryId;
                    if (categoryId === 'all') {
                        loadProducts('#product-listing-container');
                    } else {
                        loadProducts('#product-listing-container', null, '', categoryId);
                    }
                });
            });
        // Add event listeners to filter dropdown items
            document.querySelectorAll('#dropdownFilter + .dropdown-menu .dropdown-item').forEach(item => {
                item.addEventListener('click', function(event) {
                    event.preventDefault();
                    const sortOption = this.dataset.sort;
                    const currentCategoryId = document.querySelector('#category-filter-container .active').dataset.categoryId;
                    loadProducts('#product-listing-container', null, '', currentCategoryId, sortOption);
                });
            });
        }

        const categoryContainer = document.querySelector('#category-section-container');
        if (categoryContainer) {
            categoryContainer.innerHTML = ''; // Clear existing content
            data.data.forEach(category => {
                const imageUrl = category.image ? `http://localhost:3000/uploads/${category.image}` : 'https://placehold.co/100x100';
                const categoryCard = `
                    <div class="col-auto">
                        <a href="products.html?category_id=${category.id}" class="text-decoration-none">
                            <div class="category-card text-center">
                                <div class="category-image-container mx-auto">
                                    <img src="${imageUrl}" class="img-fluid" alt="${category.name}">
                                </div>
                                <div class="card-body p-2">
                                    <h6 class="card-title mb-0">${category.name}</h6>
                                </div>
                            </div>
                        </a>
                    </div>
                `;
                categoryContainer.innerHTML += categoryCard;
            });
        }
    }

    // Function to load product detail
    async function loadProductDetail(productId) {
        console.log(`Loading product detail for ID: ${productId}`);
        const response = await fetch(`http://localhost:3000/api/products/${productId}`);
        const data = await response.json();
        const product = data.data;
        console.log('Product detail data:', product);
        const productDetailContainer = document.querySelector('#product-detail-container');

        if (product && productDetailContainer) {
            productDetailContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                    <div id="productImageCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner">
                            ${product.image.split(',').map((img, index) => `
                                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                    <img src="http://localhost:3000/uploads/${img.trim()}" class="d-block w-100 img-fluid rounded shadow-sm" alt="${product.name} Image ${index + 1}">
                                </div>
                            `).join('')}
                        </div>
                        ${product.image.split(',').length > 1 ? `
                        <button class="carousel-control-prev" type="button" data-bs-target="#productImageCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#productImageCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
                    <div class="col-md-6">
                        <h2 class="display-5 fw-bold">${product.name}</h2>
                        <p class="lead text-muted mt-2">${product.description}</p>
                        <h3 class="text-primary fw-bold mt-4">Price: ৳${product.price.toFixed(2)}</h3>
                        
                        <h4 class="mt-4">Category:</h4>
                        <ul class="list-unstyled text-muted mt-2">
                            <li><i class="bi bi-tag-fill text-primary me-2"></i>${product.category}</li>
                        </ul>

                        <h4 class="mt-5">Book a Home Preview:</h4>
                        <p class="text-muted">See the device at your doorstep before you buy! For just ৳200, we’ll bring this ${product.name} to your home for a personal inspection. If you decide to purchase the device, the ৳200 preview fee will be fully refunded. This ensures you’re 100% satisfied before making a commitment.</p>
                        <a href="contact.html#book-preview-section" class="btn btn-primary btn-lg rounded-pill mt-3 me-3">Book a Preview (৳200)</a>
                        <a href="cart.html" class="btn btn-primary btn-lg rounded-pill mt-3"><i class="bi bi-cart-plus-fill me-2"></i>Add to Cart</a>
                    </div>
                </div>
            `;
        } else if (productDetailContainer) {
            productDetailContainer.innerHTML = '<p>Product not found.</p>';
        }
    }

    // Conditional loading based on page
    if (path.includes('products.html')) {
        loadCategories();
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category_id');
        loadProducts('#product-listing-container', null, '', categoryId);
    } else if (path.includes('product-detail.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (productId) {
            loadProductDetail(productId);
        }
    } else if (path.includes('index.html') || path === '/user/') {
        console.log('Loading index page content...');
        loadCategories(); // Load categories for the index page
        await loadProducts('#new-arrivals-container', 10, '', null, 'newest', true); // Load 10 new arrivals for the carousel
        loadProducts('#featured-products-container', 8, 'featured-product-card'); // Load 8 featured products with specific card styling
    }
});