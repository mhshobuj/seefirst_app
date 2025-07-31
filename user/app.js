document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // Function to fetch and display products
    async function loadProducts(containerSelector, limit = null, cardClass = '', categoryId = null, sort = null, isCarousel = false, searchQuery = null, page = 1, showShimmer = false) {
        const productContainer = document.querySelector(containerSelector);
        if (!productContainer) return;

        if (showShimmer) {
            productContainer.innerHTML = ''; // Clear existing content before showing shimmer
            const shimmerCount = limit || 8; // Show 8 shimmer cards by default or based on limit
            for (let i = 0; i < shimmerCount; i++) {
                const shimmerCard = `
                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm h-100 ${cardClass}">
                            <div class="shimmer-wrapper">
                                <div class="shimmer-image card-img-top"></div>
                                <div class="card-body p-2">
                                    <div class="shimmer-line shimmer-title-line"></div>
                                    <div class="shimmer-line shimmer-price-line"></div>
                                    <div class="shimmer-button"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                productContainer.innerHTML += shimmerCard;
            }
        } else {
            productContainer.innerHTML = ''; // Clear existing content if not showing shimmer
        }

        let apiUrl = 'http://localhost:3000/api/products';
        const params = new URLSearchParams();
        if (categoryId && categoryId !== 'all') {
            params.append('category_id', categoryId);
        }
        if (sort) {
            params.append('sort', sort);
        }
        if (searchQuery) {
            params.append('search', searchQuery);
        }
        params.append('page', page);

        if (params.toString()) {
            apiUrl += `?${params.toString()}`;
        }

        // Add a small delay to make shimmer visible for testing
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

        const response = await fetch(apiUrl);
        const data = await response.json();
        const products = limit ? data.data.slice(0, limit) : data.data;
        const totalPages = data.total_pages;
        const currentPage = data.current_page;

        productContainer.innerHTML = ''; // Clear shimmer or previous content

        if (products.length === 0) {
            productContainer.innerHTML = '<div class="col-12 text-center py-5"><p class="lead">No products found matching your criteria.</p></div>';
            renderPagination(0, 0, categoryId, sort, searchQuery); // Hide pagination if no products
            return;
        }

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

    // Function to render pagination
    function renderPagination(totalPages, currentPage, categoryId, sort, searchQuery) {
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
                        <i class="bi bi-chevron-left"></i>
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
                        <i class="bi bi-chevron-right"></i>
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
                    loadProducts('#product-listing-container', null, '', categoryId, sort, false, searchQuery, newPage);
                }
            });
        });
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
            const images = product.image ? product.image.split(',').map(img => img.trim()) : [];
            const mainImage = images.length > 0 ? `http://localhost:3000/uploads/${images[0]}` : 'https://placehold.co/600x400';

            productDetailContainer.innerHTML = `
                <div class="row">
                    <div class="col-lg-6">
                        <div class="product-gallery">
                            <div class="main-image-container mb-3">
                                <img src="${mainImage}" id="mainProductImage" class="img-fluid rounded shadow-sm w-100" alt="${product.name}">
                            </div>
                            <div class="thumbnail-container d-flex gap-2">
                                ${images.map(img => `
                                    <img src="http://localhost:3000/uploads/${img}" class="img-thumbnail product-thumbnail" alt="Thumbnail">
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="product-details-info">
                            <h2 class="display-5 fw-bold">${product.name}</h2>
                            <p class="lead text-muted mt-2">${product.description}</p>
                            <h3 class="text-primary fw-bold mt-4">Price: ৳${product.price.toFixed(2)}</h3>

                            <div class="mt-4">
                                <h4 class="mb-3">Color:</h4>
                                <div class="product-color-selector d-flex gap-2">
                                    <div class="color-swatch" style="background-color: #000000;" data-color="Black"></div>
                                    <div class="color-swatch" style="background-color: #FFFFFF; border: 1px solid #dee2e6;" data-color="White"></div>
                                    <div class="color-swatch" style="background-color: #007bff;" data-color="Blue"></div>
                                    <div class="color-swatch" style="background-color: #dc3545;" data-color="Red"></div>
                                </div>
                            </div>

                            <h4 class="mt-5">Book a Home Preview:</h4>
                            <p class="text-muted">See the device at your doorstep before you buy! For just ৳200, we’ll bring this ${product.name} to your home for a personal inspection. If you decide to purchase the device, the ৳200 preview fee will be fully refunded. This ensures you’re 100% satisfied before making a commitment.</p>
                            <div class="d-flex mt-4">
                                <a href="contact.html#book-preview-section" class="btn btn-outline-primary btn-lg rounded-pill me-3">Book a Preview (৳200)</a>
                                <a href="cart.html" class="btn btn-primary btn-lg rounded-pill"><i class="bi bi-cart-plus-fill me-2"></i>Add to Cart</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners after setting innerHTML
            document.querySelectorAll('.product-thumbnail').forEach(thumbnail => {
                thumbnail.addEventListener('click', function() {
                    document.getElementById('mainProductImage').src = this.src;
                    document.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            document.querySelectorAll('.color-swatch').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.color-swatch').forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                });
            });

        } else if (productDetailContainer) {
            productDetailContainer.innerHTML = '<p>Product not found.</p>';
        }
    }

    // Function to load and display banners
    async function loadBanners() {
        console.log('Loading banners...');
        const response = await fetch('http://localhost:3000/api/banners');
        const data = await response.json();
        const banners = data.data;

        const bannerCarouselInner = document.querySelector('#banner-carousel-inner');
        if (!bannerCarouselInner) return;

        bannerCarouselInner.innerHTML = ''; // Clear existing content

        if (banners.length === 0) {
            bannerCarouselInner.innerHTML = '<div class="carousel-item active"><p class="text-center">No promotional banners available.</p></div>';
            return;
        }

        banners.forEach((banner, index) => {
            const bannerItem = document.createElement('div');
            bannerItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            bannerItem.innerHTML = `
                <img src="http://localhost:3000/uploads/${banner.image}" class="d-block w-100 rounded shadow-sm" alt="Promotional Banner ${index + 1}">
            `;
            bannerCarouselInner.appendChild(bannerItem);
            console.log(`Added banner ${index + 1}: ${banner.image}`);
        });

        console.log(`Total banners added to DOM: ${banners.length}`);

        // Initialize Bootstrap Carousel AFTER all items are added
        const myCarouselElement = document.querySelector('#promotionalBannerCarousel');
        if (myCarouselElement) {
            const carousel = new bootstrap.Carousel(myCarouselElement, {
                interval: 3000, // Change image every 3 seconds
                ride: 'carousel'
            });
            carousel.cycle(); // Explicitly start cycling
        }
    }

    // Conditional loading based on page
    if (path.includes('products.html')) {
        loadCategories();
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category_id');
        const sortOption = urlParams.get('sort');
        const searchQuery = urlParams.get('search');
        const page = parseInt(urlParams.get('page')) || 1;
        loadProducts('#product-listing-container', null, '', categoryId, sortOption, false, searchQuery, page, true); // Show shimmer on products page
    } else if (path.includes('product-detail.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (productId) {
            loadProductDetail(productId);
        }
    } else if (path.includes('index.html') || path === '/user/') {
        console.log('Loading index page content...');
        loadCategories(); // Load categories for the index page
        loadBanners(); // Load banners for the index page
        await loadProducts('#new-arrivals-container', 10, '', null, 'newest', true, null, 1, false); // Do not show shimmer for new arrivals
        loadProducts('#featured-products-container', 8, 'featured-product-card', null, null, false, null, 1, false); // Do not show shimmer for featured products
    }

    // Handle search form submission
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `products.html?search=${encodeURIComponent(query)}`;
            }
        });
    }
});