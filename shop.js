let cart = [];
let cartCount = 0;
let cartTotal = 0;

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadCartFromServer();
    loadProducts();
    
    // Set up cart event listeners
    document.querySelector('.checkout-btn')?.addEventListener('click', handleCheckout);
    document.querySelector('.close-cart')?.addEventListener('click', toggleCart);
});

// Load cart from server
async function loadCartFromServer() {
    try {
        const response = await fetch('/api/cart', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            cart = data.items || [];
            updateCartMetrics();
            updateCartUI();
        }
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// Save cart to server
async function saveCartToServer() {
    try {
        const response = await fetch('/api/cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ items: cart })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save cart');
        }
    } catch (error) {
        console.error('Error saving cart:', error);
        // Fallback to localStorage if server save fails
        localStorage.setItem('cart', JSON.stringify(cart));
    }
}

function updateCartMetrics() {
    cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Enhanced product loading
async function loadProducts() {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        const response = await fetch('/api/products');
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load products');
        }
        
        const products = await response.json();
        
        if (products.length === 0) {
            productList.innerHTML = `
                <div class="no-products">
                    <p>No products available yet.</p>
                    <a href="sell.html" class="sell-link">Be the first to list a product!</a>
                </div>
            `;
            return;
        }
        
        renderProducts(products);
    } catch (error) {
        console.error('Product loading error:', error);
        showError(`Failed to load products: ${error.message}`);
        productList.innerHTML = `
            <div class="error-message">
                <p>Failed to load products. Please try again later.</p>
                <button class="retry-btn" onclick="loadProducts()">Retry</button>
            </div>
        `;
    }
}

function renderProducts(products) {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Find if this product is already in cart
        const cartItem = cart.find(item => item.productId === product._id);
        const cartQuantity = cartItem ? cartItem.quantity : 0;
        
        productCard.innerHTML = `
            <img src="${product.image || 'assets/placeholder-product.jpg'}" 
                 alt="${product.name || 'Product image'}" 
                 onerror="this.src='assets/placeholder-product.jpg'">
            <div class="product-info">
                <h2>${product.name || 'Unnamed Product'}</h2>
                <p>Category: ${product.category || 'Uncategorized'}</p>
                <p>Price: ₹${(product.price || 0).toFixed(2)}</p>
                <div class="product-actions">
                    <button class="add-to-cart" 
                            onclick="addToCart('${product._id}', '${escapeString(product.name)}', 
                            ${product.price || 0}, '${product.image || ''}', this)"
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        ${cartQuantity > 0 ? `Add to Cart (${cartQuantity})` : 'Add to Cart'}
                        ${product.stock <= 0 ? '<br><small>Out of Stock</small>' : ''}
                    </button>
                    <button class="view-details" 
                            onclick="viewProductDetails('${product._id}')">
                        View Details
                    </button>
                </div>
            </div>
        `;
        productList.appendChild(productCard);
    });
}

// Helper function to escape strings for HTML
function escapeString(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'")
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n');
}

// View Product Details function
function viewProductDetails(productId) {
    if (!productId) return;
    localStorage.setItem('currentProductId', productId);
    window.location.href = 'view.html';
}

async function addToCart(productId, productName, price, imgSrc, button) {
    try {
        let existingItem = cart.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ 
                productId,
                name: productName, 
                price: price, 
                quantity: 1, 
                image: imgSrc 
            });
        }
        
        updateCartMetrics();
        await saveCartToServer();
        updateCartUI();
        showAddedFeedback(button);
        
        // Update the button text
        const cartItem = cart.find(item => item.productId === productId);
        if (cartItem) {
            button.innerHTML = `Add to Cart (${cartItem.quantity})`;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showError('Failed to add item to cart');
    }
}

// ... (keep all existing code above the removeFromCart function)

async function removeFromCart(productId, removeAll = false) {
    try {
        const itemIndex = cart.findIndex(item => item.productId === productId);
        
        if (itemIndex !== -1) {
            const item = cart[itemIndex];
            
            if (removeAll || item.quantity <= 1) {
                // Remove the item completely
                cart.splice(itemIndex, 1);
            } else {
                // Decrease quantity by 1
                item.quantity--;
            }
            
            updateCartMetrics();
            await saveCartToServer();
            updateCartUI();
            
            // Update all product buttons
            updateProductButtons(productId);
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showError('Failed to remove item from cart');
    }
}

// Helper function to update product buttons
function updateProductButtons(productId) {
    document.querySelectorAll('.add-to-cart').forEach(button => {
        const buttonProductId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (buttonProductId === productId) {
            const cartItem = cart.find(item => item.productId === productId);
            button.innerHTML = cartItem ? 
                `Add to Cart (${cartItem.quantity})${button.disabled ? '<br><small>Out of Stock</small>' : ''}` : 
                'Add to Cart';
        }
    });
}

// Update the updateCartUI function
function updateCartUI() {
    document.getElementById("cart-count").textContent = cartCount;
    const cartItemsContainer = document.getElementById("cart-items");
    const cartTotalElement = document.getElementById("cart-total");
    
    cartItemsContainer.innerHTML = "";
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<li class="empty-cart">Your cart is empty</li>';
    } else {
        cart.forEach((item) => {
            const listItem = document.createElement("li");
            listItem.className = "cart-item";
            listItem.innerHTML = `
                <div class="cart-item-details">
                    <img src="${item.image || 'assets/placeholder-product.jpg'}" 
                         class="cart-item-img" alt="${item.name}"
                         onerror="this.src='assets/placeholder-product.jpg'">
                    <div>
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-qty">x${item.quantity}</span>
                        <span class="cart-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <button class="remove-one" onclick="removeFromCart('${item.productId}')">
                        <i class="fas fa-minus"></i>
                    ⛔</button>
                    <button class="remove-all" onclick="removeFromCart('${item.productId}', true)">
                        <i class="fas fa-trash"></i>
                    ❌</button>
                </div>
            `;
            cartItemsContainer.appendChild(listItem);
        });
    }
    
    cartTotalElement.textContent = `₹${cartTotal.toFixed(2)}`;
}

// ... (keep all remaining existing code)

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    cartSidebar.classList.toggle('open');
    
    // Update the close button behavior
    const closeBtn = document.querySelector('.close-cart');
    closeBtn.addEventListener('click', function() {
        cartSidebar.classList.remove('open');
    });
}

function showAddedFeedback(button) {
    const originalText = button.innerHTML;
    button.innerHTML = 'Added! ✓';
    button.style.backgroundColor = '#2E7D32';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '#4CAF50';
    }, 1500);
}

function viewProductDetails(productId) {
    if (!productId) return;
    window.location.href = `view.html?id=${productId}`;
}

async function handleCheckout(event) {
    event.preventDefault();
    event.stopPropagation();

    if (cart.length === 0) {
        alert("Your cart is empty! Please add items before checking out.");
        return;
    }

    try {
        const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart })
        });

        const orderData = await response.json();
        if (!orderData || !orderData.id) {
            throw new Error('Invalid order data');
        }

        const options = {
            key: "rzp_test_l8Vy45HKoZ6Yd9", // Replace with your Razorpay key
            amount: cartTotal * 100, // Convert to paise
            currency: "INR",
            name: "Foodie App",
            description: "Order Payment",
            order_id: orderData.id,
            handler: function (response) {
                alert("Payment Successful!");
                window.location.href = 'order-success.html';
            },
            prefill: {
                name: "Customer Name",
                email: "customer@example.com",
                contact: "9999999999"
            },
            theme: { color: "#3399cc" }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error('Error during checkout:', error);
        showError('Checkout failed. Please try again.');
    }
}

function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    document.body.appendChild(errorEl);
    
    setTimeout(() => {
        errorEl.classList.add('fade-out');
        setTimeout(() => errorEl.remove(), 500);
    }, 3000);
}

// Make functions available globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.toggleCart = toggleCart;
window.loadProducts = loadProducts;
window.viewProductDetails = viewProductDetails;
window.handleCheckout = handleCheckout;

// Function to handle checkout button click
function checkout() {
    handleCheckout(new Event('checkout'));
}
