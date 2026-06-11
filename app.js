const PRODUCTS_URL = 'products.json';
let products = [];
const $ = id => document.getElementById(id);

async function load(){
  const res = await fetch(PRODUCTS_URL);
  products = await res.json();
  populateFilters();
  render(products);
  restoreCartUI();
}

function populateFilters(){
  const cats = Array.from(new Set(products.map(p=>p.category)));
  const sel = $('category-filter');
  cats.forEach(c=>{ const o = document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
}

function render(list){
  const container = $('products'); container.innerHTML='';
  list.forEach(p=>{
    const card = document.createElement('article'); card.className='card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h3>${p.name}</h3>
      <div class="meta"><div class="badge">${p.brand}</div><div class="price">$${p.price.toFixed(2)}</div></div>
      <div style="margin-top:10px;display:flex;gap:8px;"><button class="view">View</button><button class="add">Add</button></div>
    `;
    card.querySelector('.view').addEventListener('click',()=>openModal(p));
    card.querySelector('.add').addEventListener('click',()=>addToCart(p.id));
    container.appendChild(card);
  });
}

function openModal(p){
  $('product-modal').classList.remove('hidden');
  $('modal-body').innerHTML = `
    <div style="display:flex;gap:18px;align-items:flex-start;">
      <img src="${p.image}" style="width:260px;border-radius:10px;object-fit:cover">
      <div>
        <h2>${p.name}</h2>
        <p><strong>Brand:</strong> ${p.brand}</p>
        <p>${p.description}</p>
        <p><strong>Price:</strong> $${p.price.toFixed(2)}</p>
        <div style="margin-top:12px;"><button id="modal-add">Add to cart</button></div>
      </div>
    </div>
  `;
  $('modal-add').addEventListener('click',()=>{ addToCart(p.id); closeModal(); });
}
function closeModal(){ $('product-modal').classList.add('hidden'); }

function getCart(){ return JSON.parse(localStorage.getItem('sx_cart')||'{}'); }
function saveCart(c){ localStorage.setItem('sx_cart',JSON.stringify(c)); }
function addToCart(id){ const c=getCart(); c[id]=(c[id]||0)+1; saveCart(c); updateCartCount(); }
function updateCartCount(){ const c=getCart(); const total = Object.values(c).reduce((s,n)=>s+n,0); $('cart-count').textContent = total; }

function restoreCartUI(){ updateCartCount(); }

function showCart(){ const c=getCart(); const items = Object.entries(c).map(([id,qty])=>{ const p=products.find(x=>x.id==id); return {p,qty}; });
  const el = $('cart-items'); el.innerHTML=''; let sum=0;
  items.forEach(it=>{ const row = document.createElement('div'); row.className='row'; row.innerHTML = `<div>${it.p.name} × ${it.qty}</div><div>$${(it.qty*it.p.price).toFixed(2)}</div>`; el.appendChild(row); sum += it.qty*it.p.price; });
  $('cart-total').textContent = 'Total: $' + sum.toFixed(2);
  $('cart-modal').classList.remove('hidden');
}

function closeCart(){ $('cart-modal').classList.add('hidden'); }

function wire(){
  $('modal-close').addEventListener('click',closeModal);
  $('cart-btn').addEventListener('click',showCart);
  $('cart-close').addEventListener('click',closeCart);
  $('search').addEventListener('input',e=>{ const q=e.target.value.toLowerCase(); render(products.filter(p=>p.name.toLowerCase().includes(q)||p.brand.toLowerCase().includes(q))); });
  $('category-filter').addEventListener('change',e=>{ const v=e.target.value; render(v==='all'?products:products.filter(p=>p.category===v)); });
  $('sort').addEventListener('change',e=>{ const v=e.target.value; let out=[...products]; if(v==='price-asc') out.sort((a,b)=>a.price-b.price); if(v==='price-desc') out.sort((a,b)=>b.price-a.price); render(out); });
  $('checkout').addEventListener('click',()=>{ alert('Checkout placeholder — integrate a payment provider for production.'); });
}

window.addEventListener('DOMContentLoaded',()=>{ wire(); load(); });
