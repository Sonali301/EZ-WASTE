document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('sell-form');
    const imageInput = document.getElementById('imageUpload');
    const previewImage = document.getElementById('image-preview');
    const submitBtn = document.querySelector('.submit-btn');
  
    // Image preview handler
    imageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        console.log('Selected file:', file.name, (file.size/1024/1024).toFixed(2)+'MB');
        
        if (file.size > 10 * 1024 * 1024) {
          alert('Image must be smaller than 10MB');
          e.target.value = '';
          previewImage.style.display = 'none';
          return;
        }
  
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImage.src = e.target.result;
          previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading...';
  
      try {
        // Verify authentication
        const authCheck = await fetch('/auth/status', { 
          credentials: 'include'
        });
        
        if (!authCheck.ok) throw new Error('Auth check failed');
        const authData = await authCheck.json();
        if (!authData.isAuthenticated) throw new Error('Please login');
  
        // Create FormData
        const formData = new FormData(form);
        
        // Send request
        const response = await fetch('/api/products', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
  
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }
  
        const result = await response.json();
        alert('Product listed successfully!');
        window.location.href = 'shop.html';
  
      } catch (error) {
        console.error('Error:', error);
        alert(`Error: ${error.message}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Listing';
      }
    });
  
    // Initial auth check
    fetch('/auth/status', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.isAuthenticated) {
          alert('You must be logged in to access this page');
          window.location.href = 'login.html';
        }
      })
      .catch(err => {
        console.error('Auth check failed:', err);
      });
  });