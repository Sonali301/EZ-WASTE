// middleware.js
module.exports.saveRedirectUrl = (req, res, next) => {
    try {
        if (req.session.returnTo) {
            res.locals.redirectUrl = req.session.returnTo;
        }
        
        if (req.originalUrl && !req.originalUrl.includes('/auth')) {
            req.session.returnTo = req.originalUrl;
        }
        
        next();
    } catch (err) {
        console.error('Error in saveRedirectUrl middleware:', err);
        next(err);
    }
};

module.exports.isAuthenticated = (req, res, next) => {
    try {
        if (req.isAuthenticated()) {
            return next();
        }

        if (req.originalUrl && !req.originalUrl.includes('/auth')) {
            req.session.returnTo = req.originalUrl;
        }

        req.flash('error', 'You need to log in to access this page.');
        
        if (req.accepts('json')) {
            return res.status(401).json({ 
                success: false,
                error: 'unauthorized',
                message: 'Authentication required' 
            });
        }
        
        return res.redirect('/login');
    } catch (err) {
        console.error('Error in isAuthenticated middleware:', err);
        next(err);
    }
};

module.exports.isNotAuthenticated = (req, res, next) => {
    try {
        if (!req.isAuthenticated()) {
            return next();
        }
        
        if (req.accepts('json')) {
            return res.status(403).json({ 
                success: false,
                error: 'already_authenticated',
                message: 'You are already logged in' 
            });
        }
        
        res.redirect('/');
    } catch (err) {
        console.error('Error in isNotAuthenticated middleware:', err);
        next(err);
    }
};

// New error handling wrapper
module.exports.wrapAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(err => {
            console.error('Async error:', err);
            next(err);
        });
    };
};