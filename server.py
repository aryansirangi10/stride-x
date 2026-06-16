from flask import Flask, jsonify, request, send_from_directory
import json
import sqlite3
import os
from db import get_db_connection, init_db

app = Flask(__name__, static_folder='.', static_url_path='')

# Ensure DB is initialized
init_db()

@app.route('/')
def index():
    return app.send_static_file('index.html')

# Serve assets folder
@app.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory('assets', path)

@app.route('/api/products', methods=['GET'])
def get_products():
    category = request.args.get('category', 'all')
    sort = request.args.get('sort', 'popular')
    search = request.args.get('search', '').strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM products WHERE 1=1"
    params = []

    if category != 'all':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)"
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern])

    if sort == 'price-asc':
        query += " ORDER BY price ASC"
    elif sort == 'price-desc':
        query += " ORDER BY price DESC"
    else:
        # Sort by popularity (rating DESC, reviews_count DESC)
        query += " ORDER BY rating DESC, reviews_count DESC"

    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        products = [dict(row) for row in rows]
        return jsonify(products)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Fetch product
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        prod_row = cursor.fetchone()
        if not prod_row:
            return jsonify({"error": "Product not found"}), 404
        
        product = dict(prod_row)

        # Fetch reviews
        cursor.execute("SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC", (product_id,))
        review_rows = cursor.fetchall()
        product['reviews'] = [dict(row) for row in review_rows]

        return jsonify(product)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/products/<int:product_id>/reviews', methods=['POST'])
def add_review(product_id):
    data = request.get_json() or {}
    reviewer_name = data.get('reviewer_name', '').strip() or 'Anonymous'
    rating = data.get('rating', 5)
    comment = data.get('comment', '').strip()

    if not comment:
        return jsonify({"error": "Comment is required"}), 400

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError()
    except ValueError:
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify product exists
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Product not found"}), 404

        # Insert review
        cursor.execute('''
        INSERT INTO reviews (product_id, reviewer_name, rating, comment)
        VALUES (?, ?, ?, ?)
        ''', (product_id, reviewer_name, rating, comment))

        # Recalculate average rating and review count
        cursor.execute("SELECT COUNT(*), AVG(rating) FROM reviews WHERE product_id = ?", (product_id,))
        count, avg_rating = cursor.fetchone()

        cursor.execute('''
        UPDATE products 
        SET rating = ?, reviews_count = ?
        WHERE id = ?
        ''', (round(avg_rating or 0.0, 1), count, product_id))

        conn.commit()
        return jsonify({"success": True, "message": "Review submitted successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.get_json() or {}
    customer_name = data.get('customer_name', '').strip()
    customer_email = data.get('customer_email', '').strip()
    items = data.get('items', [])

    if not customer_name or not customer_email:
        return jsonify({"error": "Customer name and email are required"}), 400

    if not items:
        return jsonify({"error": "Cart is empty"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Start transaction
        conn.execute('BEGIN TRANSACTION')

        total_price = 0.0
        validated_items = []

        # Validate stock and compute prices
        for item in items:
            prod_id = item.get('id')
            qty = int(item.get('qty', 1))
            size = str(item.get('size'))
            color = str(item.get('color'))

            cursor.execute("SELECT name, price, stock FROM products WHERE id = ?", (prod_id,))
            prod = cursor.fetchone()
            if not prod:
                raise Exception(f"Product ID {prod_id} not found.")

            prod_name, price, stock = prod

            if stock < qty:
                raise Exception(f"Insufficient stock for '{prod_name}'. Only {stock} left in stock.")

            item_total = price * qty
            total_price += item_total

            validated_items.append({
                "product_id": prod_id,
                "name": prod_name,
                "quantity": qty,
                "size": size,
                "color": color,
                "price": price,
                "new_stock": stock - qty
            })

        # Insert Order
        cursor.execute('''
        INSERT INTO orders (customer_name, customer_email, total_price, status)
        VALUES (?, ?, ?, 'Completed')
        ''', (customer_name, customer_email, total_price))
        order_id = cursor.lastrowid

        # Insert Order Items & Deduct Stock
        for vi in validated_items:
            cursor.execute('''
            INSERT INTO order_items (order_id, product_id, quantity, size, color, price)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (order_id, vi['product_id'], vi['quantity'], vi['size'], vi['color'], vi['price']))

            cursor.execute('''
            UPDATE products 
            SET stock = ? 
            WHERE id = ?
            ''', (vi['new_stock'], vi['product_id']))

        conn.commit()

        # Build response receipt
        receipt = {
            "order_id": order_id,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "total_price": total_price,
            "items": [{"name": v["name"], "qty": v["quantity"], "size": v["size"], "color": v["color"], "price": v["price"]} for v in validated_items]
        }
        return jsonify(receipt)

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()

@app.route('/api/orders', methods=['GET'])
def get_orders():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get all orders
        cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
        order_rows = cursor.fetchall()
        orders = []

        for row in order_rows:
            order = dict(row)
            # Get order items
            cursor.execute('''
            SELECT oi.*, p.name as product_name, p.brand as product_brand
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
            ''', (order['id'],))
            item_rows = cursor.fetchall()
            order['items'] = [dict(ir) for ir in item_rows]
            orders.append(order)

        return jsonify(orders)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/reset-db', methods=['POST'])
def reset_database():
    try:
        init_db(force_reset=True)
        return jsonify({"success": True, "message": "Database reset to clean seeded state."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Flask port = 8000 (Avoid macOS 5000 AirPlay port conflict)
    app.run(port=8000, debug=True)
