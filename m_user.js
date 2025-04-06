const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }
});

userSchema.plugin(passportLocalMongoose, { usernameField: "email" }); // ✅ Uses "email" for login

module.exports = mongoose.model("User", userSchema);


