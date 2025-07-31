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
                condition TEXT
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
        db.commit()
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
    return jsonify({"message": "success", "data": [dict(row) for row in products], "total_pages": total_pages, "current_page": page})

@app.route('/api/products', methods=['POST'])
def add_product():
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
                filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1] # Generate unique filename
                temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
                file.save(temp_path)
                resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
                os.remove(temp_path) # Remove temporary file
                image_filenames.append(filename)
    image_paths = ', '.join(image_filenames) # Store as comma-separated string

    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO products (name, description, price, offer_price, image, category, colors, condition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (name, description, price, offer_price, image_paths, category, colors, condition))
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()
    return jsonify({"message": "success", "data": {'id': product_id, 'name': name, 'description': description, 'price': price, 'offer_price': offer_price, 'image': image_paths, 'category': category, 'colors': colors, 'condition': condition}}), 201

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

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    conn = get_db_connection()
    product = conn.execute('SELECT image FROM products WHERE id = ?', (product_id,)).fetchone()
    if product and product['image']:
        image_filenames = product['image'].split(',')
        for filename in image_filenames:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename.strip())
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError as e:
                    print(f"Error deleting product image {filepath}: {e}")

    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "deleted", "changes": 1})

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
    conn = get_db_connection()
    orders = conn.execute('SELECT * FROM orders').fetchall()
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
    conn.execute('UPDATE orders SET status = ? WHERE id = ?', (status, order_id))
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

if __name__ == '__main__':
    app.run(debug=True, port=3000)