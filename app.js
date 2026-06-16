const PRODUCTS_URL = '/api/products';
let products = [];
const $ = id => document.getElementById(id);

async function load(){
  try {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) throw new Error('Failed to fetch products');
    products = await res.json();
    populateFilters();
    render(products);
    restoreCartUI();
  } catch (err) {
    console.error(err);
    $('products').innerHTML = '<p class="text-white text-center w-100">Could not load products from the backend API.</p>';
  }
}

function populateFilters(){
  const cats = Array.from(new Set(products.map(p=>p.category)));
  const sel = $('category-filter');
  cats.forEach(c=>{ 
    const o = document.createElement('option'); 
    o.value = c; 
    o.textContent = c; 
    sel.appendChild(o); 
  });
}

function render(list){
  const renderLogic = () => {
    const container = $('products'); 
    container.innerHTML = '';
    
    if(list.length === 0) {
      container.innerHTML = '<p class="text-white text-center w-100">No products found.</p>';
      return;
    }
    
    list.forEach(p=>{
      const card = document.createElement('article'); 
      card.className = 'card';
      
      card.innerHTML = `
        <img src="${p.image}" alt="${p.name}">
        <h3 class="text-white mt-3 mb-2 fs-5">${p.name}</h3>
        <div class="meta d-flex justify-content-between align-items-center mb-3">
          <div class="brand-badge">${p.brand}</div>
          <div class="fw-bold fs-5 text-info" style="color: var(--accent-color) !important;">$${p.price.toFixed(2)}</div>
        </div>
        <div class="d-flex gap-2 mt-auto">
          <button class="btn-view">View</button>
          <button class="btn custom-primary flex-grow-1 btn-add">Add to Cart</button>
        </div>
      `;
      card.querySelector('.btn-view').addEventListener('click', () => openModal(p));
      card.querySelector('.btn-add').addEventListener('click', () => addToCart(p.id));
      container.appendChild(card);
    });
    
    setupObservers();
  };

  if (document.startViewTransition) {
    document.startViewTransition(renderLogic);
  } else {
    renderLogic();
  }
}

function setupObservers() {
  const cards = document.querySelectorAll('.card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => observer.observe(card));
}

function openModal(p){
  const modal = $('product-modal');
  $('modal-body').innerHTML = `
    <div class="row g-4 align-items-center">
      <div class="col-md-6">
        <img src="${p.image}" alt="${p.name}" class="img-fluid rounded-4 w-100" style="object-fit:cover;">
      </div>
      <div class="col-md-6">
        <h2 class="text-white fw-bold mb-2">${p.name}</h2>
        <p class="text-muted mb-3"><strong>Brand:</strong> ${p.brand}</p>
        <p class="text-light">${p.description}</p>
        <div class="fs-2 fw-bold text-info my-4" style="color: var(--accent-color) !important;">$${p.price.toFixed(2)}</div>
        <button id="modal-add" class="btn btn-lg custom-primary w-100">Add to Cart</button>
      </div>
    </div>
  `;
  $('modal-add').addEventListener('click', () => { 
    addToCart(p.id); 
    modal.close(); 
  });
  modal.showModal();
}

function getCart(){ return JSON.parse(localStorage.getItem('sx_cart')||'{}'); }
function saveCart(c){ localStorage.setItem('sx_cart',JSON.stringify(c)); }

function addToCart(id){ 
  const c = getCart(); 
  c[id] = (c[id] || 0) + 1; 
  saveCart(c); 
  updateCartCount(); 
}

function updateCartCount(){ 
  const c = getCart(); 
  const total = Object.values(c).reduce((s,n) => s + n, 0); 
  $('cart-count').textContent = total; 
}

function restoreCartUI(){ updateCartCount(); }

function showCart(){ 
  const c = getCart(); 
  const items = Object.entries(c).map(([id,qty]) => { 
    const p = products.find(x => x.id == id); 
    return {p, qty}; 
  }).filter(it => it.p); // exclude if product not found
  
  const el = $('cart-items'); 
  el.innerHTML = ''; 
  let sum = 0;
  
  if (items.length === 0) {
    el.innerHTML = '<p class="text-muted text-center p-4">Your cart is empty.</p>';
  } else {
    items.forEach(it => { 
      const row = document.createElement('div'); 
      row.className = 'cart-item'; 
      row.innerHTML = `
        <div>
          <strong class="d-block text-white mb-1">${it.p.name}</strong>
          <span class="text-muted small">Qty: ${it.qty}</span>
        </div>
        <div class="fw-bold" style="color: var(--accent-color);">$${(it.qty * it.p.price).toFixed(2)}</div>
      `; 
      el.appendChild(row); 
      sum += it.qty * it.p.price; 
    });
  }
  
  $('cart-total').innerHTML = `<span>Total:</span> <span>$${sum.toFixed(2)}</span>`;
  $('cart-modal').showModal();
}

function closeCart(){ $('cart-modal').close(); }

function wire(){
  $('modal-close').addEventListener('click', () => $('product-modal').close());
  $('cart-btn').addEventListener('click', showCart);
  $('cart-close').addEventListener('click', closeCart);
  
  // Close dialogs when clicking outside
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inDialog) dialog.close();
    });
  });

  $('search').addEventListener('input', e => { 
    const q = e.target.value.toLowerCase(); 
    render(products.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))); 
  });
  
  $('category-filter').addEventListener('change', e => { 
    const v = e.target.value; 
    render(v === 'all' ? products : products.filter(p => p.category === v)); 
  });
  
  $('sort').addEventListener('change', e => { 
    const v = e.target.value; 
    let out = [...products]; 
    if(v === 'price-asc') out.sort((a,b) => a.price - b.price); 
    if(v === 'price-desc') out.sort((a,b) => b.price - a.price); 
    render(out); 
  });
  
  $('checkout').addEventListener('click', () => { 
    alert('Checkout placeholder — integrate a payment provider for production.'); 
  });
}

window.addEventListener('DOMContentLoaded', () => { 
  wire(); 
  load(); 
});
