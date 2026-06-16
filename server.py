from flask import Flask, jsonify
import json

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/products')
def get_products():
    try:
        with open('products.json', 'r') as f:
            products = json.load(f)
        return jsonify(products)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True)
