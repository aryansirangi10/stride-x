// StrideX E-Commerce Application State & Logic

const $ = id => document.getElementById(id);

// Application State
let products = [];
let cart = JSON.parse(localStorage.getItem('stridex_cart') || '[]');
let activeCategory = 'all';
let activeSort = 'popular';
let searchQuery = '';
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;

// Bespoke Customizer State
let activeCustomizerPart = 'shoe-upper';
let customizerColors = {
  'shoe-upper': '#181a1f',
  'shoe-midsole': '#ffffff',
  'shoe-laces': '#ffffff',
  'shoe-accents': '#dfba73'
};

// Promo & Shipping state
let promoDiscount = 0.0; // 10% discount when MENTOR10 is applied

// Color Names Mapping for customizer descriptions
const colorNames = {
  '#dfba73': 'Champagne Gold',
  '#a21a24': 'Velvet Crimson',
  '#2a4736': 'Forest Green',
  '#121317': 'Stealth Obsidian',
  '#eef1f6': 'Ice White',
  '#1e3a8a': 'Cobalt Blue',
  '#f59e0b': 'Vibrant Amber',
  '#06b6d4': 'Cyan Glow'
};

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  wireEventListeners();
  loadProducts();
  updateCartUI();
  syncMentorConsole();
  setupCustomizerDefaultColors();
});

// Fetch products from database API with search, filter, and sort options
async function loadProducts() {
  const productsContainer = $('products');
  productsContainer.innerHTML = `
    <div class="text-center w-100 py-5">
      <div class="spinner-border text-warning" role="status">
        <span class="visually-hidden">Loading collection...</span>
      </div>
    </div>
  `;

  try {
    const url = new URL('/api/products', window.location.origin);
    url.searchParams.append('category', activeCategory);
    url.searchParams.append('sort', activeSort);
    url.searchParams.append('search', searchQuery);

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load products');
    products = await res.json();
    
    renderProducts(products);
    populateCustomizerDropdown();
  } catch (err) {
    console.error(err);
    productsContainer.innerHTML = `
      <div class="text-center w-100 py-5">
        <p class="text-danger">Error loading shoe collection. Please try resetting the database.</p>
      </div>
    `;
  }
}

// Render product grid
function renderProducts(list) {
  const productsContainer = $('products');
  productsContainer.innerHTML = '';

  if (list.length === 0) {
    productsContainer.innerHTML = `
      <div class="text-center w-100 py-5">
        <p class="text-muted">No premium models found matching your criteria.</p>
      </div>
    `;
    return;
  }

  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.addEventListener('click', () => openProductModal(p.id));

    // Determine rating stars
    const starString = getStarRatingHTML(p.rating);

    card.innerHTML = `
      <div class="product-card-img-wrapper">
        <img src="${p.image_url}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-brand">${p.brand}</div>
      <h3 class="product-name">${p.name}</h3>
      <div class="product-meta-row">
        <div class="product-price">₹${p.price.toFixed(2)}</div>
        <div class="product-rating">
          <span class="stars-display">${starString}</span>
          <span class="text-muted">(${p.reviews_count})</span>
        </div>
      </div>
    `;

    // Apply 3D tilt interaction
    apply3DTiltEffect(card);

    productsContainer.appendChild(card);
  });
}

// 3D Card Tilt Interactive Effect
function apply3DTiltEffect(card) {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const deltaX = x - centerX;
    const deltaY = y - centerY;
    
    // Rotate relative to mouse coordinate offsets
    const percentX = deltaX / centerX;
    const percentY = deltaY / centerY;
    
    const rotateY = (percentX * 12).toFixed(1);  // Max 12 degrees
    const rotateX = (-percentY * 12).toFixed(1);
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  });
}

// Helper to generate star characters
function getStarRatingHTML(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

// Fetch single product details (including reviews) and open details modal
async function openProductModal(productId) {
  try {
    const res = await fetch(`/api/products/${productId}`);
    if (!res.ok) throw new Error('Product details fetch error');
    currentProduct = await res.json();
    
    // Reset selection states
    selectedSize = null;
    selectedColor = null;

    // Fill elements
    $('detail-img').src = currentProduct.image_url;
    $('detail-img').alt = currentProduct.name;
    $('detail-brand').textContent = currentProduct.brand;
    $('detail-name').textContent = currentProduct.name;
    $('detail-price').textContent = `₹${currentProduct.price.toFixed(2)}`;
    $('detail-desc').textContent = currentProduct.description;
    
    $('detail-stars').textContent = getStarRatingHTML(currentProduct.rating);
    $('detail-reviews-count').textContent = `(${currentProduct.reviews_count} Customer Review${currentProduct.reviews_count !== 1 ? 's' : ''})`;

    // Specs Tab
    $('spec-brand').textContent = currentProduct.brand;

    // Render sizes buttons
    const sizesContainer = $('detail-sizes');
    sizesContainer.innerHTML = '';
    const sizes = currentProduct.sizes.split(',');
    sizes.forEach(sz => {
      const box = document.createElement('button');
      box.className = 'size-box';
      box.textContent = sz;
      box.type = 'button';
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.size-box').forEach(el => el.classList.remove('active'));
        box.classList.add('active');
        selectedSize = sz;
      });
      sizesContainer.appendChild(box);
    });

    // Render color swatches
    const colorsContainer = $('detail-colors');
    colorsContainer.innerHTML = '';
    const colors = currentProduct.colors.split(',');
    colors.forEach(col => {
      const btn = document.createElement('button');
      btn.className = 'color-swatch-btn';
      btn.textContent = col;
      btn.type = 'button';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.color-swatch-btn').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = col;
      });
      colorsContainer.appendChild(btn);
    });

    // Render stock availability
    const stockEl = $('detail-stock');
    if (currentProduct.stock <= 0) {
      stockEl.textContent = 'Out of Stock';
      stockEl.style.color = '#ef4444';
      $('modal-add-btn').disabled = true;
      $('modal-add-btn').textContent = 'Sold Out';
    } else if (currentProduct.stock <= 4) {
      stockEl.textContent = `Only ${currentProduct.stock} left in stock!`;
      stockEl.style.color = '#f59e0b';
      $('modal-add-btn').disabled = false;
      $('modal-add-btn').textContent = 'Add to Cart';
    } else {
      stockEl.textContent = `In Stock (${currentProduct.stock} available)`;
      stockEl.style.color = '#10b981';
      $('modal-add-btn').disabled = false;
      $('modal-add-btn').textContent = 'Add to Cart';
    }

    // Load reviews
    renderReviews(currentProduct.reviews);

    // Reset Modal Tab to Reviews
    switchDetailTab('tab-reviews');

    // Display Dialog Modal
    $('product-modal').showModal();
  } catch (err) {
    console.error(err);
    alert('Could not retrieve details for this product.');
  }
}

// Render reviews list
function renderReviews(reviews) {
  const container = $('detail-reviews-list');
  container.innerHTML = '';

  if (!reviews || reviews.length === 0) {
    container.innerHTML = '<p class="text-muted small py-2">No reviews published for this model yet. Be the first to write one!</p>';
    return;
  }

  reviews.forEach(rev => {
    const item = document.createElement('div');
    item.className = 'review-item';
    
    // Format date nicely
    const dateStr = rev.created_at ? new Date(rev.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'Recently';

    item.innerHTML = `
      <div class="review-header">
        <span class="reviewer-name">${rev.reviewer_name}</span>
        <span class="stars-display small">${'★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating)}</span>
      </div>
      <div class="text-muted mb-1 small" style="font-size: 11px;">Published ${dateStr}</div>
      <p class="review-comment mb-0">${rev.comment}</p>
    `;
    container.appendChild(item);
  });
}

// Switch between Description and Reviews tabs inside product modal
function switchDetailTab(tabId) {
  document.querySelectorAll('.modal-tab-trigger').forEach(el => {
    el.classList.remove('active');
    if (el.getAttribute('data-tab') === tabId) el.classList.add('active');
  });

  document.querySelectorAll('.modal-tab-pane').forEach(el => {
    el.classList.remove('active');
  });
  $(tabId).classList.add('active');
}

// Add item to cart with size/color validation
function addItemToCart() {
  if (!currentProduct) return;

  if (!selectedSize) {
    alert('Please select a size.');
    return;
  }
  if (!selectedColor) {
    alert('Please select a colorway.');
    return;
  }

  // Check if item already exists in cart with same size & color
  const existingIndex = cart.findIndex(item => 
    item.id === currentProduct.id && 
    item.size === selectedSize && 
    item.color === selectedColor
  );

  if (existingIndex > -1) {
    if (cart[existingIndex].qty + 1 > currentProduct.stock) {
      alert(`Cannot add more. Maximum available stock is ${currentProduct.stock}.`);
      return;
    }
    cart[existingIndex].qty += 1;
  } else {
    cart.push({
      id: currentProduct.id,
      name: currentProduct.name,
      brand: currentProduct.brand,
      price: currentProduct.price,
      image: currentProduct.image_url,
      size: selectedSize,
      color: selectedColor,
      qty: 1,
      maxStock: currentProduct.stock
    });
  }

  saveCart();
  updateCartUI();
  $('product-modal').close();
  openCartDrawer();
}

function saveCart() {
  localStorage.setItem('stridex_cart', JSON.stringify(cart));
}

// Update header cart count and drawer items list with shipping tracker & promo code calculations
function updateCartUI() {
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  $('cart-count').textContent = totalQty;

  const cartContainer = $('cart-items');
  cartContainer.innerHTML = '';

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="text-center py-5 w-100">
        <p class="text-muted">Your shopping drawer is empty.</p>
      </div>
    `;
    $('checkout').disabled = true;
    $('cart-pricing').innerHTML = '';
    updateShippingTracker(0.0);
    return;
  }

  $('checkout').disabled = false;
  let subtotal = 0.0;

  cart.forEach((item, index) => {
    subtotal += item.price * item.qty;
    
    const card = document.createElement('div');
    card.className = 'cart-item-card';
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-options">Size: US ${item.size} | ${item.color}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn dec-btn" data-index="${index}">-</button>
          <span class="cart-item-qty">${item.qty}</span>
          <button class="qty-btn inc-btn" data-index="${index}">+</button>
        </div>
      </div>
      <div class="cart-item-price">₹${(item.price * item.qty).toFixed(2)}</div>
      <button class="cart-item-remove-btn" data-index="${index}" aria-label="Remove">&times;</button>
    `;

    // Quantity modifiers listeners
    card.querySelector('.dec-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      adjustQty(index, -1);
    });
    card.querySelector('.inc-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      adjustQty(index, 1);
    });
    card.querySelector('.cart-item-remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeCartItem(index);
    });

    cartContainer.appendChild(card);
  });

  // Calculate promo discount deductions
  const discountAmount = subtotal * promoDiscount;
  const discountedSubtotal = subtotal - discountAmount;

  // Update Free Shipping Progress bar based on subtotal after discount
  updateShippingTracker(discountedSubtotal);

  // shipping calculation (Milestone ₹12,000, Shipping cost ₹1,200)
  const shipping = discountedSubtotal >= 12000 ? 0.0 : 1200.00;
  const tax = discountedSubtotal * 0.08;
  const total = discountedSubtotal + shipping + tax;

  let pricingHtml = `
    <div class="price-row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
  `;

  if (promoDiscount > 0) {
    pricingHtml += `
      <div class="price-row text-success"><span>Promo Code Discount (10%):</span><span>-₹${discountAmount.toFixed(2)}</span></div>
    `;
  }

  pricingHtml += `
    <div class="price-row"><span>Shipping:</span><span>${shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span></div>
    <div class="price-row"><span>Tax (8%):</span><span>₹${tax.toFixed(2)}</span></div>
    <div class="price-row grand-total"><span>Total:</span><span>₹${total.toFixed(2)}</span></div>
  `;

  $('cart-pricing').innerHTML = pricingHtml;
}

// Update the Shipping Tracker Progress Bar (Gamified Feature)
function updateShippingTracker(subtotal) {
  const milestone = 12000.0;
  const progressPercent = Math.min((subtotal / milestone) * 100, 100);
  const progressBar = $('shipping-progress');
  const trackerText = $('shipping-tracker-text');

  progressBar.style.width = `${progressPercent}%`;
  progressBar.setAttribute('aria-valuenow', progressPercent);

  if (subtotal === 0) {
    trackerText.textContent = "Add items to qualify for free shipping";
    progressBar.className = "progress-bar bg-secondary";
  } else if (subtotal >= milestone) {
    trackerText.textContent = "✓ You qualify for Free Express Shipping!";
    trackerText.style.color = "#10b981";
    progressBar.className = "progress-bar bg-success";
  } else {
    const remaining = milestone - subtotal;
    trackerText.textContent = `Add ₹${remaining.toFixed(2)} more for Free Shipping`;
    trackerText.style.color = "var(--text-muted)";
    progressBar.className = "progress-bar bg-warning";
  }
}

// Apply promo code (MENTOR10)
function applyPromoCode() {
  const input = $('promo-input').value.trim().toUpperCase();
  const msg = $('promo-active-msg');

  if (input === 'MENTOR10') {
    promoDiscount = 0.1; // 10%
    msg.textContent = "Coupon 'MENTOR10' applied: 10% discount active!";
    msg.classList.remove('d-none');
    updateCartUI();
  } else if (input === '') {
    promoDiscount = 0.0;
    msg.classList.add('d-none');
    updateCartUI();
  } else {
    alert("Invalid promo code. Enter MENTOR10 to test discounts.");
  }
}

function adjustQty(index, delta) {
  const item = cart[index];
  const newQty = item.qty + delta;
  
  if (newQty <= 0) {
    removeCartItem(index);
    return;
  }
  
  if (newQty > item.maxStock) {
    alert(`Only ${item.maxStock} items available in store stock.`);
    return;
  }

  item.qty = newQty;
  saveCart();
  updateCartUI();
}

function removeCartItem(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function openCartDrawer() {
  $('cart-modal').showModal();
}

// Process checkout transaction request
async function handleCheckoutSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const oldText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing Transaction...';

  const customerName = $('cust-name').value;
  const customerEmail = $('cust-email').value;

  const payload = {
    customer_name: customerName,
    customer_email: customerEmail,
    items: cart.map(item => ({
      id: item.id,
      qty: item.qty,
      size: item.size,
      color: item.color
    }))
  };

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Checkout transaction failed');
    }

    // Success response receipt rendering
    $('checkout-form').classList.add('d-none');
    $('checkout-success').classList.remove('d-none');

    // Apply 10% discount calculation to final receipt display
    const finalTotal = data.total_price * (1 - promoDiscount);
    const shippingCost = finalTotal >= 12000 ? 0.0 : 1200.0;
    const taxCost = finalTotal * 0.08;
    const grandTotal = finalTotal + shippingCost + taxCost;

    $('rec-id').textContent = `#${data.order_id}`;
    $('rec-total').textContent = `₹${grandTotal.toFixed(2)}`;
    $('rec-name').textContent = data.customer_name;
    $('rec-email').textContent = data.customer_email;

    const receiptItems = $('rec-items');
    receiptItems.innerHTML = '';
    data.items.forEach(item => {
      const itEl = document.createElement('div');
      itEl.className = 'd-flex justify-content-between small text-muted py-1';
      itEl.innerHTML = `
        <span>${item.name} (US ${item.size} - ${item.color}) x${item.qty}</span>
        <span>₹${(item.price * item.qty).toFixed(2)}</span>
      `;
      receiptItems.appendChild(itEl);
    });

    // Reset local cart & discount
    cart = [];
    promoDiscount = 0.0;
    $('promo-input').value = '';
    $('promo-active-msg').classList.add('d-none');
    saveCart();
    updateCartUI();
    
    // Sync catalog and order log databases
    loadProducts();
    syncMentorConsole();

  } catch (err) {
    alert(`Transaction Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }
}

// Add a review
async function handleReviewSubmit(e) {
  e.preventDefault();
  if (!currentProduct) return;

  const reviewerName = $('review-name').value;
  const rating = $('review-rating').value;
  const comment = $('review-comment').value;

  try {
    const res = await fetch(`/api/products/${currentProduct.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer_name: reviewerName, rating, comment })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit review');

    // Reload product details in modal
    openProductModal(currentProduct.id);
    
    // Clear review inputs
    $('review-name').value = '';
    $('review-comment').value = '';

    // Refresh products catalog lists and mentor logs
    loadProducts();
    syncMentorConsole();
  } catch (err) {
    alert(`Review Error: ${err.message}`);
  }
}

// Fetch DB tables and render inside Mentor Console
async function syncMentorConsole() {
  try {
    // 1. Fetch orders list
    const resOrders = await fetch('/api/orders');
    if (!resOrders.ok) throw new Error();
    const orders = await resOrders.json();

    const ordersBody = $('orders-table-body');
    ordersBody.innerHTML = '';

    if (orders.length === 0) {
      ordersBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No transactions processed in database yet.</td></tr>';
    } else {
      orders.forEach(o => {
        const tr = document.createElement('tr');
        
        // Format timestamp
        const timeStr = new Date(o.created_at).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        // Items breakdown markup
        const itemsHtml = o.items.map(it => 
          `<div class="small"><strong>${it.product_name}</strong> (Size ${it.size} | ${it.color}) x${it.quantity}</div>`
        ).join('');

        tr.innerHTML = `
          <td><code class="text-warning">#${o.id}</code></td>
          <td>
            <div class="fw-semibold text-white">${o.customer_name}</div>
            <div class="text-muted small">${o.customer_email}</div>
          </td>
          <td>${itemsHtml}</td>
          <td><strong class="text-white">₹${o.total_price.toFixed(2)}</strong></td>
          <td>
            <div>${new Date(o.created_at).toLocaleDateString()}</div>
            <div class="text-muted small">${timeStr}</div>
          </td>
        `;
        ordersBody.appendChild(tr);
      });
    }

    // 2. Fetch products details for catalog stock checking
    const resProducts = await fetch('/api/products?sort=popular');
    if (!resProducts.ok) throw new Error();
    const products = await resProducts.json();

    const productsBody = $('products-table-body');
    productsBody.innerHTML = '';

    products.forEach(p => {
      const tr = document.createElement('tr');
      const stockBadgeColor = p.stock <= 0 ? '#ef4444' : (p.stock <= 4 ? '#f59e0b' : '#10b981');
      
      tr.innerHTML = `
        <td>
          <div class="fw-semibold text-white">${p.name}</div>
          <div class="text-muted small">${p.brand} (${p.category})</div>
        </td>
        <td><span class="text-muted small">${p.sizes}</span></td>
        <td><span class="text-warning">${p.rating} ★</span> <span class="text-muted">(${p.reviews_count})</span></td>
        <td>
          <span class="admin-badge fw-bold" style="background-color: rgba(255,255,255,0.05); color: ${stockBadgeColor}; border: 1px solid rgba(255,255,255,0.05);">
            ${p.stock} Units
          </span>
        </td>
      `;
      productsBody.appendChild(tr);
    });

  } catch (err) {
    console.warn("Failed to synchronize mentor database tables logs");
  }
}

// Reset database to seeded clean state
async function resetDatabase() {
  if (!confirm("Are you sure you want to wipe the SQLite database and restore the default 8 products & reviews? All active orders will be cleared.")) {
    return;
  }

  try {
    const res = await fetch('/api/reset-db', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    alert("SQLite database has been successfully reset!");
    
    // Clear cart and states
    cart = [];
    promoDiscount = 0.0;
    $('promo-input').value = '';
    $('promo-active-msg').classList.add('d-none');
    saveCart();
    updateCartUI();

    // Reload layouts
    loadProducts();
    syncMentorConsole();
    
    // Close active modals
    $('product-modal').close();
    $('cart-modal').close();
    $('checkout-modal').close();
  } catch (err) {
    alert(`Reset Error: ${err.message}`);
  }
}

// Bespoke Configurator: Setup default coloring
function setupCustomizerDefaultColors() {
  // Apply initial colors to SVG paths
  $('shoe-upper').setAttribute('fill', customizerColors['shoe-upper']);
  $('shoe-midsole').setAttribute('fill', customizerColors['shoe-midsole']);
  $('shoe-laces').setAttribute('stroke', customizerColors['shoe-laces']);
  $('shoe-accents').setAttribute('fill', customizerColors['shoe-accents']);
}

// Populate Customizer Dropdown
function populateCustomizerDropdown() {
  const select = $('cust-base-shoe');
  if (select.children.length > 0) return; // already populated

  products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} - ₹${p.price.toFixed(2)}`;
    select.appendChild(opt);
  });
}

// Handle Customizer Swatch Click
function handleSwatchClick(e) {
  const color = e.target.getAttribute('data-color');
  if (!color) return;

  // Update active swatch state
  document.querySelectorAll('.swatch-btn').forEach(el => el.classList.remove('active'));
  e.target.classList.add('active');

  // Recolor SVG element
  const svgElement = $(activeCustomizerPart);
  if (activeCustomizerPart === 'shoe-laces') {
    svgElement.setAttribute('stroke', color);
  } else {
    svgElement.setAttribute('fill', color);
  }

  // Update color states
  customizerColors[activeCustomizerPart] = color;

  // Update labels
  const colorName = colorNames[color] || color;
  const partText = activeCustomizerPart.replace('shoe-', '').toUpperCase();
  $('part-color-label').textContent = `3. Apply ${colorName} to ${partText}`;
}

// Handle Add Custom Sneaker to Cart
function handleAddCustomToCart() {
  const baseShoeId = parseInt($('cust-base-shoe').value);
  const size = $('cust-size').value;

  const baseShoe = products.find(p => p.id === baseShoeId);
  if (!baseShoe) {
    alert('Select a base model first.');
    return;
  }

  // Check if base shoe has stock
  if (baseShoe.stock <= 0) {
    alert('This base model is currently out of stock.');
    return;
  }

  // Create descriptive custom colorway string
  const upperCol = colorNames[customizerColors['shoe-upper']] || customizerColors['shoe-upper'];
  const midsoleCol = colorNames[customizerColors['shoe-midsole']] || customizerColors['shoe-midsole'];
  const lacesCol = colorNames[customizerColors['shoe-laces']] || customizerColors['shoe-laces'];
  const accentsCol = colorNames[customizerColors['shoe-accents']] || customizerColors['shoe-accents'];

  const customColorwayName = `Bespoke (Upper: ${upperCol}, Sole: ${midsoleCol}, Laces: ${lacesCol}, Logo: ${accentsCol})`;

  // Add ₹1,500 premium for custom design order
  const customPrice = baseShoe.price + 1500.00;

  // Check if exact custom model already in cart
  const existingIndex = cart.findIndex(item => 
    item.id === baseShoe.id && 
    item.size === size && 
    item.color === customColorwayName
  );

  if (existingIndex > -1) {
    if (cart[existingIndex].qty + 1 > baseShoe.stock) {
      alert(`Cannot add more. Maximum available stock is ${baseShoe.stock}.`);
      return;
    }
    cart[existingIndex].qty += 1;
  } else {
    cart.push({
      id: baseShoe.id,
      name: `Bespoke ${baseShoe.name}`,
      brand: baseShoe.brand,
      price: customPrice,
      image: baseShoe.image_url,
      size: size,
      color: customColorwayName,
      qty: 1,
      maxStock: baseShoe.stock
    });
  }

  saveCart();
  updateCartUI();
  openCartDrawer();
  
  // Quick alert overlay toast simulation
  alert(`Bespoke ${baseShoe.name} added to shopping drawer with a +₹1,500 custom laboratory dye premium!`);
}

// Event Listeners Mapping
function wireEventListeners() {
  // Category tabs click triggers
  document.querySelectorAll('#category-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#category-tabs .tab-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-category');
      loadProducts();
    });
  });

  // Sort dropdown trigger
  $('sort').addEventListener('change', (e) => {
    activeSort = e.target.value;
    loadProducts();
  });

  // Search input triggers (desktop and mobile)
  const handleSearchInput = (e) => {
    searchQuery = e.target.value;
    loadProducts();
  };
  $('search').addEventListener('input', handleSearchInput);
  $('search-mobile').addEventListener('input', handleSearchInput);

  // Modal closers
  $('modal-close').addEventListener('click', () => $('product-modal').close());
  $('cart-close').addEventListener('click', () => $('cart-modal').close());
  $('checkout-close').addEventListener('click', () => $('checkout-modal').close());

  // Close modals clicking outside
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.firstElementChild.getBoundingClientRect();
      const inCard = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inCard) dialog.close();
    });
  });

  // Cart drawer triggers
  $('cart-btn').addEventListener('click', openCartDrawer);
  
  // Checkout trigger
  $('checkout').addEventListener('click', () => {
    $('cart-modal').close();
    
    // Reset checkout form view states
    $('checkout-form').classList.remove('d-none');
    $('checkout-success').classList.add('d-none');
    $('checkout-form').reset();
    
    $('checkout-modal').showModal();
  });

  // Cart item detail triggers (Add to cart)
  $('modal-add-btn').addEventListener('click', addItemToCart);

  // Review & Specs Tabs switching triggers
  document.querySelectorAll('.modal-tab-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const tabId = trigger.getAttribute('data-tab');
      switchDetailTab(tabId);
    });
  });

  // Form Submissions
  $('review-form').addEventListener('submit', handleReviewSubmit);
  $('checkout-form').addEventListener('submit', handleCheckoutSubmit);
  $('checkout-done-btn').addEventListener('click', () => $('checkout-modal').close());

  // Reset database trigger
  $('reset-db-btn').addEventListener('click', resetDatabase);

  // Mentor console collapsible toggle trigger
  $('mentor-console-trigger').addEventListener('click', () => {
    const body = $('mentor-console-body');
    const arrow = $('mentor-console-arrow');
    body.classList.toggle('active');
    
    if (body.classList.contains('active')) {
      arrow.textContent = '▼';
      syncMentorConsole();
    } else {
      arrow.textContent = '▲';
    }
  });

  // Wire Hero Carousel buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('view-hero-btn')) {
      const id = parseInt(e.target.getAttribute('data-id'));
      if (id) openProductModal(id);
    }
  });

  // Customizer: Part selectors click triggers
  document.querySelectorAll('.part-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.part-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      activeCustomizerPart = btn.getAttribute('data-part');

      // Update swatch active outline matching active color of the part
      const activeColor = customizerColors[activeCustomizerPart];
      document.querySelectorAll('.swatch-btn').forEach(sw => {
        sw.classList.remove('active');
        if (sw.getAttribute('data-color') === activeColor) {
          sw.classList.add('active');
        }
      });

      // Update text
      const colorName = colorNames[activeColor] || activeColor;
      const partText = activeCustomizerPart.replace('shoe-', '').toUpperCase();
      $('part-color-label').textContent = `3. Apply ${colorName} to ${partText}`;
    });
  });

  // Customizer: Swatches click triggers
  document.querySelectorAll('.swatch-btn').forEach(btn => {
    btn.addEventListener('click', handleSwatchClick);
  });

  // Customizer: Add Custom Sneaker to Cart
  $('cust-add-to-cart').addEventListener('click', handleAddCustomToCart);

  // Customizer: Allow direct clicking on SVG shoe paths to select that part
  document.querySelectorAll('.customizer-path').forEach(path => {
    path.addEventListener('click', (e) => {
      e.stopPropagation();
      const partId = path.id;
      
      // Trigger click on corresponding part button
      const partBtn = document.querySelector(`.part-btn[data-part="${partId}"]`);
      if (partBtn) partBtn.click();
    });
  });

  // Promo code apply click trigger
  $('promo-apply-btn').addEventListener('click', applyPromoCode);
}
