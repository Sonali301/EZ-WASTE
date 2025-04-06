document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        console.error('Product ID not found in URL parameters');
        alert('Product not found. Redirecting to shop...');
        window.location.href = 'shop.html';
        return;
    }

    try {
        console.log(`Fetching product with ID: ${productId}`);
        const response = await fetch(`/api/products/${productId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error(errorData.message || 'Failed to fetch product');
        }

        const product = await response.json();
        console.log('Product data:', product);

        // Display product details
        document.getElementById('product-name').textContent = product.name || 'No name';
        document.getElementById('product-image').src = product.image || 'placeholder.jpg';
        document.getElementById('product-image').alt = product.name || 'Product image';
        document.getElementById('product-category').textContent = `Category: ${product.category || 'Unknown'}`;
        document.getElementById('product-price').textContent = `Price: ₹${product.price || '0'}`;
        
        // Display owner info
        if (product.owner) {
            const ownerText = product.owner.name 
                ? `${product.owner.name} (${product.owner.email || 'No email'})`
                : product.owner.email || 'Unknown owner';
            document.getElementById('product-owner').textContent = `Owner: ${ownerText}`;
        } else {
            document.getElementById('product-owner').textContent = 'Owner: Unknown';
        }

        // Check ownership and show edit/delete buttons
        try {
            const authResponse = await fetch('/auth/status', { credentials: 'include' });
            if (authResponse.ok) {
                const authData = await authResponse.json();
                if (authData.isAuthenticated && product.owner && 
                    authData.user._id === product.owner._id?.toString()) {
                    document.getElementById('edit-product').style.display = 'inline-block';
                    document.getElementById('delete-product').style.display = 'inline-block';
                }
                else {
                    console.log("User is NOT owner - hiding buttons");
                    document.getElementById('edit-product').style.display = 'none';
                    document.getElementById('delete-product').style.display = 'none';
                }

            }
        } catch (authError) {
            console.error('Auth check failed:', authError);
        }

        // Edit button handler
        document.getElementById('edit-product').addEventListener('click', () => {
            window.location.href = `edit.html?id=${product._id}`;
        });

        // Delete button handler
        document.getElementById('delete-product').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this product?')) {
                try {
                    const deleteResponse = await fetch(`/api/products/${product._id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    
                    if (deleteResponse.ok) {
                        alert('Product deleted successfully');
                        window.location.href = 'shop.html';
                    } else {
                        const error = await deleteResponse.json();
                        throw new Error(error.message);
                    }
                } catch (error) {
                    console.error('Delete failed:', error);
                    alert('Failed to delete product: ' + error.message);
                }
            }
        });

    } catch (error) {
        console.error('Error loading product:', error);
        alert('Error loading product details: ' + error.message);
        window.location.href = 'shop.html';
    }
});

