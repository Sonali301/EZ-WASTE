document.addEventListener('DOMContentLoaded', function() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        alert('Product ID not found in URL');
        window.location.href = 'shop.html';
        return;
    }

    // DOM elements
    const editForm = document.getElementById('edit-product-form');
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const imageUrlInput = document.getElementById('product-image');
    const deleteBtn = document.getElementById('delete-btn');
    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    let newImageFile = null;

    // Image upload handler
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            newImageFile = file;
            const reader = new FileReader();
            reader.onload = function(event) {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                imageUrlInput.value = ''; // Clear URL field
            };
            reader.readAsDataURL(file);
        }
    });

    // Fetch product details from MongoDB
    fetchProductDetails(productId);

    // Form submission handler
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        updateProduct(productId);
    });

    // Delete button click handler
    deleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        confirmDialog.classList.add('active');
    });

    // Confirm delete handler
    confirmBtn.addEventListener('click', function() {
        confirmDialog.classList.remove('active');
        deleteProduct(productId);
    });

    // Cancel delete handler
    cancelBtn.addEventListener('click', function() {
        confirmDialog.classList.remove('active');
    });

    // Fetch product details function
    async function fetchProductDetails(id) {
        try {
            const response = await fetch(`/api/products/${id}`, {
                credentials: 'include' // Important for session cookies
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch product');
            }

            const product = await response.json();

            // Populate form fields
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            imageUrlInput.value = product.image || '';

            // Display current image if exists
            if (product.image) {
                imagePreview.src = product.image;
                imagePreview.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error loading product details');
            window.location.href = 'shop.html';
        }
    }

    // Update product function
    async function updateProduct(id) {
        try {
            const formData = new FormData();
            formData.append('name', document.getElementById('product-name').value);
            formData.append('category', document.getElementById('product-category').value);
            formData.append('price', document.getElementById('product-price').value);
            
            // Handle image update - either new file or URL
            if (newImageFile) {
                formData.append('image', newImageFile);
            } else if (imageUrlInput.value) {
                formData.append('imageUrl', imageUrlInput.value);
            }

            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include' // Important for session cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update product');
            }

            const result = await response.json();
            alert('Product updated successfully!');
            window.location.href = `view.html?id=${id}`;
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Failed to update product');
        }
    }

    // Delete product function
    async function deleteProduct(id) {
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Important for session cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete product');
            }

            const result = await response.json();
            alert('Product deleted successfully!');
            window.location.href = 'shop.html';
        } catch (error) {
            console.error('Delete error:', error);
            alert(error.message || 'Failed to delete product');
        }
    }
});