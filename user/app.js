document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // Function to update cart count in navbar
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
        const cartIcon = document.querySelector('.bi-cart-fill');
        if (cartIcon) {
            let countElement = cartIcon.querySelector('.cart-count');
            if (!countElement) {
                countElement = document.createElement('span');
                countElement.className = 'cart-count position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary px-2 py-1 fs-9';
                cartIcon.classList.add('position-relative');
                cartIcon.appendChild(countElement);
            }
            countElement.textContent = cartCount;
            countElement.style.display = cartCount > 0 ? 'block' : 'none';
        }
    }

    // Function to add product to cart
    async function addToCart(productId, redirect = false) {
        const response = await fetch(`http://localhost:3000/api/products/${productId}`);
        const data = await response.json();
        const product = data.data;

        if (product) {
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingProduct = cart.find(item => item.id === product.id);

            if (existingProduct) {
                existingProduct.quantity++;
            } else {
                product.quantity = 1;
                cart.push(product);
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            if (redirect) {
                window.location.href = 'cart.html';
            } else {
                alert(`${product.name} has been added to your cart.`);
            }
        }
    }

    // Function to fetch and display products
    async function loadProducts(containerSelector, limit = null, cardClass = '', categoryId = null, sort = null, isCarousel = false, searchQuery = null, page = 1, showShimmer = true, condition = null) {
        const productContainer = document.querySelector(containerSelector);
        if (!productContainer) return;

        if (showShimmer) {
            productContainer.innerHTML = ''; // Clear existing content before showing shimmer
            const shimmerCount = limit || 10; // Show 10 shimmer cards by default or based on limit
            for (let i = 0; i < shimmerCount; i++) {
                const shimmerCard = `
                    <div class="col-6 col-md-3">
                        <div class="card shadow-sm h-100 ${cardClass}">
                            <div class="shimmer-wrapper">
                                <div class="shimmer-image card-img-top"></div>
                                <div class="shimmer-line shimmer-title-line"></div>
                                <div class="shimmer-line shimmer-price-line"></div>
                                <div class="shimmer-button"></div>
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
        if (condition) {
            params.append('condition', condition);
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
                    let imageUrl = 'https://placehold.co/400x300';
                    if (product.image) {
                        try {
                            const images = JSON.parse(product.image);
                            if (images && images.length > 0) {
                                imageUrl = `http://localhost:3000/uploads/${images[0].filename}`;
                            }
                        } catch (e) {
                            console.error("Error parsing product.image JSON:", e);
                        }
                    }

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
                let imageUrl = 'https://placehold.co/400x300';
                if (product.image) {
                    try {
                        const images = JSON.parse(product.image);
                        if (images && images.length > 0) {
                            imageUrl = `http://localhost:3000/uploads/${images[0].filename}`;
                        }
                    } catch (e) {
                        console.error("Error parsing product.image JSON:", e);
                    }
                }

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
            renderPagination(totalPages, currentPage, categoryId, sort, searchQuery, condition); // Call renderPagination here
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

                    const params = new URLSearchParams(window.location.search);
                    if (categoryId === 'all') {
                        params.delete('category_id');
                    } else {
                        params.set('category_id', categoryId);
                    }
                    params.set('page', 1);
                    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

                    const sortOption = params.get('sort');
                    const conditionOption = params.get('condition');
                    const searchQuery = params.get('search');

                    loadProducts('#product-listing-container', null, '', categoryId, sortOption, false, searchQuery, 1, true, conditionOption);
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
    function renderPagination(totalPages, currentPage, categoryId, sort, searchQuery, condition) {
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
                    loadProducts('#product-listing-container', null, '', categoryId, sort, false, searchQuery, newPage, true, condition);
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

            const colors = product.colors ? product.colors.split(',').map(color => color.trim()) : [];

            const buyButtonText = product.condition === 'Used' ? 'Book a preview(৳200)' : 'Buy Now';

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

                            ${colors.length > 0 ? `
                            <div class="mt-4">
                                <h4 class="mb-3">Color:</h4>
                                <div class="product-color-selector d-flex gap-2">
                                    ${colors.map(color => `<div class="color-swatch" style="background-color: ${color};" data-color="${color}"></div>`).join('')}
                                </div>
                            </div>
                            ` : ''}

                            <div class="d-flex mt-4">
                                <button class="btn btn-primary btn-lg rounded-pill" id="buy-now-btn">${buyButtonText}</button>
                                <button class="btn btn-outline-primary btn-lg rounded-pill ms-3" id="add-to-cart-btn"><i class="bi bi-cart-plus-fill me-2"></i>Add to Cart</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('add-to-cart-btn').addEventListener('click', () => {
                addToCart(product.id);
            });

            document.getElementById('buy-now-btn').addEventListener('click', () => {
                addToCart(product.id, true); // Pass true to redirect
            });

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
        try {
            const response = await fetch('http://localhost:3000/api/banners');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const banners = data.data;

            const bannerCarouselInner = document.querySelector('#banner-carousel-inner');
            if (!bannerCarouselInner) return;

            bannerCarouselInner.innerHTML = ''; // Clear existing content

            if (banners && banners.length > 0) {
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
            } else {
                bannerCarouselInner.innerHTML = '<div class="carousel-item active"><p class="text-center">No promotional banners available.</p></div>';
            }
        } catch (error) {
            console.error("Could not load banners:", error);
            const bannerCarouselInner = document.querySelector('#banner-carousel-inner');
            if (bannerCarouselInner) {
                bannerCarouselInner.innerHTML = '<div class="carousel-item active"><p class="text-center">Could not load banners.</p></div>';
            }
        }
    }

    // Conditional loading based on page
    if (path.includes('products.html')) {
        loadCategories();
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category_id');
        const sortOption = urlParams.get('sort');
        const conditionOption = urlParams.get('condition');
        const searchQuery = urlParams.get('search');
        const page = parseInt(urlParams.get('page')) || 1;
        loadProducts('#product-listing-container', null, '', categoryId, sortOption, false, searchQuery, page, true, conditionOption); // Show shimmer on products page

        // Add event listeners to filter dropdown items
        document.querySelectorAll('#dropdownFilter + .dropdown-menu .dropdown-item').forEach(item => {
            item.addEventListener('click', function(event) {
                event.preventDefault();
                const sortOption = this.dataset.sort;
                const conditionOption = this.dataset.condition;
                const currentCategoryId = document.querySelector('#category-filter-container .active').dataset.categoryId;
                
                const params = new URLSearchParams(window.location.search);
                if (sortOption) {
                    params.set('sort', sortOption);
                } else {
                    params.delete('sort');
                }
                if (conditionOption) {
                    params.set('condition', conditionOption);
                } else {
                    params.delete('condition');
                }
                params.set('page', 1);
                window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

                loadProducts('#product-listing-container', null, '', currentCategoryId, sortOption, false, null, 1, true, conditionOption);
            });
        });
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
    } else if (path.includes('login.html')) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const identifier = document.getElementById('loginEmailPhone').value;
                const password = document.getElementById('loginPassword').value;
                const loginMessage = document.getElementById('loginMessage');

                try {
                    const response = await fetch('http://localhost:3000/api/user/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ identifier, password })
                    });
                    const data = await response.json();

                    if (response.ok) {
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('userData', JSON.stringify(data.user));
                        window.location.href = 'index.html'; // Redirect to home or previous page
                    } else {
                        loginMessage.textContent = data.error || 'Login failed';
                        loginMessage.style.color = 'red';
                    }
                } catch (error) {
                    console.error('Error during login:', error);
                    loginMessage.textContent = 'An error occurred during login.';
                    loginMessage.style.color = 'red';
                }
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const name = document.getElementById('registerName').value;
                const phone = document.getElementById('registerPhone').value;
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
                const registerMessage = document.getElementById('registerMessage');

                try {
                    const response = await fetch('http://localhost:3000/api/user/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name, phone, email, password })
                    });
                    const data = await response.json();

                    if (response.ok) {
                        registerMessage.textContent = data.message || 'Registration successful!';
                        registerMessage.style.color = 'green';
                        registerForm.reset();
                        // Optionally switch to login tab
                        const loginTab = new bootstrap.Tab(document.getElementById('login-tab'));
                        loginTab.show();
                    } else {
                        registerMessage.textContent = data.error || 'Registration failed';
                        registerMessage.style.color = 'red';
                    }
                } catch (error) {
                    console.error('Error during registration:', error);
                    registerMessage.textContent = 'An error occurred during registration.';
                    registerMessage.style.color = 'red';
                }
            });
        }
    } else if (path.includes('book-preview.html')) {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userData = JSON.parse(localStorage.getItem('userData'));

        if (isLoggedIn !== 'true' || !userData) {
            window.location.href = 'login.html'; // Redirect to login if not logged in
            return;
        }

        document.getElementById('userName').value = userData.name || '';
        document.getElementById('userPhone').value = userData.phone || '';

        // Display used products from cart
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const usedProducts = cart.filter(item => item.condition === 'Used');
        const previewProductsList = document.getElementById('preview-products-list');

        if (previewProductsList) {
            if (usedProducts.length > 0) {
                let productsHtml = '';
                usedProducts.forEach(product => {
                    const imageUrl = product.image ? `http://localhost:3000/uploads/${product.image.split(',')[0].trim()}` : 'https://placehold.co/100x100';
                    productsHtml += `
                        <div class="d-flex align-items-center mb-2">
                            <img src="${imageUrl}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px; border-radius: 5px;">
                            <div>
                                <h6 class="mb-0">${product.name}</h6>
                                <p class="text-muted mb-0">Price: ৳${product.price.toFixed(2)}</p>
                            </div>
                        </div>
                    `;
                });
                previewProductsList.innerHTML = productsHtml;
            } else {
                previewProductsList.innerHTML = '<p>No used products selected for preview.</p>';
            }
        }

        const previewBookingForm = document.getElementById('previewBookingForm');
        if (previewBookingForm) {
            previewBookingForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                // Here you would collect form data and send it to a backend API
                // For now, just log it and show a success message
                const bookingData = {
                    userName: document.getElementById('userName').value,
                    userPhone: document.getElementById('userPhone').value,
                    previewLocation: document.getElementById('previewLocation').value,
                    previewDate: document.getElementById('previewDate').value,
                    bkashTrxId: document.getElementById('bkashTrxId').value,
                    products: usedProducts.map(p => ({ id: p.id, name: p.name }))
                };
                console.log('Booking Data:', bookingData);

                // Show confirmation modal
                const bookingConfirmationModal = new bootstrap.Modal(document.getElementById('bookingConfirmationModal'));
                bookingConfirmationModal.show();

                // Clear cart after successful booking (optional, depending on flow)
                localStorage.removeItem('cart');
                updateCartCount();

                // Optionally redirect or clear form
                previewBookingForm.reset();
            });
        }

        // Event listener for Home button in confirmation modal
        const homeBtn = document.getElementById('homeBtn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Event listener for Cancel button
        const cancelBookingBtn = document.getElementById('cancelBookingBtn');
        if (cancelBookingBtn) {
            cancelBookingBtn.addEventListener('click', () => {
                window.history.back(); // Go back to the previous page (cart page)
            });
        }
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

    // Initial cart count update
    updateCartCount();
    updateUserMenu(); // Update user menu on page load

    // Function to update user menu in navbar
    function updateUserMenu() {
        const userMenu = document.getElementById('user-menu');
        if (!userMenu) return;

        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userData = JSON.parse(localStorage.getItem('userData'));

        userMenu.innerHTML = ''; // Clear existing menu items

        if (isLoggedIn === 'true' && userData) {
            userMenu.innerHTML = `
                <li><a class="dropdown-item" href="#">Hi, ${userData.name}</a></li>
                <li><a class="dropdown-item" href="my-orders.html">My Orders</a></li>
                <li><a class="dropdown-item" href="#">My Account</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" id="logout-btn">Logout</a></li>
            `;
            document.getElementById('logout-btn').addEventListener('click', logoutUser);
        } else {
            userMenu.innerHTML = `
                <li><a class="dropdown-item" href="login.html">Login / Register</a></li>
            `;
        }
    }

    // Function to log out the user
    function logoutUser() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        updateUserMenu(); // Refresh the menu
        window.location.href = 'index.html'; // Redirect to home page
    }

    // Function to load user orders
    async function loadUserOrders() {
        const ordersContainer = document.getElementById('orders-container');
        if (!ordersContainer) return;

        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userData = JSON.parse(localStorage.getItem('userData'));

        if (isLoggedIn !== 'true' || !userData) {
            ordersContainer.innerHTML = '<p>Please <a href="login.html">login</a> to view your orders.</p>';
            return;
        }

        const response = await fetch(`http://localhost:3000/api/orders?user_phone=${userData.phone}`);
        const data = await response.json();

        if (data.data.length === 0) {
            ordersContainer.innerHTML = '<p>You have no orders yet.</p>';
        } else {
            let ordersHtml = '';
            data.data.forEach(order => {
                ordersHtml += `
                    <div class="card mb-3 shadow-sm">
                        <div class="card-header d-flex justify-content-between">
                            <span>Order ID: ${order.id}</span>
                            <span>Date: ${new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="card-body">
                            <p><strong>Status:</strong> ${order.status}</p>
                            <p><strong>Total:</strong> ৳${order.total.toFixed(2)}</p>
                            <p><strong>Products:</strong> ${order.products}</p>
                        </div>
                    </div>
                `;
            });
            ordersContainer.innerHTML = ordersHtml;
        }
    }

    // Function to load the book preview page
    function loadPreviewPage() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userData = JSON.parse(localStorage.getItem('userData'));

        if (isLoggedIn !== 'true' || !userData) {
            window.location.href = 'login.html';
            return;
        }

        document.getElementById('userName').value = userData.name || '';
        document.getElementById('userPhone').value = userData.phone || '';

        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const usedProducts = cart.filter(item => item.condition === 'Used');
        const previewProductsList = document.getElementById('preview-products-list');

        if (previewProductsList) {
            if (usedProducts.length > 0) {
                let productsHtml = '';
                usedProducts.forEach(product => {
                    productsHtml += `<p>${product.name} - ৳${product.price.toFixed(2)}</p>`;
                });
                previewProductsList.innerHTML = productsHtml;
            } else {
                previewProductsList.innerHTML = '<p>No used products in your cart.</p>';
            }
        }

        const bookPreviewForm = document.getElementById('book-preview-form');
        if (bookPreviewForm) {
            bookPreviewForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const previewRequest = {
                    userName: document.getElementById('userName').value,
                    userPhone: document.getElementById('userPhone').value,
                    previewAddress: document.getElementById('previewAddress').value,
                    scheduleDate: document.getElementById('scheduleDate').value,
                    products: usedProducts
                };

                const response = await fetch('http://localhost:3000/api/previews', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(previewRequest)
                });

                if (response.ok) {
                    alert('Preview request submitted successfully!');
                    localStorage.setItem('cart', JSON.stringify(cart.filter(item => item.condition !== 'Used')));
                    window.location.href = 'index.html';
                } else {
                    alert('Failed to submit preview request.');
                }
            });
        }
    }

    // Function to render cart items
    function renderCartItems() {
        const cartContainer = document.getElementById('cart-items-container');
        if (!cartContainer) return;

        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        let total = 0;
        let cartHtml = '';

        if (cart.length === 0) {
            cartContainer.innerHTML = '<p>Your cart is empty.</p>';
        } else {
            cart.forEach(product => {
                const imageUrl = product.image ? `http://localhost:3000/uploads/${product.image.split(',')[0].trim()}` : 'https://placehold.co/200x150';
                total += product.price * product.quantity;
                cartHtml += `
                    <div class="card mb-3 shadow-sm">
                        <div class="row g-0">
                            <div class="col-md-3">
                                <img src="${imageUrl}" class="img-fluid rounded-start" alt="${product.name}">
                            </div>
                            <div class="col-md-9">
                                <div class="card-body">
                                    <h5 class="card-title">${product.name}</h5>
                                    <p class="card-text text-muted">${product.description}</p>
                                    <p class="card-text fw-bold">৳${product.price.toFixed(2)}</p>
                                    <div class="d-flex align-items-center">
                                        <button class="btn btn-outline-primary btn-sm" type="button" onclick="updateQuantity(${product.id}, -1)">-</button>
                                        <input type="text" class="form-control form-control-sm text-center mx-2" value="${product.quantity}" style="width: 50px;" readonly>
                                        <button class="btn btn-outline-primary btn-sm" type="button" onclick="updateQuantity(${product.id}, 1)">+</button>
                                        <button class="btn btn-danger btn-sm ms-auto" type="button" onclick="removeFromCart(${product.id})"><i class="bi bi-trash"></i> Remove</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            cartContainer.innerHTML = cartHtml;
        }

        document.getElementById('cart-total-amount').textContent = total.toFixed(2);

        const hasUsedProduct = cart.some(item => item.condition === 'Used');
        const requestPreviewBtn = document.getElementById('request-preview-btn');
        if (requestPreviewBtn) {
            if (hasUsedProduct) {
                requestPreviewBtn.style.display = 'inline-block';
                requestPreviewBtn.addEventListener('click', () => {
                    const previewModal = new bootstrap.Modal(document.getElementById('previewConfirmationModal'));
                    previewModal.show();
                });
            } else {
                requestPreviewBtn.style.display = 'none';
            }
        }
    }

    if (path.includes('cart.html')) {
        renderCartItems();

        document.getElementById('proceed-to-checkout-btn').addEventListener('click', (event) => {
            event.preventDefault();
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            if (isLoggedIn === 'true') {
                window.location.href = 'payment.html';
            } else {
                const loginModal = new bootstrap.Modal(document.getElementById('loginRegisterModal'));
                loginModal.show();
            }
        });
    } else if (path.includes('my-orders.html')) {
        loadUserOrders();
    } else if (path.includes('book-preview.html')) {
        loadPreviewPage();
    }
});