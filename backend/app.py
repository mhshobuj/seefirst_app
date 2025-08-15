import os
import uuid
import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from PIL import Image # Import Pillow
import json

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'your-very-secret-key-that-is-long-and-secure'
DATABASE = 'seefirst.db'
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create the upload folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Authentication Decorators ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            conn = get_db_connection()
            current_user = conn.execute('SELECT * FROM users WHERE id = ?', (data['user_id'],)).fetchone()
            conn.close()
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid!', 'error': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'message': 'Admin role required!'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

def vendor_required(f):
    @wraps(f)
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'vendor':
            return jsonify({'message': 'Vendor role required!'}), 403
        conn = get_db_connection()
        vendor = conn.execute('SELECT * FROM vendors WHERE user_id = ?', (current_user['id'],)).fetchone()
        conn.close()
        if not vendor:
            return jsonify({'message': 'Vendor account not found.'}), 403
        if not vendor['is_approved']:
            # Still pass vendor object back so frontend can show "pending approval"
            return f(current_user, vendor, *args, **kwargs)
        return f(current_user, vendor, *args, **kwargs)
    return decorated


# Serve static files from the uploads folder
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def resize_image(image_path, output_path, size=(600, 400), quality=85):
    with Image.open(image_path) as img:
        img = img.resize(size, Image.LANCZOS)
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

        # User Table Modifications
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL UNIQUE,
                email TEXT UNIQUE,
                password TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                role TEXT NOT NULL DEFAULT 'user'
            )
        ''')
        try:
            db.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
        try:
            db.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise

        # Vendor Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                store_name TEXT NOT NULL,
                store_description TEXT,
                store_location TEXT,
                is_approved BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        try:
            db.execute("ALTER TABLE vendors ADD COLUMN store_location TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise

        # Product Table Modifications
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
                quantity INTEGER,
                vendor_id INTEGER,
                color_images TEXT,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        ''')
        try:
            db.execute("ALTER TABLE products ADD COLUMN offer_price REAL");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN colors TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN condition TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN product_code TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN quantity INTEGER");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN vendor_id INTEGER REFERENCES vendors(id)");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
        try:
            db.execute("ALTER TABLE products ADD COLUMN color_images TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise

        # Categories Table
        db.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                image TEXT
            )
        """)
        try:
            db.execute("ALTER TABLE categories ADD COLUMN image TEXT");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise

        # Legacy Orders Table (Consider removing if not used)
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

        # Banners Table
        db.execute('''
            CREATE TABLE IF NOT EXISTS banners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image TEXT NOT NULL
            )
        ''')

        # New Orders Table
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

        # Order Items Table Modifications
        db.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                vendor_id INTEGER,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES new_orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        ''')
        try:
            db.execute("ALTER TABLE order_items ADD COLUMN vendor_id INTEGER REFERENCES vendors(id)");
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e): raise
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
        db.close()

init_db()

# Serve static files for frontend applications
@app.route('/admin/<path:filename>')
def admin_static(filename):
    return send_from_directory('../admin', filename)

@app.route('/user/<path:filename>')
def user_static(filename):
    return send_from_directory('../user', filename)

@app.route('/vendor/<path:filename>')
def vendor_static(filename):
    return send_from_directory('../vendor', filename)

# --- API Endpoints ---

# Products
@app.route('/api/products', methods=['GET'])
def get_products():
    # This function needs to be updated to join with vendors table
    # to show vendor info on products. Leaving for later.
    conn = get_db_connection()
    # ... (code remains same)
    products = conn.execute('SELECT * FROM products').fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in products]})

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    conn.close()
    if product is None:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify({"message": "success", "data": dict(product)})

@app.route('/api/products', methods=['POST'])
@vendor_required
def add_product(current_user, vendor):
    if not vendor['is_approved']:
        return jsonify({'error': 'Your vendor account is not approved to add products.'}), 403
    
    name = request.form['name']
    description = request.form.get('description')
    price = float(request.form['price'])
    offer_price = float(request.form.get('offer_price', 0.0))
    category = request.form.get('category')
    colors = request.form.get('colors')
    condition = request.form.get('condition')
    quantity = int(request.form.get('quantity', 0))
    product_code = request.form.get('product_code', str(uuid.uuid4()))
    vendor_id = vendor['id']

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
    image_paths = ','.join(image_filenames)

    color_images = {}
    for key, file in request.files.items():
        if key.startswith('color_images_'):
            color_name = key.replace('color_images_', '')
            filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
            file.save(temp_path)
            resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
            os.remove(temp_path)
            color_images[color_name] = filename
    
    color_images_json = json.dumps(color_images)


    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO products (name, description, price, offer_price, image, category, colors, condition, product_code, quantity, vendor_id, color_images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                        (name, description, price, offer_price, image_paths, category, colors, condition, product_code, quantity, vendor_id, color_images_json))
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()
    return jsonify({"message": "success", "data": {'id': product_id}}), 201

@app.route('/api/products/<int:product_id>', methods=['PUT'])
@vendor_required
def update_product(current_user, vendor, product_id):
    if not vendor['is_approved']:
        return jsonify({'error': 'Your vendor account is not approved to update products.'}), 403

    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ? AND vendor_id = ?', (product_id, vendor['id'])).fetchone()
    if not product:
        conn.close()
        return jsonify({'error': 'Product not found or you do not have permission to edit it.'}), 404

    name = request.form['name']
    description = request.form.get('description')
    price = float(request.form['price'])
    offer_price = float(request.form.get('offer_price', 0.0))
    category = request.form.get('category')
    colors = request.form.get('colors')
    condition = request.form.get('condition')
    quantity = int(request.form.get('quantity', 0))
    
    # Handle image updates
    existing_images = product['image'].split(',') if product['image'] else []
    deleted_images = request.form.get('deleted_images', '').split(',')
    
    # Remove deleted images
    for filename in deleted_images:
        if filename in existing_images:
            existing_images.remove(filename)
            # Also delete the file from the uploads folder
            try:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            except OSError as e:
                print(f"Error deleting file {filename}: {e}")

    # Add new images
    new_image_filenames = []
    if 'images' in request.files:
        files = request.files.getlist('images')
        if len(files) + len(existing_images) > 5:
            return jsonify({"error": "Maximum 5 images allowed"}), 400
        for file in files:
            if file.filename != '':
                filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
                temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
                file.save(temp_path)
                resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
                os.remove(temp_path)
                new_image_filenames.append(filename)

    all_images = existing_images + new_image_filenames
    image_paths = ','.join(all_images)

    existing_color_images = json.loads(product['color_images']) if product['color_images'] else {}
    
    # Add new color images
    for key, file in request.files.items():
        if key.startswith('color_images_'):
            color_name = key.replace('color_images_', '')
            filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
            file.save(temp_path)
            resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
            os.remove(temp_path)
            existing_color_images[color_name] = filename

    color_images_json = json.dumps(existing_color_images)


    conn.execute('UPDATE products SET name = ?, description = ?, price = ?, offer_price = ?, image = ?, category = ?, colors = ?, condition = ?, quantity = ?, color_images = ? WHERE id = ?',
                 (name, description, price, offer_price, image_paths, category, colors, condition, quantity, color_images_json, product_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Product updated successfully"})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@vendor_required
def delete_product(current_user, vendor, product_id):
    if not vendor['is_approved']:
        return jsonify({'error': 'Your vendor account is not approved to delete products.'}), 403

    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ? AND vendor_id = ?', (product_id, vendor['id'])).fetchone()
    if not product:
        conn.close()
        return jsonify({'error': 'Product not found or you do not have permission to delete it.'}), 404

    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Product deleted successfully'})

@app.route('/api/banners', methods=['GET'])
def get_banners():
    conn = get_db_connection()
    banners = conn.execute('SELECT * FROM banners').fetchall()
    conn.close()
    return jsonify({'data': [dict(row) for row in banners]})

@app.route('/api/banners', methods=['POST'])
@admin_required
def add_banner(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
        file.save(temp_path)
        resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
        os.remove(temp_path)
        
        conn = get_db_connection()
        conn.execute('INSERT INTO banners (image) VALUES (?)', (filename,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Banner uploaded successfully'}), 201

@app.route('/api/banners/<int:banner_id>', methods=['DELETE'])
@admin_required
def delete_banner(current_user, banner_id):
    conn = get_db_connection()
    banner = conn.execute('SELECT * FROM banners WHERE id = ?', (banner_id,)).fetchone()
    if banner:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], banner['image']))
        except OSError as e:
            print(f"Error deleting file {banner['image']}: {e}")
        
        conn.execute('DELETE FROM banners WHERE id = ?', (banner_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Banner deleted successfully'})
    else:
        conn.close()
        return jsonify({'error': 'Banner not found'}), 404

# ... other product endpoints

@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    categories = conn.execute('SELECT * FROM categories').fetchall()
    conn.close()
    return jsonify({"message": "success", "data": [dict(row) for row in categories]})

@app.route('/api/categories', methods=['POST'])
@admin_required
def add_category(current_user):
    name = request.form['name']
    image_filename = None

    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '':
            filename = str(uuid.uuid4()) + os.path.splitext(file.filename)[1]
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], "temp_" + filename)
            file.save(temp_path)
            resize_image(temp_path, os.path.join(app.config['UPLOAD_FOLDER'], filename))
            os.remove(temp_path)
            image_filename = filename

    conn = get_db_connection()
    try:
        cursor = conn.execute('INSERT INTO categories (name, image) VALUES (?, ?)',
                             (name, image_filename))
        conn.commit()
        category_id = cursor.lastrowid
        conn.close()
        return jsonify({"message": "Category added successfully", "data": {'id': category_id}}), 201
    except sqlite3.IntegrityError as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': 'Category with this name already exists.'}), 409
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500


# Orders
@app.route('/create-order', methods=['POST'])
def create_order():
    data = request.get_json()
    # ... (customer data extraction)
    items = data.get('items', [])
    # ...
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # ... (insert into new_orders)
        order_id = cursor.lastrowid

        for item in items:
            product = conn.execute('SELECT vendor_id FROM products WHERE id = ?', (item['id'],)).fetchone()
            vendor_id = product['vendor_id'] if product else None
            cursor.execute('INSERT INTO order_items (order_id, product_id, quantity, price, vendor_id) VALUES (?, ?, ?, ?, ?)',
                           (order_id, item['id'], item['quantity'], item['price'], vendor_id))
        conn.commit()
        return jsonify({'message': 'Order created successfully', 'order_id': order_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': 'Failed to create order', 'error': str(e)}), 500
    finally:
        conn.close()

# --- Auth Endpoints ---
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if email == 'admin@gmail.com' and password == '12345678':
        conn = get_db_connection()
        admin_user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        if not admin_user:
            conn.execute("INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)",
                         ('Admin', '0000000000', email, '12345678', 'admin'))
            conn.commit()
            admin_user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        
        token = jwt.encode({
            'user_id': admin_user['id'],
            'role': 'admin',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        conn.close()
        return jsonify({'message': 'Login successful', 'token': token})
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/user/register', methods=['POST'])
def user_register():
    # ... (no changes)
    pass

@app.route('/api/user/login', methods=['POST'])
def user_login():
    data = request.json
    identifier = data.get('identifier')
    password = data.get('password')

    if not identifier or not password:
        return jsonify({"error": "Identifier (phone/email) and password are required"}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE (phone = ? OR email = ?) AND is_active = 1', (identifier, identifier)).fetchone()
    
    if user and user['password'] == password:
        token = jwt.encode({
            'user_id': user['id'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        conn.close()
        return jsonify({
            'message': 'Login successful', 
            'token': token,
            'user': {'id': user['id'], 'name': user['name'], 'phone': user['phone'], 'email': user['email'], 'role': user['role']}
        })
    else:
        conn.close()
        return jsonify({"error": "Invalid credentials or user inactive"}), 401

# --- Vendor Endpoints ---
@app.route('/api/vendor/products', methods=['GET'])
@vendor_required
def get_vendor_products(current_user, vendor):
    conn = get_db_connection()
    products = conn.execute('SELECT * FROM products WHERE vendor_id = ?', (vendor['id'],)).fetchall()
    conn.close()
    return jsonify({"data": [dict(row) for row in products]})

@app.route('/api/vendor/register', methods=['POST'])
def vendor_register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    store_name = data.get('store_name')
    store_description = data.get('store_description')
    store_location = data.get('store_location')

    if not name or not phone or not password or not store_name or not store_location:
        return jsonify({'error': 'All required fields (Name, Phone, Password, Store Name, Store Location) must be provided.'}), 400

    conn = get_db_connection()
    try:
        # 1. Create a new user account
        cursor = conn.execute('INSERT INTO users (name, phone, email, password, role) VALUES (?, ?, ?, ?, ?)',
                             (name, phone, email, password, 'vendor')) # Set role to vendor directly
        user_id = cursor.lastrowid

        # 2. Create the vendor entry linked to the new user
        conn.execute('INSERT INTO vendors (user_id, store_name, store_description, store_location) VALUES (?, ?, ?, ?)',
                     (user_id, store_name, store_description, store_location))
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Vendor application submitted successfully. Please wait for admin approval.'}), 201
    except sqlite3.IntegrityError as e:
        conn.rollback() # Rollback user creation if vendor creation fails
        conn.close()
        if "UNIQUE constraint failed: users.phone" in str(e):
            return jsonify({'error': 'Phone number already registered.'}), 409
        elif "UNIQUE constraint failed: users.email" in str(e):
            return jsonify({'error': 'Email already registered.'}), 409
        return jsonify({'error': 'An error occurred during registration.', 'details': str(e)}), 500

@app.route('/api/vendor/dashboard', methods=['GET'])
@vendor_required
def vendor_dashboard(current_user, vendor):
    conn = get_db_connection()
    
    product_count = conn.execute('SELECT COUNT(*) FROM products WHERE vendor_id = ?', (vendor['id'],)).fetchone()[0]
    
    # Counts orders with at least one item from this vendor that is in 'pending' status
    pending_orders_count = conn.execute("""
        SELECT COUNT(DISTINCT o.id) 
        FROM new_orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.vendor_id = ? AND o.status = 'pending'
    """, (vendor['id'],)).fetchone()[0]

    conn.close()
    
    return jsonify({
        'store_name': vendor['store_name'],
        'is_approved': vendor['is_approved'],
        'product_count': product_count,
        'pending_orders_count': pending_orders_count
    })

@app.route('/api/admin/vendors', methods=['GET'])
@admin_required
def get_all_vendors(current_user):
    conn = get_db_connection()
    vendors = conn.execute('SELECT v.id, v.store_name, v.store_description, v.store_location, v.is_approved, u.name, u.email, u.phone FROM vendors v JOIN users u ON v.user_id = u.id').fetchall()
    conn.close()
    return jsonify({'data': [dict(row) for row in vendors]})

@app.route('/api/admin/vendors/<int:vendor_id>/approve', methods=['PUT'])
@admin_required
def approve_vendor(current_user, vendor_id):
    conn = get_db_connection()
    vendor = conn.execute('SELECT * FROM vendors WHERE id = ?', (vendor_id,)).fetchone()
    if not vendor:
        conn.close()
        return jsonify({'error': 'Vendor not found'}), 404
    
    conn.execute('UPDATE vendors SET is_approved = 1 WHERE id = ?', (vendor_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Vendor {vendor["store_name"]} approved successfully.'})

if __name__ == '__main__':
    app.run(debug=True, port=3000)