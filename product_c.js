// const Product = require("./m_product"); // Import Product model

// exports.sellProduct = (req, res) => {
//     if (!req.isAuthenticated()) {
//         req.flash("error", "You must be logged in to add a product.");
//         return res.redirect("/login");
//     }

//     const { name, category, price, image } = req.body;
//     const newProduct = new Product({
//         name,
//         category,
//         price,
//         image,
//         owner: req.user._id,
//     });

//     newProduct
//         .save()
//         .then(() => {
//             req.flash("success", "Product added successfully.");
//             res.redirect("/shop");
//         })
//         .catch((err) => {
//             req.flash("error", "Failed to add product.");
//             res.redirect("/sell");
//         });
// };


