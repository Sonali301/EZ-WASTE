
const express = require("express");
const router = express.Router();
const passport = require("passport");
const userController = require("./users.js");

// Signup Route
router
    .route("/signup")
    .get(userController.renderSignupForm) // Render signup form
    .post(userController.signup); // Handle signup logic

// Login Route
router
    .route("/login")
    .get(userController.renderLoginForm)
    .post(
        passport.authenticate("local", {
            failureRedirect: "/login?msgError=Invalid+email+or+password.",
            failureFlash: true,
        }),
        userController.login
    );

// Logout Route
router.get("/logout", userController.logout);


// Authentication Status Route
router.get("/auth/status", (req, res) => {
    res.json({ isAuthenticated: req.isAuthenticated() });
});

module.exports = router;


