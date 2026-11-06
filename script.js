
const getUsers = () => JSON.parse(localStorage.getItem("lm_users") || "[]");
const getProducts = () => JSON.parse(localStorage.getItem("lm_products") || "[]");
const getOrders = () => JSON.parse(localStorage.getItem("lm_orders") || "[]");

const save = (key, data) =>
  localStorage.setItem(key, JSON.stringify(data));

let currentUser = JSON.parse(localStorage.getItem("lm_session") || "null");
let selectedCategory = "";

const demoProducts = [
  { id: 1, name: "Fresh Tomatoes", category: "Vegetables", price: 80, shop: "Hari Vegetable Shop", area: "Hadigaun", icon: "🍅" },
  { id: 2, name: "Fresh Milk", category: "Dairy", price: 100, shop: "Local Dairy", area: "Hadigaun", icon: "🥛" },
  { id: 3, name: "Rice 1 KG", category: "Grocery", price: 120, shop: "Kathmandu Kirana", area: "Baneshwor", icon: "🍚" },
  { id: 4, name: "Sports Shoes", category: "Shoes", price: 1800, shop: "City Shoes", area: "Chabahil", icon: "👟" },
  { id: 5, name: "Cotton T-Shirt", category: "Clothing", price: 700, shop: "Fashion House", area: "Thamel", icon: "👕" },
  { id: 6, name: "Mobile Charger", category: "Electronics", price: 450, shop: "Mobile Center", area: "New Road", icon: "🔌" }
];

if (!localStorage.getItem("lm_products")) {
  save("lm_products", demoProducts);
}

function showAuth() {
  document.getElementById("auth").hidden = false;
  document.getElementById("auth").scrollIntoView();
}

function closeAuth() {
  document.getElementById("auth").hidden = true;
}

document.getElementById("role").addEventListener("change", function () {
  document.getElementById("sellerFields").hidden = this.value !== "seller";
});

function registerUser() {
  const role = document.getElementById("role").value;
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const address = document.getElementById("address").value.trim();

  if (!name || !phone || !email || !password || !address) {
    alert("Please complete all required fields.");
    return;
  }

  if (password.length < 6) {
    alert("Password must contain at least 6 characters.");
    return;
  }

  const users = getUsers();

  if (users.some(u => u.email === email || u.phone === phone)) {
    alert("This email or phone number is already registered.");
    return;
  }

  const user = {
    id: Date.now(),
    name, phone, email, password, address, role,
    shop: role === "seller" ? document.getElementById("shop").value.trim() : "",
    pan: role === "seller" ? document.getElementById("pan").value.trim() : "",
    registration: role === "seller" ? document.getElementById("registration").value.trim() : "",
    approved: role === "buyer",
    active: true
  };

  if (role === "seller" && (!user.shop || !user.pan || !user.registration)) {
    alert("Please complete your shop information.");
    return;
  }

  users.push(user);
  save("lm_users", users);

  alert(role === "buyer"
    ? "Registration successful! You can now log in."
    : "Registration submitted! Please wait for Super Admin approval.");

  document.getElementById("auth").hidden = true;
}

function loginUser() {
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  // Demo Super Admin account
  if (email === "admin@localmart.com" && password === "admin123") {
    currentUser = { name: "Super Admin", role: "admin", approved: true };
    startSession();
    return;
  }

  const user = getUsers().find(u =>
    u.email === email && u.password === password
  );

  if (!user) {
    alert("Incorrect email or password.");
    return;
  }

  if (!user.active) {
    alert("Your account has been suspended.");
    return;
  }

  if (!user.approved) {
    alert("Your account is waiting for Super Admin approval.");
    return;
  }

  currentUser = user;
  startSession();
}

function startSession() {
  localStorage.setItem("lm_session", JSON.stringify(currentUser));
  closeAuth();
  document.getElementById("dashboard").hidden = false;
  document.getElementById("dashboard").scrollIntoView();
  renderDashboard();
}

function logout() {
  currentUser = null;
  localStorage.removeItem("lm_session");
  document.getElementById("dashboard").hidden = true;
  window.scrollTo(0, 0);
}

function detectLocation() {
  const output = document.getElementById("location");

  if (!navigator.geolocation) {
    output.textContent = "Location is not supported by this browser.";
    return;
  }

  output.textContent = "Requesting location permission...";

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      output.textContent =
        `Location detected! Latitude: ${lat.toFixed(5)}, Longitude: ${lng.toFixed(5)}`;

      if (currentUser) {
        const users = getUsers();
        const index = users.findIndex(u => u.id === currentUser.id);

        if (index !== -1) {
          users[index].lat = lat;
          users[index].lng = lng;
          save("lm_users", users);
          currentUser = users[index];
          localStorage.setItem("lm_session", JSON.stringify(currentUser));
        }
      }
    },
    () => {
      output.textContent = "Location permission denied or unavailable.";
    }
  );
}

function filterCategory(category) {
  selectedCategory = category;
  document.getElementById("search").value = "";
  renderProducts();
  document.getElementById("products").scrollIntoView();
}

function renderProducts() {
  const search = document.getElementById("search").value.toLowerCase();
  const products = getProducts();

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search) &&
    (!selectedCategory || p.category === selectedCategory)
  );

  document.getElementById("productList").innerHTML = filtered.length
    ? filtered.map(p => `
      <div class="product-card">
        <div class="product-image">${p.icon || "🛍️"}</div>
        <h3>${escapeHTML(p.name)}</h3>
        <p>${escapeHTML(p.shop)} · ${escapeHTML(p.area)}</p>
        <div class="price">Rs. ${Number(p.price).toLocaleString()}</div>
        <button class="primary-btn" onclick="placeOrder(${p.id})">Request Product</button>
      </div>
    `).join("")
    : "<p>No products found.</p>";
}

function placeOrder(productId) {
  if (!currentUser || currentUser.role !== "buyer") {
    alert("Please log in as a buyer to request products.");
    showAuth();
    return;
  }

  const product = getProducts().find(p => p.id === productId);
  if (!product) return;

  const orders = getOrders();

  orders.push({
    id: Date.now(),
    buyerId: currentUser.id,
    buyer: currentUser.name,
    productId: product.id,
    product: product.name,
    shop: product.shop,
    sellerId: product.sellerId || null,
    area: product.area,
    status: "Requested",
    rider: null
  });

  save("lm_orders", orders);
  alert("Your product request has been submitted!");
}

function renderDashboard() {
  document.getElementById("dashboardTitle").textContent =
    currentUser.role.toUpperCase() + " DASHBOARD";

  document.getElementById("welcome").textContent =
    "Welcome, " + currentUser.name;

  const content = document.getElementById("dashboardContent");

  if (currentUser.role === "admin") {
    renderAdmin(content);
  } else if (currentUser.role === "seller") {
    renderSeller(content);
  } else if (currentUser.role === "rider") {
    renderRider(content);
  } else {
    renderBuyer(content);
  }
}

function renderAdmin(content) {
  const users = getUsers();
  const orders = getOrders();

  content.innerHTML = `
    <div class="panel">
      <h3>Platform Overview</h3>
      <p>Buyers: ${users.filter(u => u.role === "buyer").length}</p>
      <p>Sellers: ${users.filter(u => u.role === "seller").length}</p>
      <p>Riders: ${users.filter(u => u.role === "rider").length}</p>
      <p>Total Orders: ${orders.length}</p>
    </div>
    <h3>Account Approval Requests</h3>
    <div id="approvalList"></div>
    <h3>All Registered Users</h3>
    <div id="userList"></div>
    <h3>All Orders</h3>
    <div id="adminOrders"></div>
  `;

  const pending = users.filter(u =>
    (u.role === "seller" || u.role === "rider") && !u.approved
  );

  document.getElementById("approvalList").innerHTML = pending.length
    ? pending.map(u => `
      <div class="panel">
        <b>${escapeHTML(u.name)}</b> (${u.role})
        <p>${escapeHTML(u.email)} | ${escapeHTML(u.phone)}</p>
        <p>${escapeHTML(u.address)}</p>
        <button class="primary-btn" onclick="approveUser(${u.id})">Approve</button>
        <button class="outline-btn" onclick="rejectUser(${u.id})">Reject</button>
      </div>
    `).join("")
    : "<p>No pending approval requests.</p>";

  document.getElementById("userList").innerHTML = users.map(u => `
    <div class="panel">
      <b>${escapeHTML(u.name)}</b> – ${u.role}
      <span class="status">${u.approved ? "Approved" : "Pending"}</span>
      <p>${escapeHTML(u.email)} | ${escapeHTML(u.phone)}</p>
      <button class="outline-btn" onclick="toggleUser(${u.id})">
        ${u.active ? "Suspend" : "Activate"}
      </button>
    </div>
  `).join("");

  document.getElementById("adminOrders").innerHTML = orders.map(o => `
    <div class="panel">
      ${escapeHTML(o.product)} – ${escapeHTML(o.buyer)}
      <p>${escapeHTML(o.shop)} | ${escapeHTML(o.status)}</p>
    </div>
  `).join("") || "<p>No orders yet.</p>";
}

function approveUser(id) {
  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (!user) return;
  user.approved = true;
  save("lm_users", users);
  renderDashboard();
}

function rejectUser(id) {
  if (!confirm("Delete this registration request?")) return;
  save("lm_users", getUsers().filter(u => u.id !== id));
  renderDashboard();
}

function toggleUser(id) {
  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (!user) return;
  user.active = !user.active;
  save("lm_users", users);
  renderDashboard();
}

function renderSeller(content) {
  const products = getProducts().filter(p => p.sellerId === currentUser.id);

  content.innerHTML = `
    <div class="panel">
      <h3>My Shop: ${escapeHTML(currentUser.shop || "My Shop")}</h3>
      <p>Shop Address: ${escapeHTML(currentUser.address)}</p>
      <h3>Add New Product</h3>
      <input id="productName" placeholder="Product Name">
      <input id="productPrice" type="number" placeholder="Product Price">
      <select id="productCategory" class="search">
        <option>Grocery</option>
        <option>Vegetables</option>
        <option>Dairy</option>
        <option>Clothing</option>
        <option>Shoes</option>
        <option>Electronics</option>
      </select>
      <input id="productArea" placeholder="Shop Area">
      <button class="primary-btn" onclick="addProduct()">Add Product</button>
    </div>
    <h3>My Products</h3>
    <div class="panel">
      ${products.map(p => `
        <p>${escapeHTML(p.name)} – Rs. ${p.price}</p>
      `).join("") || "No products added yet."}
    </div>
    <h3>Customer Requests</h3>
    <div id="sellerOrders"></div>
  `;

  const orders = getOrders().filter(o => o.sellerId === currentUser.id);

  document.getElementById("sellerOrders").innerHTML = orders.map(o => `
    <div class="panel">
      <b>${escapeHTML(o.product)}</b>
      <p>Customer: ${escapeHTML(o.buyer)}</p>
      <p>Status: ${escapeHTML(o.status)}</p>
      <button class="primary-btn" onclick="updateOrder(${o.id}, 'Accepted')">Accept</button>
      <button class="outline-btn" onclick="updateOrder(${o.id}, 'Rejected')">Reject</button>
    </div>
  `).join("") || "<p>No customer requests yet.</p>";
}

function addProduct() {
  const name = document.getElementById("productName").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const category = document.getElementById("productCategory").value;
  const area = document.getElementById("productArea").value.trim();

  if (!name || !Number.isFinite(price) || price <= 0 || !area) {
    alert("Please enter valid product details.");
    return;
  }

  const products = getProducts();
  products.push({
    id: Date.now(),
    name, price, category, area,
    shop: currentUser.shop,
    sellerId: currentUser.id,
    icon: "🛍️"
  });

  save("lm_products", products);
  renderDashboard();
  renderProducts();
  alert("Product added successfully!");
}

function renderBuyer(content) {
  const orders = getOrders().filter(o => o.buyerId === currentUser.id);

  content.innerHTML = `
    <div class="panel">
      <h3>My Profile</h3>
      <p>Name: ${escapeHTML(currentUser.name)}</p>
      <p>Address: ${escapeHTML(currentUser.address)}</p>
      <button class="primary-btn" onclick="detectLocation()">Update My Location</button>
    </div>
    <h3>My Orders</h3>
    ${orders.map(o => `
      <div class="panel">
        <b>${escapeHTML(o.product)}</b>
        <p>Shop: ${escapeHTML(o.shop)}</p>
        <p>Status: ${escapeHTML(o.status)}</p>
      </div>
    `).join("") || "<p>You haven't placed any orders yet.</p>"}
  `;
}

function renderRider(content) {
  const orders = getOrders().filter(o =>
    o.status === "Ready for Delivery" || o.rider === currentUser.name
  );

  content.innerHTML = `
    <div class="panel">
      <h3>Rider Profile</h3>
      <p>Name: ${escapeHTML(currentUser.name)}</p>
      <p>Area: ${escapeHTML(currentUser.address)}</p>
      <button class="primary-btn" onclick="detectLocation()">Update Location</button>
    </div>
    <h3>Delivery Requests</h3>
    <div class="panel">
      ${orders.map(o => `
        <p>${escapeHTML(o.product)} – ${escapeHTML(o.area)}</p>
        <p>Customer: ${escapeHTML(o.buyer)}</p>
        <button class="primary-btn" onclick="takeDelivery(${o.id})">Accept Delivery</button>
        <button class="outline-btn" onclick="updateOrder(${o.id}, 'Delivered')">Mark Delivered</button>
      `).join("") || "No delivery requests available."}
    </div>
  `;
}

function takeDelivery(id) {
  const orders = getOrders();
  const order = orders.find(o => o.id === id);
  if (!order || (order.rider && order.rider !== currentUser.name)) return;
  order.rider = currentUser.name;
  order.status = "Out for Delivery";
  save("lm_orders", orders);
  renderDashboard();
}

function updateOrder(id, status) {
  const orders = getOrders();
  const order = orders.find(o => o.id === id);
  if (!order) return;

  if (currentUser.role === "seller" && order.sellerId !== currentUser.id) return;

  if (currentUser.role === "seller" && status === "Accepted") {
    order.status = "Ready for Delivery";
  } else {
    order.status = status;
  }

  save("lm_orders", orders);
  renderDashboard();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

renderProducts();

if (currentUser) {
  if (currentUser.role === "admin" ||
      getUsers().some(u => u.id === currentUser.id && u.approved && u.active)) {
    if (currentUser.role !== "admin") {
      currentUser = getUsers().find(u => u.id === currentUser.id);
    }
    startSession();
  } else {
    logout();
  }
}
