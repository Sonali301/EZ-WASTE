require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
const User = require('./m_user');
const Product = require('./m_product');
const userRoutes = require('./r_user');
const Cart = require('./m_cart');

// Initialize Express App
const app = express();

// Middleware Configurations
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from root
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB Connection - Updated with error handling
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    // Start server only after DB connection
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1); // Exit if DB connection fails
  });

// Session Configuration - Simplified for initial deployment
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash Messages
app.use(flash());

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer and Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'e-waste-products',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
app.use(userRoutes);

// Authentication Status Endpoint
app.get('/auth/status', (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      _id: req.user._id,
      email: req.user.email,
      name: req.user.name,
    } : null,
  });
});


// Product Routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('owner', '_id email name');
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Product image is required' });
    }
    const { name, category, condition, price } = req.body;
    if (!name || !category || !condition || !price) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const product = new Product({
      name,
      category,
      condition,
      price: parseFloat(price),
      owner: req.user._id,
      image: req.file.path,
      cloudinary_id: req.file.filename,
    });
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Updated PUT endpoint for product updates
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
      // Authentication check
      if (!req.isAuthenticated()) {
          return res.status(401).json({ 
              success: false,
              error: 'unauthorized',
              message: 'You must be logged in' 
          });
      }

      // Find the product
      const product = await Product.findById(req.params.id);
      if (!product) {
          return res.status(404).json({ 
              success: false,
              error: 'not_found',
              message: 'Product not found' 
          });
      }

      // Ownership check
      if (product.owner.toString() !== req.user._id.toString()) {
          return res.status(403).json({ 
              success: false,
              error: 'forbidden',
              message: 'You can only edit your own products' 
          });
      }



      // Update basic fields
      product.name = req.body.name || product.name;
      product.category = req.body.category || product.category;
      product.price = req.body.price || product.price;

      // Handle image updates
      if (req.file) {
          // Delete old image from Cloudinary if exists
          if (product.cloudinary_id) {
              await cloudinary.uploader.destroy(product.cloudinary_id);
          }
          // Set new image
          product.image = req.file.path;
          product.cloudinary_id = req.file.filename;
      } else if (req.body.imageUrl) {
          // If using URL instead of file upload
          product.image = req.body.imageUrl;
          product.cloudinary_id = null; // Clear cloudinary reference
      }

      await product.save();
      
      res.json({
          success: true,
          data: product,
          message: 'Product updated successfully'
      });

  } catch (err) {
      console.error('Error updating product:', err);
      res.status(500).json({ 
          success: false,
          error: 'server_error',
          message: err.message || 'Failed to update product'
      });
  }
});

// Add this to your server.js
app.delete('/api/products/:id', async (req, res) => {
  try {
      if (!req.isAuthenticated()) {
          return res.status(401).json({ 
              success: false,
              error: 'unauthorized',
              message: 'You must be logged in' 
          });
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
          return res.status(404).json({ 
              success: false,
              error: 'not_found',
              message: 'Product not found' 
          });
      }

      // Check ownership
      if (product.owner.toString() !== req.user._id.toString()) {
          return res.status(403).json({ 
              success: false,
              error: 'forbidden',
              message: 'You can only delete your own products' 
          });
      }

      // Delete image from Cloudinary if exists
      if (product.cloudinary_id) {
          await cloudinary.uploader.destroy(product.cloudinary_id);
      }

      // Delete product from database
      await Product.findByIdAndDelete(req.params.id);

      res.json({
          success: true,
          message: 'Product deleted successfully'
      });

  } catch (err) {
      console.error('Error deleting product:', err);
      res.status(500).json({ 
          success: false,
          error: 'server_error',
          message: err.message || 'Failed to delete product'
      });
  }
});

// Update cart routes
app.get('/api/cart', async (req, res) => {
  try {
      if (!req.isAuthenticated()) {
          return res.json({ items: [] });
      }
      
      const cart = await Cart.getUserCart(req.user._id);
      res.json({
          items: cart.items.map(item => ({
              productId: item.productId._id,
              name: item.productId.name,
              price: item.productId.price,
              quantity: item.quantity,
              image: item.productId.image
          })),
          totalPrice: cart.totalPrice,
          totalItems: cart.totalItems
      });
  } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
      if (!req.isAuthenticated()) {
          return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { items } = req.body;
      if (!Array.isArray(items)) {
          return res.status(400).json({ error: 'Invalid cart data' });
      }
      
      const cart = await Cart.getUserCart(req.user._id);
      
      // Clear existing items
      await cart.clearCart();
      
      // Add new items
      for (const item of items) {
          await cart.addItem(item.productId, item.quantity);
      }
      
      // Return updated cart
      const updatedCart = await Cart.getUserCart(req.user._id);
      res.json({
          success: true,
          cart: {
              items: updatedCart.items.map(item => ({
                  productId: item.productId._id,
                  name: item.productId.name,
                  price: item.productId.price,
                  quantity: item.quantity,
                  image: item.productId.image
              })),
              totalPrice: updatedCart.totalPrice,
              totalItems: updatedCart.totalItems
          }
      });
  } catch (error) {
      console.error('Error saving cart:', error);
      res.status(500).json({ error: 'Failed to save cart' });
  }
});

// Serve HTML Pages
const pages = ['home', 'shop', 'sell', 'view', 'edit', 'login', 'signup'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => res.sendFile(path.join(__dirname, `${page}.html`)));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});




// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const session = require('express-session');
// const MongoStore = require('connect-mongo');
// const flash = require('connect-flash');
// const passport = require('passport');
// const LocalStrategy = require('passport-local').Strategy;
// const path = require('path');
// const multer = require('multer');
// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const cors = require('cors');
// const User = require('./m_user');
// const Product = require('./m_product');
// const userRoutes = require('./r_user');
// const Cart = require('./m_cart');

// // Initialize Express App
// const app = express();

// // Middleware Configurations
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(express.static(__dirname)); // Serve static files from root
// app.use(cors({
//   origin: true,
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// // MongoDB Connection (removed deprecated options)
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('MongoDB Connected'))
//   .catch(err => console.error('MongoDB Connection Error:', err));

// // Session Configuration with MongoStore
// app.use(session({
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 24 * 60 * 60 * 1000 // 1 day
//   }
// }));

// // Passport Configuration
// app.use(passport.initialize());
// app.use(passport.session());
// passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// // Flash Messages
// app.use(flash());

// // Cloudinary Configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Multer and Cloudinary Storage
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'e-waste-products',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 800, height: 800, crop: 'limit' }]
//   },
// });

// const upload = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed!'), false);
//     }
//   },
//   limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
// });

// // Routes
// app.use(userRoutes);

// // Authentication Status
// app.get('/auth/status', (req, res) => {
//   res.json({
//     isAuthenticated: req.isAuthenticated(),
//     user: req.isAuthenticated() ? {
//       _id: req.user._id,
//       email: req.user.email,
//       name: req.user.name,
//     } : null,
//   });
// });

// // Product Routes (unchanged from your original)
// app.get('/api/products', async (req, res) => {
//   try {
//     const products = await Product.find()
//       .populate('owner', 'name email')
//       .sort({ createdAt: -1 });
//     res.json(products);
//   } catch (err) {
//     console.error('Error fetching products:', err);
//     res.status(500).json({ error: 'Failed to fetch products' });
//   }
// });

// app.get('/api/products/:id', async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id)
//       .populate('owner', '_id email name');
//     if (!product) {
//       return res.status(404).json({ error: 'Product not found' });
//     }
//     res.json(product);
//   } catch (err) {
//     console.error('Error fetching product:', err);
//     res.status(500).json({ error: 'Failed to fetch product' });
//   }
// });

// app.post('/api/products', upload.single('image'), async (req, res) => {
//   try {
//     if (!req.isAuthenticated()) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }
//     if (!req.file) {
//       return res.status(400).json({ error: 'Product image is required' });
//     }
//     const { name, category, condition, price } = req.body;
//     if (!name || !category || !condition || !price) {
//       return res.status(400).json({ error: 'All fields are required' });
//     }
//     const product = new Product({
//       name,
//       category,
//       condition,
//       price: parseFloat(price),
//       owner: req.user._id,
//       image: req.file.path,
//       cloudinary_id: req.file.filename,
//     });
//     await product.save();
//     res.status(201).json({ success: true, data: product });
//   } catch (err) {
//     console.error('Error creating product:', err);
//     res.status(500).json({ error: 'Failed to create product' });
//   }
// });

// app.put('/api/products/:id', upload.single('image'), async (req, res) => {
//   try {
//     if (!req.isAuthenticated()) {
//       return res.status(401).json({ 
//         success: false,
//         error: 'unauthorized',
//         message: 'You must be logged in' 
//       });
//     }

//     const product = await Product.findById(req.params.id);
//     if (!product) {
//       return res.status(404).json({ 
//         success: false,
//         error: 'not_found',
//         message: 'Product not found' 
//       });
//     }

//     if (product.owner.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ 
//         success: false,
//         error: 'forbidden',
//         message: 'You can only edit your own products' 
//       });
//     }

//     product.name = req.body.name || product.name;
//     product.category = req.body.category || product.category;
//     product.price = req.body.price || product.price;

//     if (req.file) {
//       if (product.cloudinary_id) {
//         await cloudinary.uploader.destroy(product.cloudinary_id);
//       }
//       product.image = req.file.path;
//       product.cloudinary_id = req.file.filename;
//     } else if (req.body.imageUrl) {
//       product.image = req.body.imageUrl;
//       product.cloudinary_id = null;
//     }

//     await product.save();
    
//     res.json({
//       success: true,
//       data: product,
//       message: 'Product updated successfully'
//     });
//   } catch (err) {
//     console.error('Error updating product:', err);
//     res.status(500).json({ 
//       success: false,
//       error: 'server_error',
//       message: err.message || 'Failed to update product'
//     });
//   }
// });

// app.delete('/api/products/:id', async (req, res) => {
//   try {
//     if (!req.isAuthenticated()) {
//       return res.status(401).json({ 
//         success: false,
//         error: 'unauthorized',
//         message: 'You must be logged in' 
//       });
//     }

//     const product = await Product.findById(req.params.id);
//     if (!product) {
//       return res.status(404).json({ 
//         success: false,
//         error: 'not_found',
//         message: 'Product not found' 
//       });
//     }

//     if (product.owner.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ 
//         success: false,
//         error: 'forbidden',
//         message: 'You can only delete your own products' 
//       });
//     }

//     if (product.cloudinary_id) {
//       await cloudinary.uploader.destroy(product.cloudinary_id);
//     }

//     await Product.findByIdAndDelete(req.params.id);

//     res.json({
//       success: true,
//       message: 'Product deleted successfully'
//     });
//   } catch (err) {
//     console.error('Error deleting product:', err);
//     res.status(500).json({ 
//       success: false,
//       error: 'server_error',
//       message: err.message || 'Failed to delete product'
//     });
//   }
// });

// // Cart Routes (unchanged from your original)
// app.get('/api/cart', async (req, res) => {
//   try {
//     if (!req.isAuthenticated()) {
//       return res.json({ items: [] });
//     }
    
//     const cart = await Cart.getUserCart(req.user._id);
//     res.json({
//       items: cart.items.map(item => ({
//         productId: item.productId._id,
//         name: item.productId.name,
//         price: item.productId.price,
//         quantity: item.quantity,
//         image: item.productId.image
//       })),
//       totalPrice: cart.totalPrice,
//       totalItems: cart.totalItems
//     });
//   } catch (error) {
//     console.error('Error fetching cart:', error);
//     res.status(500).json({ error: 'Failed to fetch cart' });
//   }
// });

// app.post('/api/cart', async (req, res) => {
//   try {
//     if (!req.isAuthenticated()) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }
    
//     const { items } = req.body;
//     if (!Array.isArray(items)) {
//       return res.status(400).json({ error: 'Invalid cart data' });
//     }
    
//     const cart = await Cart.getUserCart(req.user._id);
//     await cart.clearCart();
    
//     for (const item of items) {
//       await cart.addItem(item.productId, item.quantity);
//     }
    
//     const updatedCart = await Cart.getUserCart(req.user._id);
//     res.json({
//       success: true,
//       cart: {
//         items: updatedCart.items.map(item => ({
//           productId: item.productId._id,
//           name: item.productId.name,
//           price: item.productId.price,
//           quantity: item.quantity,
//           image: item.productId.image
//         })),
//         totalPrice: updatedCart.totalPrice,
//         totalItems: updatedCart.totalItems
//       }
//     });
//   } catch (error) {
//     console.error('Error saving cart:', error);
//     res.status(500).json({ error: 'Failed to save cart' });
//   }
// });

// // Serve HTML Pages
// const pages = ['home', 'shop', 'sell', 'view', 'edit', 'login', 'signup'];
// pages.forEach(page => {
//   app.get(`/${page}`, (req, res) => res.sendFile(path.join(__dirname, `${page}.html`)));
// });

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'home.html'));
// });

// // Error Handling
// app.use((err, req, res, next) => {
//   console.error('Server error:', err);
//   res.status(500).json({ error: 'Internal Server Error' });
// });

// // Start Server
// const PORT = process.env.PORT || 10000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));