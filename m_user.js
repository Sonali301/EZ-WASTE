const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        index: true  // Explicit index
    },
    name: String  // Added name field if not present
});

// Configure passport plugin to avoid duplicate indexes
userSchema.plugin(passportLocalMongoose, { 
    usernameField: "email",
    usernameUnique: false  // Let the schema handle uniqueness
});

module.exports = mongoose.model("User", userSchema);