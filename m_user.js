const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  }
});

// The plugin will add a `username` field by default.
// But we already have `email`, so we tell it to use `email` instead.
userSchema.plugin(passportLocalMongoose, {
  usernameField: 'email',
  usernameUnique: false // Let Mongoose handle uniqueness
});

module.exports = mongoose.model("User", userSchema);
