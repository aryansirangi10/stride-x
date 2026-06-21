// StrideX E-Commerce Application State & Logic

const $ = id => document.getElementById(id);

// Application State
let products = [];
let cart = JSON.parse(localStorage.getItem('stridex_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('stridex_wishlist') || '[]');
let activeTheme = localStorage.getItem('stridex_theme') || 'dark';

let activeCategory = 'all';
let activeSort = 'popular';
let searchQuery = '';
let currentProduct = null;
let selectedSize = null;
let selectedColor = null;

// Advanced Filters State
let activeBrands = ['StrideTech', 'TerraFit', 'MetroStep', 'VolleyEdge'];
let activeMaxPrice = 15000;
let activeSizeFilter = 'all';
let activeColorFilter = 'all';

// Compare State
let compareList = [];

// Authentication User Session State
let currentUser = JSON.parse(localStorage.getItem('stridex_user') || 'null');

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
  initTheme();
  wireEventListeners();
  loadProducts();
  updateCartUI();
  updateWishlistUI();
  initAuthUI();
  updateCompareUI();
  syncMentorConsole();
  setupCustomizerDefaultColors();
  setupStripeCardInputs();
});

// Theme Management
function initTheme() {
  if (activeTheme === 'light') {
    document.body.classList.add('light-theme');
    $('theme-icon').textContent = '🌙';
  } else {
    document.body.classList.remove('light-theme');
    $('theme-icon').textContent = '☀️';
  }
}

function toggleTheme() {
  if (activeTheme === 'dark') {
    activeTheme = 'light';
  } else {
    activeTheme = 'dark';
  }
  localStorage.setItem('stridex_theme', activeTheme);
  initTheme();
}

// User Session UI Initialization
function initAuthUI() {
  const dropdown = $('auth-dropdown');
  const btnText = $('auth-btn-text');
  const profileTitle = $('user-profile-title');

  if (currentUser) {
    btnText.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
    profileTitle.textContent = currentUser.email;
  } else {
    btnText.textContent = 'Sign In';
    profileTitle.textContent = 'Guest User';
  }
}

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
    
    // Apply client-side multi-facet filters
    applyClientFilters();
  } catch (err) {
    console.error(err);
    productsContainer.innerHTML = `
      <div class="text-center w-100 py-5">
        <p class="text-danger">Error loading shoe collection. Please try resetting the database.</p>
      </div>
    `;
  }
}

// Client Side Filter Processing
function applyClientFilters() {
  let filtered = products;

  // Filter by Brand checkbox selections
  filtered = filtered.filter(p => activeBrands.includes(p.brand));

  // Filter by Max Price
  filtered = filtered.filter(p => p.price <= activeMaxPrice);

  // Filter by Size availability
  if (activeSizeFilter !== 'all') {
    filtered = filtered.filter(p => p.sizes.split(',').includes(activeSizeFilter));
  }

  // Filter by Color options
  if (activeColorFilter !== 'all') {
    filtered = filtered.filter(p => p.colors.toLowerCase().includes(activeColorFilter.toLowerCase()));
  }

  renderProducts(filtered);
  populateCustomizerDropdown();
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

    // Update Wishlist button visual state in modal
    const isWishlisted = wishlist.some(p => p.id === currentProduct.id);
    const wishlistBtn = $('modal-wishlist-btn');
    if (isWishlisted) {
      wishlistBtn.textContent = '❤️';
      wishlistBtn.title = 'Remove from Wishlist';
      wishlistBtn.style.color = '#ef4444';
    } else {
      wishlistBtn.textContent = '🤍';
      wishlistBtn.title = 'Add to Wishlist';
      wishlistBtn.style.color = '';
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

// Wishlist Logic
function toggleWishlist(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const idx = wishlist.findIndex(p => p.id === productId);
  if (idx > -1) {
    wishlist.splice(idx, 1);
  } else {
    wishlist.push(prod);
  }
  localStorage.setItem('stridex_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
}

function updateWishlistUI() {
  $('wishlist-count').textContent = wishlist.length;

  const container = $('wishlist-items');
  container.innerHTML = '';

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 w-100">
        <p class="text-muted">Your saved wishlist is empty.</p>
      </div>
    `;
    return;
  }

  wishlist.forEach(p => {
    const card = document.createElement('div');
    card.className = 'wishlist-item-card';
    card.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}" class="wishlist-item-img">
      <div class="wishlist-item-details">
        <div class="wishlist-item-brand">${p.brand}</div>
        <div class="wishlist-item-name">${p.name}</div>
        <div class="wishlist-item-price">₹${p.price.toFixed(2)}</div>
      </div>
      <div class="wishlist-item-actions">
        <button class="wishlist-item-add-btn" data-id="${p.id}">Add to Cart</button>
        <button class="wishlist-item-remove-btn" data-id="${p.id}">Remove</button>
      </div>
    `;

    // Bind item wishlist actions
    card.querySelector('.wishlist-item-add-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openProductModal(p.id);
      $('wishlist-modal').close();
    });

    card.querySelector('.wishlist-item-remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(p.id);
    });

    container.appendChild(card);
  });
}

function handleModalWishlistToggle() {
  if (!currentProduct) return;
  toggleWishlist(currentProduct.id);

  // Update modal icon status
  const isWishlisted = wishlist.some(p => p.id === currentProduct.id);
  const btn = $('modal-wishlist-btn');
  if (isWishlisted) {
    btn.textContent = '❤️';
    btn.style.color = '#ef4444';
  } else {
    btn.textContent = '🤍';
    btn.style.color = '';
  }
}

// Autocomplete suggestions search logic
function showSearchSuggestions(inputEl, suggestionsEl) {
  const text = inputEl.value.trim().toLowerCase();
  if (!text) {
    suggestionsEl.classList.add('d-none');
    return;
  }

  // Filter products by search text matching name or brand
  const matches = products.filter(p => 
    p.name.toLowerCase().includes(text) || 
    p.brand.toLowerCase().includes(text) || 
    p.category.toLowerCase().includes(text)
  );

  if (matches.length === 0) {
    suggestionsEl.classList.add('d-none');
    return;
  }

  suggestionsEl.innerHTML = matches.slice(0, 5).map(p => `
    <div class="suggestion-item" data-id="${p.id}">
      <img src="${p.image_url}" class="suggestion-thumb" alt="${p.name}">
      <div class="suggestion-info">
        <span class="suggestion-title">${p.name}</span>
        <span class="suggestion-meta">${p.brand} | ₹${p.price.toLocaleString()}</span>
      </div>
      <span class="suggestion-price">🥾</span>
    </div>
  `).join('');

  suggestionsEl.classList.remove('d-none');

  // Bind clicks on suggestions
  suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const pId = parseInt(item.getAttribute('data-id'));
      openProductModal(pId);
      suggestionsEl.classList.add('d-none');
      inputEl.value = '';
    });
  });
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
  submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Validating with Stripe Card Gateways...';

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
    // Artificial 2-second delay to show high-fidelity loading verification transition
    await new Promise(resolve => setTimeout(resolve, 2000));

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

        // Interactive status select list dropdown control for mentor updates
        const statuses = ['Processing', 'Shipped', 'Delivered'];
        const selectOptions = statuses.map(st => 
          `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`
        ).join('');

        tr.innerHTML = `
          <td><code class="text-warning">#${o.id}</code></td>
          <td>
            <div class="fw-semibold text-white">${o.customer_name}</div>
            <div class="text-muted small">${o.customer_email}</div>
          </td>
          <td>${itemsHtml}</td>
          <td>
            <strong class="text-white d-block mb-1">₹${o.total_price.toFixed(2)}</strong>
            <select class="form-select sort-select py-1 px-2 border-secondary text-white rounded bg-dark order-status-updater" data-id="${o.id}" style="font-size: 11px;">
              ${selectOptions}
            </select>
          </td>
          <td>
            <div>${new Date(o.created_at).toLocaleDateString()}</div>
            <div class="text-muted small">${timeStr}</div>
          </td>
        `;
        ordersBody.appendChild(tr);
      });

      // Bind dynamic change listener to dropdowns
      document.querySelectorAll('.order-status-updater').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const orderId = e.target.getAttribute('data-id');
          const newStatus = e.target.value;
          await updateOrderStatusInDb(orderId, newStatus);
        });
      });
    }

    // 2. Fetch products details for catalog stock checking
    const resProducts = await fetch('/api/products?sort=popular');
    if (!resProducts.ok) throw new Error();
    const productsList = await resProducts.json();

    const productsBody = $('products-table-body');
    productsBody.innerHTML = '';

    productsList.forEach(p => {
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
          <div class="d-flex align-items-center gap-2">
            <input type="number" class="form-control text-white bg-dark border-secondary px-2 py-1 text-center product-stock-input" data-id="${p.id}" value="${p.stock}" style="width: 70px; font-size: 12px;">
            <span class="admin-badge fw-bold" style="background-color: rgba(255,255,255,0.05); color: ${stockBadgeColor}; border: 1px solid rgba(255,255,255,0.05);">
              Units
            </span>
          </div>
        </td>
      `;
      productsBody.appendChild(tr);
    });

    // Bind stock inputs
    document.querySelectorAll('.product-stock-input').forEach(inp => {
      inp.addEventListener('change', async (e) => {
        const prodId = e.target.getAttribute('data-id');
        const newStock = parseInt(e.target.value) || 0;
        await updateProductStockInDb(prodId, newStock);
      });
    });

    // Calculate Summary statistics
    renderMentorSummary(orders);

  } catch (err) {
    console.warn("Failed to synchronize mentor database tables logs", err);
  }
}

// Calculate and render dashboard stats in Mentor Console
function renderMentorSummary(orders) {
  let revenue = 0;
  orders.forEach(o => {
    revenue += o.total_price;
  });

  const avgOrder = orders.length > 0 ? (revenue / orders.length) : 0;
  
  // Find or insert summary row in mentor console
  let summaryRow = $('mentor-console-summary');
  if (!summaryRow) {
    summaryRow = document.createElement('div');
    summaryRow.id = 'mentor-console-summary';
    summaryRow.className = 'row g-3 mb-4';
    $('mentor-console-body').insertBefore(summaryRow, $('mentor-console-body').firstChild);
  }

  summaryRow.innerHTML = `
    <div class="col-sm-4">
      <div class="p-3 bg-dark border border-secondary rounded text-center">
        <div class="text-muted small text-uppercase fw-bold tracking-wider">Total Sales Revenue</div>
        <div class="h4 text-accent fw-bold mt-1">₹${revenue.toFixed(2)}</div>
      </div>
    </div>
    <div class="col-sm-4">
      <div class="p-3 bg-dark border border-secondary rounded text-center">
        <div class="text-muted small text-uppercase fw-bold tracking-wider">Total Transactions</div>
        <div class="h4 text-white fw-bold mt-1">${orders.length} Orders</div>
      </div>
    </div>
    <div class="col-sm-4">
      <div class="p-3 bg-dark border border-secondary rounded text-center">
        <div class="text-muted small text-uppercase fw-bold tracking-wider">Average Ticket Size</div>
        <div class="h4 text-white fw-bold mt-1">₹${avgOrder.toFixed(2)}</div>
      </div>
    </div>
  `;
}

// Backend update status API call
async function updateOrderStatusInDb(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error();
    syncMentorConsole();
  } catch (err) {
    alert("Could not update order status on SQLite backend.");
  }
}

// Backend update stock API call
async function updateProductStockInDb(prodId, stock) {
  try {
    const res = await fetch(`/api/products/${prodId}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock })
    });
    if (!res.ok) throw new Error();
    loadProducts();
    syncMentorConsole();
  } catch (err) {
    alert("Could not update product stock on SQLite backend.");
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
    wishlist = [];
    promoDiscount = 0.0;
    compareList = [];
    $('promo-input').value = '';
    $('promo-active-msg').classList.add('d-none');
    saveCart();
    updateCartUI();
    updateWishlistUI();
    updateCompareUI();

    // Reload layouts
    loadProducts();
    syncMentorConsole();
    
    // Close active modals
    $('product-modal').close();
    $('cart-modal').close();
    $('checkout-modal').close();
    $('wishlist-modal').close();
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
  if (!select || select.children.length > 0) return; // already populated

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
  document.querySelectorAll('.swatches-grid .swatch-btn').forEach(el => el.classList.remove('active'));
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

  // Trigger brief rotate animation in Customizer SVG to represent 3D render feedback
  const svg = $('customizer-svg');
  svg.style.transition = 'transform 0.5s ease';
  svg.style.transform = 'rotate(-5deg) scale(1.02)';
  setTimeout(() => {
    svg.style.transform = 'rotate(0deg) scale(1)';
  }, 400);
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
  
  alert(`Bespoke ${baseShoe.name} added to shopping drawer with a +₹1,500 custom laboratory dye premium!`);
}

// User Authentication handler
function handleAuthSubmit(e) {
  e.preventDefault();
  const email = $('auth-email').value.trim();
  const name = email.split('@')[0];

  // Set mock member credentials session
  currentUser = {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    email: email,
    size: '10',
    address: '123 StrideX Way, Silicon Valley'
  };

  localStorage.setItem('stridex_user', JSON.stringify(currentUser));
  initAuthUI();
  $('auth-modal').close();
  $('auth-dropdown').style.display = 'none';

  // Prefill default checkout fields
  $('cust-name').value = currentUser.name;
  $('cust-email').value = currentUser.email;
  $('cust-address').value = currentUser.address;

  alert(`Welcome, ${currentUser.name}! You are now signed in.`);
}

// User Profile management
function handleProfileSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  currentUser.name = $('profile-name').value;
  currentUser.address = $('profile-address').value;
  currentUser.size = $('profile-size').value;

  localStorage.setItem('stridex_user', JSON.stringify(currentUser));
  initAuthUI();
  $('profile-modal').close();

  // Update prefilled forms
  $('cust-name').value = currentUser.name;
  $('cust-address').value = currentUser.address;

  alert("Profile preferences successfully saved!");
}

// User Profile logout
function handleLogout() {
  currentUser = null;
  localStorage.removeItem('stridex_user');
  initAuthUI();
  $('auth-dropdown').style.display = 'none';

  // Clear checkout forms
  $('cust-name').value = '';
  $('cust-email').value = '';
  $('cust-address').value = '';

  alert("You have logged out of your session.");
}

// Product Comparison logics
function handleProductCompareToggle(e) {
  e.stopPropagation();
  if (!currentProduct) return;

  const exists = compareList.some(p => p.id === currentProduct.id);
  if (exists) {
    compareList = compareList.filter(p => p.id !== currentProduct.id);
  } else {
    if (compareList.length >= 3) {
      alert("You can compare a maximum of 3 shoes at a time.");
      return;
    }
    compareList.push(currentProduct);
  }

  updateCompareUI();
  $('product-modal').close();
}

function removeCompareItem(prodId) {
  compareList = compareList.filter(p => p.id !== prodId);
  updateCompareUI();
}

function updateCompareUI() {
  // Badges update
  $('compare-badge-count').textContent = compareList.length;
  $('compare-btn-count').textContent = compareList.length;

  const compareBar = $('compare-bar');
  const thumbsContainer = $('compare-thumbnails');
  thumbsContainer.innerHTML = '';

  if (compareList.length === 0) {
    compareBar.classList.add('d-none');
    return;
  }

  compareBar.classList.remove('d-none');

  compareList.forEach(p => {
    const wrapper = document.createElement('div');
    wrapper.className = 'position-relative';
    wrapper.innerHTML = `
      <img src="${p.image_url}" class="compare-thumb" alt="${p.name}">
      <button class="position-absolute bg-danger text-white border-0 rounded-circle small d-flex align-items-center justify-content-center text-center px-1" 
              style="width: 16px; height: 16px; top: -5px; right: -5px; font-size: 8px; cursor: pointer;" 
              onclick="removeCompareItem(${p.id})">&times;</button>
    `;
    thumbsContainer.appendChild(wrapper);
  });
}

// Build and show compare table inside modal
function showCompareModal() {
  if (compareList.length === 0) return;

  const head = $('compare-table-head');
  const body = $('compare-table-body');

  head.innerHTML = `<th>Features / Spec</th>` + compareList.map(p => `
    <th>
      <img src="${p.image_url}" alt="${p.name}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 6px;"><br>
      <span class="small fw-bold text-white">${p.name}</span>
    </th>
  `).join('');

  const specs = [
    { label: "Price", key: "price", format: val => `₹${val.toFixed(2)}` },
    { label: "Brand", key: "brand" },
    { label: "Category", key: "category" },
    { label: "Rating Stars", key: "rating", format: val => `${getStarRatingHTML(val)} (${val} ★)` },
    { label: "Sizes (US)", key: "sizes" },
    { label: "Colors Available", key: "colors" },
    { label: "Description", key: "description", wrap: true }
  ];

  body.innerHTML = specs.map(sp => {
    let cells = compareList.map(p => {
      let val = p[sp.key];
      if (sp.format) val = sp.format(val);
      return `<td class="${sp.wrap ? 'small text-muted text-start' : 'small text-white'}" style="${sp.wrap ? 'min-width: 180px; line-height: 1.4;' : ''}">${val}</td>`;
    }).join('');
    return `<tr><td class="fw-semibold text-secondary small text-start">${sp.label}</td>${cells}</tr>`;
  }).join('');

  $('compare-modal').showModal();
}

// User Tracking timeline renderer
async function renderOrderTracking(orderId) {
  const container = $('tracking-content');
  container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-warning" role="status"></div></div>`;

  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error();
    const orders = await res.json();

    const order = orders.find(o => o.id === orderId);
    if (!order) {
      container.innerHTML = `<p class="text-danger text-center">Order not found.</p>`;
      return;
    }

    // Determine status stages completion state
    // Stages: Processing -> Shipped -> Delivered
    const steps = [
      { key: 'Processing', title: 'Nitrogen foam compound prep (Processing)', icon: '🧪' },
      { key: 'Shipped', title: 'Express priority air dispatch (Shipped)', icon: '✈️' },
      { key: 'Delivered', title: 'Hand delivered & signed (Delivered)', icon: '📦' }
    ];

    let currentIdx = steps.findIndex(st => st.key === order.status);
    if (currentIdx === -1) currentIdx = 0; // fallback

    let stepsMarkup = steps.map((st, idx) => {
      let statusClass = '';
      if (idx < currentIdx) {
        statusClass = 'completed';
      } else if (idx === currentIdx) {
        statusClass = 'active';
      }
      return `
        <div class="tracking-step ${statusClass}">
          <div class="tracking-icon">${st.icon}</div>
          <div class="tracking-label">
            <div class="fw-bold">${st.key}</div>
            <div class="small text-muted mt-1" style="font-size: 11.5px;">${st.title}</div>
          </div>
        </div>
      `;
    }).join('');

    // Compute progress line height percent
    let progressPercent = 0;
    if (currentIdx === 1) progressPercent = 50;
    if (currentIdx === 2) progressPercent = 100;

    container.innerHTML = `
      <div class="p-3 bg-dark border border-secondary rounded-4 mb-4">
        <div class="row g-2 small">
          <div class="col-6"><strong>Order ID:</strong> <code class="text-warning">#${order.id}</code></div>
          <div class="col-6 text-end"><strong>Amount:</strong> ₹${order.total_price.toFixed(2)}</div>
          <div class="col-12 mt-1"><strong>Invoice Customer:</strong> ${order.customer_name} (${order.customer_email})</div>
        </div>
      </div>

      <div class="tracking-timeline">
        <div class="tracking-line-bar"></div>
        <div class="tracking-line-progress" style="height: ${progressPercent}%;"></div>
        ${stepsMarkup}
      </div>
    `;

  } catch (err) {
    container.innerHTML = `<p class="text-danger text-center">Failed to fetch live order tracking.</p>`;
  }
}

// User Profile Orders History list
async function loadUserOrdersHistory() {
  if (!currentUser) {
    alert("Please sign in to access tracking dashboards.");
    return;
  }

  const container = $('orders-list-content');
  container.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-warning" role="status"></div></div>`;

  $('orders-list-modal').showModal();

  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error();
    const allOrders = await res.json();

    // Filter user's email orders
    const userOrders = allOrders.filter(o => o.customer_email.toLowerCase() === currentUser.email.toLowerCase());

    if (userOrders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <p class="text-muted">No custom orders found matching email: <code>${currentUser.email}</code></p>
        </div>
      `;
      return;
    }

    container.innerHTML = userOrders.map(o => {
      const itemsText = o.items.map(it => 
        `<span class="badge bg-secondary me-2 mt-1">${it.product_name} (US ${it.size} - ${it.color}) x${it.quantity}</span>`
      ).join('');

      const statusBadge = o.status === 'Delivered' ? 'bg-success' : (o.status === 'Shipped' ? 'bg-info' : 'bg-warning');

      return `
        <div class="order-list-item">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <span class="fw-bold text-white small">Order ID:</span>
              <code class="text-warning">#${o.id}</code>
            </div>
            <span class="badge ${statusBadge}">${o.status}</span>
          </div>
          <div class="text-muted small mb-2">${new Date(o.created_at).toLocaleDateString()} at ${new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          <div class="mb-3">${itemsText}</div>
          <div class="d-flex justify-content-between align-items-center border-top border-secondary pt-2 mt-2">
            <span class="fw-bold text-accent">Total: ₹${o.total_price.toFixed(2)}</span>
            <button class="btn-accent py-1 px-3 small tracking-details-btn" data-id="${o.id}" style="font-size: 11.5px;">Track Order</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind event listeners to track details button clicks
    container.querySelectorAll('.tracking-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = parseInt(e.target.getAttribute('data-id'));
        $('orders-list-modal').close();
        renderOrderTracking(orderId);
        $('tracking-modal').showModal();
      });
    });

  } catch (err) {
    container.innerHTML = `<p class="text-danger text-center">Failed to load order history list.</p>`;
  }
}

// Setup Stripe Mockup credit card flipping & input key listeners
function setupStripeCardInputs() {
  const card = $('checkout-modal').querySelector('.credit-card');
  const cardNumDisplay = $('card-number-display');
  
  if (!card) return;

  // Real-time Credit Card Display update bindings
  $('card-number').addEventListener('input', (e) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = val.match(/\d{4,16}/g);
    let match = matches && matches[0] || '';
    let parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      e.target.value = parts.join(' ');
      cardNumDisplay.textContent = parts.join(' ');
    } else {
      e.target.value = val;
      cardNumDisplay.textContent = val || '4111 2222 3333 4444';
    }
  });

  // Expiry focus flips / updates front
  $('card-expiry').addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      e.target.value = val.substring(0,2) + '/' + val.substring(2,4);
    }
  });

  // CVC focus flips card to back, blur flips card to front
  $('card-cvc').addEventListener('focus', () => {
    card.classList.add('flipped');
  });
  $('card-cvc').addEventListener('blur', () => {
    card.classList.remove('flipped');
  });
  $('card-cvc').addEventListener('input', (e) => {
    $('card-signature-area').textContent = '*'.repeat(e.target.value.length);
  });
}

// chatbot styling logic advisor conversations
function handleSupportChatSubmit(e) {
  e.preventDefault();
  const inputEl = $('support-chat-input');
  const body = $('support-chat-body');
  const val = inputEl.value.trim();

  if (!val) return;

  // Render User Msg
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.textContent = val;
  body.appendChild(userMsg);

  inputEl.value = '';
  body.scrollTop = body.scrollHeight;

  // Bot response mapping
  setTimeout(() => {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    
    const query = val.toLowerCase();
    let reply = "I'm not sure about that model, but you can customized any StrideX shoe inside the Bespoke Sneaker Lab using champagne dye swatches.";

    if (query.includes('size') || query.includes('sizing')) {
      reply = "Our luxury shoes fit true to size (standard US widths). We recommend choosing your standard athletic running shoe size. You can also save a preferred sizing in your profile.";
    } else if (query.includes('shipping') || query.includes('delivery')) {
      reply = "We offer complimentary express air delivery on orders above ₹12,000. Orders below qualify for a ₹1,200 flat delivery premium. Custom colors take 3-5 curing days.";
    } else if (query.includes('coupon') || query.includes('promo') || query.includes('discount')) {
      reply = "To test coupon calculations, type MENTOR10 into the shopping drawer coupon box for a 10% invoice deduction!";
    } else if (query.includes('price') || query.includes('cost') || query.includes('cheap')) {
      reply = "Our collection starts from ₹6,999 (AquaDunk Hydro) up to ₹13,999 (VeloSpeed Pro). Creating custom bespoke dye colorways adds a +₹1,500 lab treatment premium.";
    } else if (query.includes('squat') || query.includes('lift') || query.includes('gym')) {
      reply = "I highly recommend the StrideTech ApexLift 500! It features flat zero-compression soles and midfoot strap anchors ideal for squats, deadlifts, and power cleans.";
    } else if (query.includes('run') || query.includes('marathon') || query.includes('foam')) {
      reply = "The StrideTech AeroRun 300 is our premier speed silhouette, utilizing a nitrogen-infused supercritical foam midsole for maximum energy rebound.";
    }

    botMsg.textContent = reply;
    body.appendChild(botMsg);
    body.scrollTop = body.scrollHeight;
  }, 1000);
}

// AI Advisor main trigger banner matches styling recommendations
function handleAiAdvisorTrigger() {
  const widget = $('support-chat');
  widget.classList.remove('d-none');

  const body = $('support-chat-body');
  const botMsg = document.createElement('div');
  botMsg.className = 'chat-msg bot';

  let matchStr = "ApexLift 500 (Brushed Gold/Black)";
  if (activeCategory === 'Running') matchStr = "AeroRun 300 (Ice White/Cobalt)";
  if (activeCategory === 'Trail') matchStr = "TrailMaster X (Forest Green/Amber)";
  if (activeCategory === 'Casual') matchStr = "UrbanFlex Lo (Off-White/Tan)";
  if (activeCategory === 'Sport') matchStr = "VeloSpeed Pro (Gloss White/Red)";

  botMsg.textContent = `✨ AI Recommendation Engine Matching: Based on your filter category '${activeCategory}' and price range, I suggest trying the custom colorways on the ${matchStr}. You can adjust uppers or soles to matches details perfectly.`;
  body.appendChild(botMsg);
  body.scrollTop = body.scrollHeight;
}

// Event Listeners Mapping
function wireEventListeners() {
  // Theme Toggle Listener
  $('theme-toggle-btn').addEventListener('click', toggleTheme);

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

  // Search input autocomplete triggers (desktop and mobile)
  $('search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    showSearchSuggestions(e.target, $('search-suggestions'));
    loadProducts();
  });
  $('search-mobile').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    showSearchSuggestions(e.target, $('search-suggestions-mobile'));
    loadProducts();
  });

  // Hide search suggestions on document body clicks
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search') && !e.target.closest('#search-suggestions')) {
      $('search-suggestions').classList.add('d-none');
    }
    if (!e.target.closest('#search-mobile') && !e.target.closest('#search-suggestions-mobile')) {
      $('search-suggestions-mobile').classList.add('d-none');
    }
  });

  // Modal closers
  $('modal-close').addEventListener('click', () => $('product-modal').close());
  $('cart-close').addEventListener('click', () => $('cart-modal').close());
  $('checkout-close').addEventListener('click', () => $('checkout-modal').close());
  $('auth-close').addEventListener('click', () => $('auth-modal').close());
  $('profile-close').addEventListener('click', () => $('profile-modal').close());
  $('compare-close').addEventListener('click', () => $('compare-modal').close());
  $('tracking-close').addEventListener('click', () => $('tracking-modal').close());
  $('orders-list-close').addEventListener('click', () => $('orders-list-modal').close());
  $('wishlist-close').addEventListener('click', () => $('wishlist-modal').close());

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
  
  // Wishlist drawer triggers
  $('wishlist-btn').addEventListener('click', () => {
    updateWishlistUI();
    $('wishlist-modal').showModal();
  });

  // Checkout trigger
  $('checkout').addEventListener('click', () => {
    $('cart-modal').close();
    
    // Reset checkout form view states
    $('checkout-form').classList.remove('d-none');
    $('checkout-success').classList.add('d-none');
    $('checkout-form').reset();

    // Prefill checkout if user logged in
    if (currentUser) {
      $('cust-name').value = currentUser.name;
      $('cust-email').value = currentUser.email;
      $('cust-address').value = currentUser.address;
    }
    
    $('checkout-modal').showModal();
  });

  // Cart item detail triggers (Add to cart)
  $('modal-add-btn').addEventListener('click', addItemToCart);

  // Wishlist item detail triggers
  $('modal-wishlist-btn').addEventListener('click', handleModalWishlistToggle);

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
      document.querySelectorAll('.swatches-grid .swatch-btn').forEach(sw => {
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
  document.querySelectorAll('.swatches-grid .swatch-btn').forEach(btn => {
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

  // Authentication Toggles & Dropdowns
  $('auth-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentUser) {
      // Clear form inputs
      $('auth-form').reset();
      $('auth-modal').showModal();
    } else {
      const dd = $('auth-dropdown');
      dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
    }
  });

  // Hide Dropdown clicking elsewhere
  document.addEventListener('click', () => {
    $('auth-dropdown').style.display = 'none';
  });

  $('auth-form').addEventListener('submit', handleAuthSubmit);
  $('logout-btn').addEventListener('click', handleLogout);

  // User Profile dialog triggers
  $('view-profile-btn').addEventListener('click', (e) => {
    e.preventDefault();
    if (!currentUser) return;
    $('profile-name').value = currentUser.name;
    $('profile-address').value = currentUser.address;
    $('profile-size').value = currentUser.size;
    $('profile-name-display').textContent = currentUser.name;
    $('profile-modal').showModal();
  });
  $('profile-form').addEventListener('submit', handleProfileSubmit);

  // Order List tracking triggers
  $('view-orders-btn').addEventListener('click', (e) => {
    e.preventDefault();
    loadUserOrdersHistory();
  });

  // Product Comparison Triggers
  $('modal-compare-btn').addEventListener('click', handleProductCompareToggle);
  $('compare-trigger-btn').addEventListener('click', showCompareModal);
  $('view-compare-btn').addEventListener('click', (e) => {
    e.preventDefault();
    showCompareModal();
  });
  $('compare-clear-btn').addEventListener('click', () => {
    compareList = [];
    updateCompareUI();
  });

  // Advanced filters checkbox brand list
  document.querySelectorAll('.brand-checkbox').forEach(chk => {
    chk.addEventListener('change', () => {
      activeBrands = Array.from(document.querySelectorAll('.brand-checkbox:checked')).map(el => el.value);
      applyClientFilters();
    });
  });

  // Advanced price range slider
  $('price-range').addEventListener('input', (e) => {
    activeMaxPrice = parseInt(e.target.value);
    $('price-slider-value').textContent = `₹${activeMaxPrice.toLocaleString()}`;
    applyClientFilters();
  });

  // Advanced size filter buttons
  document.querySelectorAll('.filter-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-size-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      activeSizeFilter = btn.getAttribute('data-size');
      applyClientFilters();
    });
  });

  // Advanced color filter buttons
  document.querySelectorAll('.filter-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-color-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      activeColorFilter = btn.getAttribute('data-color');
      applyClientFilters();
    });
  });

  // Reset/Clear Filters button
  $('clear-filters-btn').addEventListener('click', () => {
    // Reset check state
    document.querySelectorAll('.brand-checkbox').forEach(el => el.checked = true);
    activeBrands = ['StrideTech', 'TerraFit', 'MetroStep', 'VolleyEdge'];

    // Reset range slider
    $('price-range').value = 15000;
    activeMaxPrice = 15000;
    $('price-slider-value').textContent = `₹15,000`;

    // Reset size buttons
    document.querySelectorAll('.filter-size-btn').forEach(el => el.classList.remove('active'));
    document.querySelector('.filter-size-btn[data-size="all"]').classList.add('active');
    activeSizeFilter = 'all';

    // Reset color buttons
    document.querySelectorAll('.filter-color-btn').forEach(el => el.classList.remove('active'));
    document.querySelector('.filter-color-btn[data-color="all"]').classList.add('active');
    activeColorFilter = 'all';

    applyClientFilters();
  });

  // Live support styling advisor forms
  $('support-chat-form').addEventListener('submit', handleSupportChatSubmit);
  
  // Toggle support floating panel chat
  $('support-toggle').addEventListener('click', () => {
    const chat = $('support-chat');
    chat.classList.toggle('d-none');
  });
  $('support-chat-close').addEventListener('click', () => {
    $('support-chat').classList.add('d-none');
  });

  $('ai-advisor-trigger').addEventListener('click', handleAiAdvisorTrigger);
}
