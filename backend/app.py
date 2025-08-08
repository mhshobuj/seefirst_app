import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from PIL import Image # Import Pillow

app = Flask(__name__)
CORS(app)

DATABASE = 'seefirst.db'
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create the upload folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Serve static files from the uploads folder
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def resize_image(image_path, output_path, size=(600, 400), quality=85):
    with Image.open(image_path) as img:
        img = img.resize(size, Image.LANCZOS)
        # Save as JPEG for better compression, unless it's a PNG with transparency
        if img.mode in ('RGBA', 'P') and 'A' in img.getbands():
            img.save(output_path, optimize=True)
        else:
            img.convert('RGB').save(output_path, 'jpeg', quality=quality, optimize=True)

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with app.app_context():
        db = get_db_connection()
        db.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                offer_price REAL,
                image TEXT,
                category TEXT,
                colors TEXT,
                condition TEXT,
                product_code TEXT,
                quantity INTEGER
            )
        ''')
        # Add new columns if they don't exist
        try:
            db.execute("ALTER TABLE products ADD COLUMN offer_price REAL");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN colors TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN condition TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN product_code TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN quantity INTEGER");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise

        db.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                image TEXT
            )
        """)
        # Add image column if it doesn't exist (for existing databases)
        try:
            db.execute("ALTER TABLE categories ADD COLUMN image TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
        db.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                customer_name TEXT,
                customer_phone TEXT,
                status TEXT DEFAULT 'pending',
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS banners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image TEXT NOT NULL
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                email TEXT UNIQUE,
                password TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        try:
            db.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e):
                raise
        db.execute('''
            CREATE TABLE IF NOT EXISTS new_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                delivery_address TEXT NOT NULL,
                delivery_location TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                bkash_trx_id TEXT,
                subtotal REAL NOT NULL,
                delivery_charge REAL NOT NULL,
                total REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES new_orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS previews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_name TEXT NOT NULL,
                user_phone TEXT NOT NULL,
                preview_address TEXT NOT NULL,
                schedule_date TEXT NOT NULL,
                products TEXT NOT NULL,
                status TEXT DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()

        # Dummy data for delivered orders (for chart visualization)
        # Ensure these dates are within a reasonable range for testing
        dummy_orders = [
            ('John Doe', '1234567890', '123 Main St', 'inside_dhaka', 'cod', None, 100.0, 80.0, 180.0, 'Delivered', '2024-01-15 10:00:00'),
            ('Jane Smith', '0987654321', '456 Oak Ave', 'outside_dhaka', 'bkash', 'TRX123', 250.0, 150.0, 400.0, 'Delivered', '2024-01-20 11:30:00'),
            ('John Doe', '1234567890', '123 Main St', 'inside_dhaka', 'cod', None, 50.0, 80.0, 130.0, 'Delivered', '2024-02-01 14:00:00'),
            ('Peter Jones', '1122334455', '789 Pine Rd', 'inside_dhaka', 'cod', None, 300.0, 80.0, 380.0, 'Delivered', '2024-02-25 09:00:00'),
            ('Jane Smith', '0987654321', '456 Oak Ave', 'outside_dhaka', 'cod', None, 120.0, 150.0, 270.0, 'Delivered', '2024-03-10 16:00:00'),
            ('Alice Brown', '5566778899', '101 Elm St', 'inside_dhaka', 'bkash', 'TRX456', 80.0, 80.0, 160.0, 'Delivered', '2024-03-05 13:00:00'),
            ('John Doe', '1234567890', '123 Main St', 'inside_dhaka', 'cod', None, 150.0, 80.0, 230.0, 'Delivered', '2024-04-01 10:00:00'),
            ('Jane Smith', '0987654321', '456 Oak Ave', 'outside_dhaka', 'cod', None, 200.0, 150.0, 350.0, 'Delivered', '2024-04-15 11:30:00'),
            ('Peter Jones', '1122334455', '789 Pine Rd', 'inside_dhaka', 'cod', None, 100.0, 80.0, 180.0, 'Delivered', '2024-05-01 14:00:00'),
            ('Alice Brown', '5566778899', '101 Elm St', 'inside_dhaka', 'bkash', 'TRX789', 220.0, 80.0, 300.0, 'Delivered', '2024-05-20 09:00:00'),
            ('John Doe', '1234567890', '123 Main St', 'inside_dhaka', 'cod', None, 90.0, 80.0, 170.0, 'Delivered', '2024-06-01 16:00:00'),
            ('Jane Smith', '0987654321', '456 Oak Ave', 'outside_dhaka', 'cod', None, 180.0, 150.0, 330.0, 'Delivered', '2024-06-10 13:00:00'),
            ('Peter Jones', '1122334455', '789 Pine Rd', 'inside_dhaka', 'cod', None, 250.0, 80.0, 330.0, 'Delivered', '2024-07-01 10:00:00'),
            ('Alice Brown', '5566778899', '101 Elm St', 'inside_dhaka', 'bkash', 'TRX101', 130.0, 80.0, 210.0, 'Delivered', '2024-07-15 11:30:00'),
            ('John Doe', '1234567890', '123 Main St', 'inside_dhaka', 'cod', None, 110.0, 80.0, 190.0, 'Delivered', '2024-08-01 14:00:00'),
            ('Jane Smith', '0987654321', '456 Oak Ave', 'outside_dhaka', 'cod', None, 280.0, 150.0, 430.0, 'Delivered', '2024-08-05 09:00:00'),
        ]
        for order in dummy_orders:
            try:
                db.execute('INSERT INTO new_orders (customer_name, customer_phone, delivery_address, delivery_location, payment_method, bkash_trx_id, subtotal, delivery_charge, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', order)
            except sqlite3.IntegrityError:
                pass # Skip if order already exists

        # Dummy data for previews (for chart visualization)
        dummy_previews = [
            ('John Doe', '1234567890', '123 Main St', '2024-01-18', 'Product A', 'Pending', '2024-01-10 10:00:00'),
            ('Jane Smith', '0987654321', '456 Oak Ave', '2024-02-05', 'Product B', 'Confirmed', '2024-02-01 11:30:00'),
            ('Peter Jones', '1122334455', '789 Pine Rd', '2024-02-28', 'Product C', 'Pending', '2024-02-20 14:00:00'),
            ('Alice Brown', '5566778899', '101 Elm St', '2024-03-10', 'Product D', 'Completed', '2024-03-01 09:00:00'),
            ('John Doe', '1234567890', '123 Main St', '2024-04-05', 'Product E', 'Pending', '2024-04-01 16:00:00'),
            ('Jane Smith', '0987654321', '456 Oak Ave', '2024-05-15', 'Product F', 'Confirmed', '2024-05-10 13:00:00'),
            ('Peter Jones', '1122334455', '789 Pine Rd', '2024-06-05', 'Product G', 'Pending', '2024-06-01 10:00:00'),
            ('Alice Brown', '5566778899', '101 Elm St', '2024-07-20', 'Product H', 'Completed', '2024-07-10 11:30:00'),
            ('John Doe', '1234567890', '123 Main St', '2024-08-10', 'Product I', 'Pending', '2024-08-01 14:00:00'),
        ]
        for preview in dummy_previews:
            try:
                db.execute('INSERT INTO previews (user_name, user_phone, preview_address, schedule_date, products, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', preview)
            except sqlite3.IntegrityError:
                pass # Skip if preview already exists

        db.close()

# Initialize the database when the app starts
init_db()

# API Endpoints

# Products
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    category_id = request.args.get('category_id')
    sort_option = request.args.get('sort')
    search_query = request.args.get('search')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    query = 'SELECT * FROM products'
    count_query = 'SELECT COUNT(*) FROM products'
    params = []
    where_clauses = []

    if category_id and category_id != 'all':
        category_row = conn.execute('SELECT name FROM categories WHERE id = ?', (category_id,)).fetchone()
        if category_row:
            category_name = category_row['name']
            where_clauses.append('category = ?')
            params.append(category_name)
        else:
            conn.close()
            return jsonify({"message": "success", "data": [], "total_pages": 0, "current_page": page})

    if search_query:
        search_pattern = '%' + search_query + '%'
        where_clauses.append('(name LIKE ? OR description LIKE ?)')
        params.append(search_pattern)
        params.append(search_pattern)

    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
        count_query += ' WHERE ' + ' AND '.join(where_clauses)

    # Default sort order
    order_by_clause = ' ORDER BY id DESC'

    if sort_option == 'price_asc':
        order_by_clause = ' ORDER BY price ASC'
    elif sort_option == 'price_desc':
        order_by_clause = ' ORDER BY price DESC'
    
    query += order_by_clause

    # Get total count for pagination
    total_products = conn.execute(count_query, params).fetchone()[0]
    total_pages = (total_products + per_page - 1) // per_page

    # Add LIMIT and OFFSET for pagination
    query += ' LIMIT ? OFFSET ?'
    params.append(per_page)
    params.append((page - 1) * per_page)

    products = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in products], "total_pages": total_pages, "current_page": page, "total_products": total_products})

@app.route('/api/products', methods=['POST'])
def add_product():
    name = request.form['name']
    description = request.form.get('description')
    price = float(request.form['price'])
    offer_price = float(request.form.get('offer_price', 0.0))
    category = request.form.get('category')
    colors = request.form.get('colors')
    condition = request.form.get('condition')
    quantity = int(request.form.get('quantity', 0))
    product_code = str(uuid.uuid4())

    image_filenames = []
    if 'images' in request.files:
        files = request.files.getlist('images')
        if len(files) > 5:
            return jsonify({"error": "Maximum 5 images allowed"}), 400
        for file in files:
            if file.filename != '':
                filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1] # Generate unique filename
                temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
                file.save(temp_path)
                resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
                os.remove(temp_path) # Remove temporary file
                image_filenames.append(filename)
    image_paths = ', '.join(image_filenames) # Store as comma-separated string

    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO products (name, description, price, offer_price, image, category, colors, condition, product_code, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (name, description, price, offer_price, image_paths, category, colors, condition, product_code, quantity))
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()
    return jsonify({"message": "success", "data": {'id': product_id, 'name': name, 'description': description, 'price': price, 'offer_price': offer_price, 'image': image_paths, 'category': category, 'colors': colors, 'condition': condition, 'product_code': product_code, 'quantity': quantity}}), 201

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    conn.close()
    if product:
        return jsonify({"message": "success", "data": dict(product)})
    return jsonify({"error": "Product not found"}), 404

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    name = request.form['name']
    description = request.form.get('description')
    price = float(request.form['price'])
    offer_price = float(request.form.get('offer_price', 0.0))
    category = request.form.get('category')
    colors = request.form.get('colors')
    condition = request.form.get('condition')

    image_filenames = []
    if 'images' in request.files:
        files = request.files.getlist('images')
        if len(files) > 5:
            return jsonify({"error": "Maximum 5 images allowed"}), 400
        for file in files:
            if file.filename != '':
                filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
                temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
                file.save(temp_path)
                resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
                os.remove(temp_path)
                image_filenames.append(filename)
    
    # If new images are uploaded, update the image paths
    if image_filenames:
        image_paths = ', '.join(image_filenames)
        conn = get_db_connection()
        conn.execute('UPDATE products SET name = ?, description = ?, price = ?, offer_price = ?, image = ?, category = ?, colors = ?, condition = ? WHERE id = ?', (name, description, price, offer_price, image_paths, category, colors, condition, product_id))
        conn.commit()
        conn.close()
    else:
        # If no new images, update other fields without changing the image path
        conn = get_db_connection()
        conn.execute('UPDATE products SET name = ?, description = ?, price = ?, offer_price = ?, category = ?, colors = ?, condition = ? WHERE id = ?', (name, description, price, offer_price, category, colors, condition, product_id))
        conn.commit()
        conn.close()
    return jsonify({"message": "success", "changes": 1})

    conn.close()
    return jsonify({"message": "deleted", "changes": 1})

# Dashboard Analytics
@app.route('/api/dashboard/sales', methods=['GET'])
def get_total_sales():
    conn = get_db_connection()
    total_sales = conn.execute("SELECT SUM(total) FROM new_orders WHERE status = 'Delivered'").fetchone()[0]
    conn.close()
    return jsonify({"total_sales": total_sales or 0})

@app.route('/api/dashboard/previews/count', methods=['GET'])
def get_preview_count():
    conn = get_db_connection()
    preview_count = conn.execute('SELECT COUNT(*) FROM previews').fetchone()[0]
    conn.close()
    return jsonify({"preview_count": preview_count or 0})

@app.route('/api/dashboard/monthly_sales', methods=['GET'])
def get_monthly_sales():
    conn = get_db_connection()
    # This query groups sales by month and year for delivered orders
    monthly_sales = conn.execute("SELECT STRFTIME('%Y-%m', created_at) as month, SUM(total) as total_amount FROM new_orders WHERE status = 'Delivered' GROUP BY month ORDER BY month").fetchall()
    conn.close()
    return jsonify({"data": [dict(row) for row in monthly_sales]})

@app.route('/api/dashboard/monthly_previews', methods=['GET'])
def get_monthly_previews():
    conn = get_db_connection()
    # This query groups previews by month and year
    monthly_previews = conn.execute("SELECT STRFTIME('%Y-%m', created_at) as month, COUNT(*) as total_previews FROM previews GROUP BY month ORDER BY month").fetchall()
    conn.close()
    return jsonify({"data": [dict(row) for row in monthly_previews]})

# Categories
@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    categories = conn.execute('SELECT * FROM categories').fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in categories]})

@app.route('/api/categories', methods=['POST'])
def add_category():
    name = request.form['name']
    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            image_filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + image_filename)
            file.save(temp_path)
            resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], image_filename))
            os.remove(temp_path)

    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO categories (name, image) VALUES (?, ?)', (name, image_filename))
    conn.commit()
    category_id = cursor.lastrowid
    conn.close()
    return jsonify({"message": "success", "data": {'id': category_id, 'name': name, 'image': image_filename}}), 201

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    name = request.form['name']
    image_filename = None

    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            image_filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + image_filename)
            file.save(temp_path)
            resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], image_filename))
            os.remove(temp_path)

    conn = get_db_connection()
    if image_filename:
        conn.execute('UPDATE categories SET name = ?, image = ? WHERE id = ?', (name, image_filename, category_id))
    else:
        conn.execute('UPDATE categories SET name = ? WHERE id = ?', (name, category_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "success", "changes": 1})

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    conn = get_db_connection()
    category = conn.execute('SELECT image FROM categories WHERE id = ?', (category_id,)).fetchone()
    if category and category['image']:
        image_filename = category['image']
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError as e:
                print(f"Error deleting category image {filepath}: {e}")

    conn.execute('DELETE FROM categories WHERE id = ?', (category_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "deleted", "changes": 1})

@app.route('/api/orders', methods=['GET'])
def get_orders():
    user_phone = request.args.get('user_phone')
    conn = get_db_connection()
    if user_phone:
        orders = conn.execute('SELECT o.*, GROUP_CONCAT(p.name || " (x" || i.quantity || ")", "; ") as products FROM new_orders o JOIN order_items i ON o.id = i.order_id JOIN products p ON i.product_id = p.id WHERE o.customer_phone = ? GROUP BY o.id', (user_phone,)).fetchall()
    else:
        orders = conn.execute('SELECT o.*, GROUP_CONCAT(p.name || " (x" || i.quantity || ")", "; ") as products FROM new_orders o JOIN order_items i ON o.id = i.order_id JOIN products p ON i.product_id = p.id GROUP BY o.id').fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in orders]})

@app.route('/api/orders', methods=['POST'])
def add_order():
    new_order = request.json
    product_id = new_order['product_id']
    quantity = new_order['quantity']
    customer_name = new_order.get('customer_name')
    customer_phone = new_order.get('customer_phone')

    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO orders (product_id, quantity, customer_name, customer_phone) VALUES (?, ?, ?, ?)', (product_id, quantity, customer_name, customer_phone))
    conn.commit()
    order_id = cursor.lastrowid
    conn.close()
    return jsonify({"message": "success", "data": {'id': order_id, 'product_id': product_id, 'quantity': quantity, 'customer_name': customer_name, 'customer_phone': customer_phone}}), 201

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order_status(order_id):
    updated_order = request.json
    status = updated_order['status']

    conn = get_db_connection()
    conn.execute('UPDATE new_orders SET status = ? WHERE id = ?', (status, order_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "success", "changes": 1})

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    # Static credentials for demonstration purposes
    if email == 'admin@gmail.com' and password == '12345678':
        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/user/register', methods=['POST'])
def user_register():
    data = request.json
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')

    if not name or not phone or not password:
        return jsonify({"error": "Name, phone, and password are required"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.execute('INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)', (name, phone, email, password))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "User registered successfully", "user_id": user_id}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Phone or email already registered"}), 409

@app.route('/api/user/login', methods=['POST'])
def user_login():
    data = request.json
    identifier = data.get('identifier') # Can be phone or email
    password = data.get('password')

    if not identifier or not password:
        return jsonify({"error": "Identifier (phone/email) and password are required"}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE phone = ? OR email = ?', (identifier, identifier)).fetchone()
    conn.close()

    if user and user['password'] == password: # In a real app, use hashed passwords
        return jsonify({"message": "Login successful", "user": {'id': user['id'], 'name': user['name'], 'phone': user['phone'], 'email': user['email']}}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

# Banners
@app.route('/api/banners', methods=['GET'])
def get_banners():
    conn = get_db_connection()
    banners = conn.execute('SELECT * FROM banners').fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in banners]})

@app.route('/api/banners', methods=['POST'])
def add_banner():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected image file"}), 400

    conn = get_db_connection()
    current_banner_count = conn.execute('SELECT COUNT(*) FROM banners').fetchone()[0]
    if current_banner_count >= 5:
        conn.close()
        return jsonify({"error": "Maximum 5 banners allowed"}), 400

    if file:
        filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        cursor = conn.execute('INSERT INTO banners (image) VALUES (?)', (filename,))
        conn.commit()
        banner_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "success", "data": {'id': banner_id, 'image': filename}}), 201
    return jsonify({"error": "Failed to upload banner"}), 500

@app.route('/api/banners/<int:banner_id>', methods=['DELETE'])
def delete_banner(banner_id):
    conn = get_db_connection()
    banner = conn.execute('SELECT image FROM banners WHERE id = ?', (banner_id,)).fetchone()
    if banner and banner['image']:
        image_filename = banner['image']
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError as e:
                print(f"Error deleting banner image {filepath}: {e}")

    conn.execute('DELETE FROM banners WHERE id = ?', (banner_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "deleted", "changes": 1})

@app.route('/create-order', methods=['POST'])
def create_order():
    data = request.get_json()

    # Extract data from the request
    customer_name = data.get('customerName')
    customer_phone = data.get('customerPhone')
    delivery_address = data.get('deliveryAddress')
    delivery_location = data.get('deliveryLocation')
    payment_method = data.get('paymentMethod')
    bkash_trx_id = data.get('bkashTrxId')
    items = data.get('items', [])
    subtotal = data.get('subtotal')
    delivery_charge = data.get('deliveryCharge')
    total = data.get('total')

    if not all([customer_name, customer_phone, delivery_address, delivery_location, payment_method, items]):
        return jsonify({'message': 'Missing required fields'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Insert into new_orders table
        cursor.execute('''
            INSERT INTO new_orders (customer_name, customer_phone, delivery_address, delivery_location, payment_method, bkash_trx_id, subtotal, delivery_charge, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (customer_name, customer_phone, delivery_address, delivery_location, payment_method, bkash_trx_id, subtotal, delivery_charge, total))
        
        order_id = cursor.lastrowid

        # Insert into order_items table
        for item in items:
            cursor.execute('''
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            ''', (order_id, item['id'], item['quantity'], item['price']))

        conn.commit()
        return jsonify({'message': 'Order created successfully', 'order_id': order_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Failed to create order', 'error': str(e)}), 500
    finally:
        conn.close()

# User Management
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    users = conn.execute('SELECT u.id, u.name, u.phone, u.is_active, COUNT(o.id) as order_count FROM users u LEFT JOIN new_orders o ON u.phone = o.customer_phone GROUP BY u.id').fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in users]})

@app.route('/api/users/<int:user_id>/status', methods=['PUT'])
def update_user_status(user_id):
    data = request.json
    is_active = data.get('is_active')

    conn = get_db_connection()
    conn.execute('UPDATE users SET is_active = ? WHERE id = ?', (is_active, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "success", "changes": 1})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "deleted", "changes": 1})

# Previews
@app.route('/api/previews', methods=['GET'])
def get_previews():
    conn = get_db_connection()
    previews = conn.execute('SELECT * FROM previews').fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in previews]})

@app.route('/api/previews', methods=['POST'])
def add_preview():
    data = request.json
    user_name = data.get('userName')
    user_phone = data.get('userPhone')
    preview_address = data.get('previewAddress')
    schedule_date = data.get('scheduleDate')
    products = data.get('products')

    products_str = ""
    if products:
        products_str = ", ".join([p['name'] for p in products])

    conn = get_db_connection()
    conn.execute('INSERT INTO previews (user_name, user_phone, preview_address, schedule_date, products) VALUES (?, ?, ?, ?, ?)', (user_name, user_phone, preview_address, schedule_date, products_str))
    conn.commit()
    conn.close()
    return jsonify({"message": "success"}), 201

@app.route('/api/previews/<int:preview_id>/status', methods=['PUT'])
def update_preview_status(preview_id):
    data = request.json
    status = data.get('status')

    conn = get_db_connection()
    conn.execute('UPDATE previews SET status = ? WHERE id = ?', (status, preview_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "success", "changes": 1})

if __name__ == '__main__':
    app.run(debug=True, port=3000)

# Dashboard Analytics
@app.route('/api/dashboard/sales', methods=['GET'])
def get_total_sales():
    conn = get_db_connection()
    total_sales = conn.execute('SELECT SUM(total) FROM new_orders').fetchone()[0]
    conn.close()
    return jsonify({"total_sales": total_sales or 0})

@app.route('/api/dashboard/previews/count', methods=['GET'])
def get_preview_count():
    conn = get_db_connection()
    preview_count = conn.execute('SELECT COUNT(*) FROM previews').fetchone()[0]
    conn.close()
    return jsonify({"preview_count": preview_count or 0})

@app.route('/api/dashboard/monthly_sales', methods=['GET'])
def get_monthly_sales():
    conn = get_db_connection()
    # This query groups sales by month and year
    monthly_sales = conn.execute("SELECT STRFTIME('%Y-%m', created_at) as month, SUM(total) as total_amount FROM new_orders GROUP BY month ORDER BY month").fetchall()
    conn.close()
    return jsonify({"data": [dict(row) for row in monthly_sales]})

@app.route('/api/dashboard/monthly_previews', methods=['GET'])
def get_monthly_previews():
    conn = get_db_connection()
    # This query groups previews by month and year
    monthly_previews = conn.execute("SELECT STRFTIME('%Y-%m', created_at) as month, COUNT(*) as total_previews FROM previews GROUP BY month ORDER BY month").fetchall()
    conn.close()
    return jsonify({"data": [dict(row) for row in monthly_previews]})