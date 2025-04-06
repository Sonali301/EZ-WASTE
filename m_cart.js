// const mongoose = require('mongoose');

// const cartItemSchema = new mongoose.Schema({
//     productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Product',
//         required: true
//     },
//     quantity: {
//         type: Number,
//         required: true,
//         min: 1
//     }
// }, { _id: false }); // Disable _id for subdocuments

// const cartSchema = new mongoose.Schema({
//     userId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true,
//         unique: true
//     },
//     items: [cartItemSchema],
//     createdAt: {
//         type: Date,
//         default: Date.now
//     },
//     updatedAt: {
//         type: Date,
//         default: Date.now
//     }
// });

// // Update the updatedAt field before saving
// cartSchema.pre('save', function(next) {
//     this.updatedAt = Date.now();
//     next();
// });

// // Static method to get or create cart for a user
// cartSchema.statics.getUserCart = async function(userId) {
//     let cart = await this.findOne({ userId }).populate('items.productId');
//     if (!cart) {
//         cart = await this.create({ userId, items: [] });
//     }
//     return cart;
// };

// // Instance method to add item to cart
// cartSchema.methods.addItem = async function(productId, quantity = 1) {
//     const existingItemIndex = this.items.findIndex(
//         item => item.productId.toString() === productId.toString()
//     );

//     if (existingItemIndex >= 0) {
//         this.items[existingItemIndex].quantity += quantity;
//     } else {
//         this.items.push({ productId, quantity });
//     }

//     return this.save();
// };

// // Instance method to remove item from cart
// cartSchema.methods.removeItem = async function(productId, quantity = 1) {
//     const existingItemIndex = this.items.findIndex(
//         item => item.productId.toString() === productId.toString()
//     );

//     if (existingItemIndex >= 0) {
//         if (this.items[existingItemIndex].quantity <= quantity) {
//             this.items.splice(existingItemIndex, 1);
//         } else {
//             this.items[existingItemIndex].quantity -= quantity;
//         }
//     }

//     return this.save();
// };

// // Instance method to clear cart
// cartSchema.methods.clearCart = async function() {
//     this.items = [];
//     return this.save();
// };

// // Virtual for total price
// cartSchema.virtual('totalPrice').get(function() {
//     return this.items.reduce((total, item) => {
//         if (item.productId && item.productId.price) {
//             return total + (item.productId.price * item.quantity);
//         }
//         return total;
//     }, 0);
// });

// // Virtual for total items count
// cartSchema.virtual('totalItems').get(function() {
//     return this.items.reduce((total, item) => total + item.quantity, 0);
// });

// // Set toJSON options to include virtuals
// cartSchema.set('toJSON', {
//     virtuals: true,
//     transform: (doc, ret) => {
//         delete ret._id;
//         delete ret.__v;
//         return ret;
//     }
// });

// const Cart = mongoose.model('Cart', cartSchema);

// module.exports = Cart;

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema]
}, {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes
cartSchema.index({ userId: 1 }, { unique: true });
cartSchema.index({ 'items.productId': 1 });

// Static method to get or create cart
cartSchema.statics.getUserCart = async function(userId) {
    return this.findOneAndUpdate(
        { userId },
        { $setOnInsert: { items: [] } },
        { 
            new: true,
            upsert: true,
            populate: 'items.productId'
        }
    );
};

// Atomic operation methods
cartSchema.statics.addItemToCart = async function(userId, productId, quantity = 1) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // Try to increment quantity if item exists
        let cart = await this.findOneAndUpdate(
            { userId, 'items.productId': productId },
            { $inc: { 'items.$.quantity': quantity } },
            { new: true, session }
        ).populate('items.productId');

        // If item doesn't exist, add it
        if (!cart) {
            cart = await this.findOneAndUpdate(
                { userId },
                { $push: { items: { productId, quantity } } },
                { new: true, session }
            ).populate('items.productId');
        }

        await session.commitTransaction();
        return cart;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
};

cartSchema.statics.removeItemFromCart = async function(userId, productId, quantity = 1) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // Try to decrement quantity if more than requested quantity exists
        let cart = await this.findOneAndUpdate(
            { userId, 'items.productId': productId, 'items.quantity': { $gt: quantity } },
            { $inc: { 'items.$.quantity': -quantity } },
            { new: true, session }
        ).populate('items.productId');

        // If quantity would go to zero or below, remove the item
        if (!cart) {
            cart = await this.findOneAndUpdate(
                { userId },
                { $pull: { items: { productId } } },
                { new: true, session }
            ).populate('items.productId');
        }

        await session.commitTransaction();
        return cart;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
};

cartSchema.statics.clearUserCart = async function(userId) {
    return this.findOneAndUpdate(
        { userId },
        { $set: { items: [] } },
        { new: true }
    );
};

// Virtuals
cartSchema.virtual('totalPrice').get(function() {
    return this.items.reduce((total, item) => {
        if (item.productId && item.productId.price) {
            return total + (item.productId.price * item.quantity);
        }
        return total;
    }, 0);
});

cartSchema.virtual('totalItems').get(function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;