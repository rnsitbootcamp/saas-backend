const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

import User from "../../models/User";

import logger from "../../services/LoggerService";

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

/**
 * Sign in using Email and Password.
 */
exports.setUp = () => {
    passport.use(
        new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
            User.findOne({ email }, (err: any, user: any) => {
                try {

                    if (err) {
                        return done(err);
                    }
                    if (!user) {
                        return done(null, false, `Email not registered.`);
                    }
                    if (!user.comparePassword(password)) {
                        return done(null, false, "Invalid email or password.");
                    }
                    if (user && !user.approved) {
                        return done(null, false, "User is not approved. Please contact admin.");
                    }
                    User.findByIdAndUpdate(user._id, { $set: { loginAt: new Date() } }).then(
                        (res) => {
                            return done(null, user);
                        },
                        (error) => {
                            if (error) {
                                logger.error('passport findAndId update error', error);
                            }
                            return done(null, user);
                        },
                    );
                } catch (error) {
                    return done(error);
                }
            });
        }),
    );
};
