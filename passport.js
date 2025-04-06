
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("./m_user");

passport.use(new LocalStrategy(
    { usernameField: "email", passwordField: "password" },  // ✅ Explicitly set email & password fields
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                return done(null, false, { message: "No user found with this email" });
            }

            const isMatch = await user.comparePassword(password);  // Ensure this method exists in your User model
            if (!isMatch) {
                return done(null, false, { message: "Incorrect password" });
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});
