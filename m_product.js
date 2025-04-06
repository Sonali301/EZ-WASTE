const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  condition: { type: String, required: true },
  price: { type: Number, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);