const path = require("path");
const User = require("./m_user");

// Render Signup Form
module.exports.renderSignupForm = (req, res) => {
    res.sendFile(path.join(__dirname, "signup.html"));
};

// Handle Signup Logic
module.exports.signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            req.flash("error", "Email already registered. Please log in.");
            return res.redirect("/signup?msgError=Email+already+registered.");
        }

        const newUser = new User({ name, email });
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome to EZWASTE");
            return res.redirect("/?msgSuccess=Account+created+successfully!");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup?msgError=" + encodeURIComponent(e.message));
    }
};

// Render Login Form
module.exports.renderLoginForm = (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
};

// Handle Login Logic
module.exports.login = (req, res) => {
    req.flash('success', 'Successfully logged in!');
    const redirectUrl = req.session.returnTo || '/';

    // Store user data in localStorage
    res.send(`
        <script>
            localStorage.setItem('currentUser', JSON.stringify(${JSON.stringify(req.user)}));
            window.location.href = '${redirectUrl}';
        </script>
    `);
};

// Handle Logout
module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "You have logged out.");
        res.redirect("/");
    });
};
