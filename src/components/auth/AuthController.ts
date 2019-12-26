import * as dayjs from "dayjs";
import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator/filter";
import * as passport from "passport";

require("./Passport").setUp();

import AuthEvents from "../../events/AuthEvents";
import Tracking from "../../events/Tracking";
import UserEvents from "../../events/UserEvents";

import User from "../../models/User";

import AuthUtils from "./AuthUtils";

import AuthService from "../../services/AuthService";
import logger from "../../services/LoggerService";
import ResponseService from "../../services/ResponseService";

const S = "[AuthController]";

export default class AuthController {
    public static login(req: Request, res: Response, next: NextFunction) {
        const M = `${S}[login][${req.request_id || ""}]`;
        const { email } = req.body;

        logger.debug(M, `Trying to login ${email}`);
        Tracking.log({ type: "auth.login", message: "Login user", data: { email } });
        passport.authenticate("local", (error, user, info) => {
            if (error && error.code === "noPassword") {
                return ResponseService.error(
                    res, "Please reset your password", 401
                );
            } else if (error) {
                logger.error(M, `Login failed for user ${email}`, error);
                return res.status(500).json({
                    error: true,
                    status: 500,
                    message: "Login Failed.",
                });
            }
            // Password incorrect, or blocked user
            if (!error && !user) {
                logger.error(M, `Login failed for ${email}`);
                Tracking.log({ type: "auth.login", message: "Login failed", data: { email } });
                return ResponseService.unauthorizedError(res, info);
            }
            logger.info(M, `${email} logged successfully`);
            return ResponseService.success(
                res,
                AuthService.userAndToken(user),
                `Welcome ${user.name}`,
            );
        })(req, res, next);
    }

    public static async register(req: Request, res: Response) {
        const M = `${S}[login][${req.request_id || ""}]`;
        const bodyData = matchedData(req, { locations: ["body"] });

        const { first_name, last_name, email, password, country_code, contact } = bodyData;
        let { name } = bodyData;
        try {
            if (!name) {
                name = email.split("@")[0];
            }

            Tracking.log({ type: "auth.register", message: "Register user", data: { name, email } });
            const user = await User.create({
                name,
                first_name: first_name || name,
                last_name,
                email,
                password,
                country_code,
                contact,
                // avatar: DefaultConfig.USER_AVATAR,
                verify_token: AuthService.createToken(),
                verified: await AuthUtils.isEmailVerified(email)
            });
            logger.info(M, `${email} User created successfully`);
            Tracking.log({
                type: "auth.register",
                message: "Register successful",
                data: { name, email },
            });
            // Fire User creation event
            UserEvents.created(user);
            return res.status(200).json({
                error: false,
                data: AuthService.userAndToken(user),
                message: "Registration successful.",
            });
        } catch (error) {
            logger.error(M, `User registration failed for ${email}`, error);
            Tracking.log({
                type: "auth.register",
                message: "Register failed",
                data: { name, email, error },
            });
            if (error.code === 11000) {
                return res.status(400).json({
                    error: true,
                    status: 400,
                    message: "User with same email already exists.",
                });
            }
            return res.status(500).json({
                error: true,
                status: 500,
                data: error,
                message: "An error occurred",
            });
        }
    }

    public static logout(req: Request, res: Response) {
        // Add logic to track
        const M = `${S}[logout][${req.request_id || ""}]`;
        logger.debug(M, `Logout user ${req.user._id}`);
        req.logout();
        Tracking.log({ type: "auth.logout", message: "Logout", data: {} });
        return res.status(200).json({
            error: false,
            message: `Logout successful`,
        });
    }

    public static async forgot(req: Request, res: Response) {
        try {
            const M = `${S}[forgot][${req.request_id || ""}]`;
            const bodyData = matchedData(req, { locations: ["body"] });
            const { email } = bodyData;
            Tracking.log({ type: "auth.forgot", message: "Forgot password", data: { email } });
            // Generate the reset token and token expiry date (valid for 24 hours)
            const update = {
                reset_token: AuthService.createToken(),
                // @ts-ignore
                reset_token_expiry: dayjs()
                    .add(1, "day")
                    .unix(),
            };
            const user = await User.findOneAndUpdate({ email }, { $set: update }, { new: true });
            if (!user) {
                logger.error(M, `Forgot password failed. User not found ${email}`);
                Tracking.log({ type: "auth.forgot", message: "Forgot failed", data: { email } });
                return res.json({ error: true, message: "Reset failed. Please try again" });
            }

            Tracking.log({ type: "auth.forgot", message: "Forgot successful", data: { email } });
            // Fire user reset event
            await AuthEvents.reset(user);
            logger.info(M, `forgot email scheduled ${email}`);
            return res.json({ error: false, message: "Please check your mail to reset password." });
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async changepassword(req: Request, res: Response) {
        try {
            const bodyData = matchedData(req, { locations: ["body"] });
            const userId = req.user._id;
            const password = bodyData.password;
            const old_password = bodyData.old_password;
            const user: any = await User.findOne({ _id: userId });
            if (!user) {
                return ResponseService.notFoundError(res, "User not found.");
            }
            if (!user.comparePassword(old_password)) {
                return ResponseService.validationError(res, [{ path: "old_password", msg: "Invalid old_password" }]);
            }

            const update = {
                password: user.createPassword(password),
            };
            await User.findOneAndUpdate({ _id: userId }, { $set: update });
            return ResponseService.success(res, null, "Password changed.");
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }
    public static async reset(req: Request, res: Response) {
        try {
            const M = `${S}[reset][${req.request_id || ""}]`;
            const bodyData = matchedData(req, { locations: ["body"] });
            const { _id, password, reset_token } = bodyData;

            Tracking.log({ type: "auth.reset", message: "Resetting password", data: { user_id: _id } });
            // Now find the user based on _id and reset_token
            const user: any = await User.findOne({ _id, reset_token });
            // If no user based on the above find query
            if (!user) {
                logger.error(M, `User(_id=${_id}), with reset_token(${reset_token}) not found`);
                Tracking.log({ type: "auth.reset", message: "Reset token invalid", data: { user_id: _id } });
                return res.json({ error: true, message: "Reset token is invalid." });
            }
            // If user token has expired
            // @ts-ignore
            if (!dayjs().isBefore(dayjs.unix(user.reset_token_expiry))) {
                logger.error(M, `User(_id=${_id}), with reset_token(${reset_token}), reset_token expired`);
                Tracking.log({ type: "auth.reset", message: "Reset token expired", data: { user_id: _id } });
                return res.json({
                    error: true,
                    message: "Reset link has expired. Please request a new link",
                });
            }
            // Update the password
            const update = {
                password: user.createPassword(password),
                reset_token: null,
                reset_token_expiry: null,
            };
            const updated = await User.findOneAndUpdate({ _id }, { $set: update }, { new: true });
            if (!updated) {
                logger.error(M, `User(_id=${_id}) not found`);
                Tracking.log({ type: "auth.reset", message: "Reset update failed", data: { user_id: _id } });
                return res.json({ error: true, message: "Password updated failed." });
            }
            logger.info(M, `user(${_id}) password reset is successful`);
            Tracking.log({
                type: "auth.reset",
                message: "Reset update successful",
                data: { user_id: _id },
            });
            return res.json({
                error: false,
                message: "Password updated successfully.",
                data: AuthService.userAndToken(user),
            });
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async verify(req: Request, res: Response) {
        try {
            Tracking.log({
                type: "auth.verify",
                message: "Verifying User",
                data: { user_id: req.body._id },
            });
            // tslint:disable-next-line:variable-name
            const _id = req.body._id || req.query._id;
            const verifyToken = req.body.verify_token || req.query.verify_token;
            const user: any = await User.findOneAndUpdate(
                { _id, verify_token: verifyToken },
                { $set: { verified: true, verify_token: null } }, { new: true },
            );
            Tracking.log({
                type: "auth.verify",
                message: "User Verified",
                data: { user_id: req.body._id, user: user.name },
            });
            if (req.xhr) {
                return res.status(200).json({
                    error: false,
                    message: "User verified.",
                    data: AuthService.userAndToken(user),
                });
            } else {
                const username = user.name || user.first_name || user.last_name || user.email || "";
                return res.status(200).send(`Hi ${username}, Your account is verified.`);
            }
        } catch (error) {
            Tracking.log({
                type: "auth.verify",
                message: "User Verification Failed",
                data: { user_id: req.body._id, error },
            });
            if (req.xhr) {
                return res.status(500).json({ error: true, message: "User verification failed." });
            } else {
                return res.status(500).send(`Hi user, Failed to verify your account. Please contact administrator`);
            }
        }
    }

    public static async sendEmailVerificationCode(req, res) {
        const M = `${S}[sendEmailVerificationCode][${req.request_id || ""}]`;
        try {

            const bodyData = matchedData(req, { locations: ["body"] });
            const email = bodyData.email;
            const isUserAlreadyExists = await AuthService.isUserExists(email);

            if (isUserAlreadyExists) {
                return ResponseService.error(res, "User already exists", 400);
            }
            await AuthUtils.sendUniqueEmailVerificationCode(email);
            return ResponseService.success(res, { email }, "Check your email.");
        } catch (error) {
            return ResponseService.serverError(req, res, error, "Failed to sent email verification code.");
        }

    }

    public static async validateEmailVerificationCode(req, res) {
        const M = `${S}[validateEmailVerificationCode][${req.request_id || ""}]`;
        try {
            const bodyData = matchedData(req, { locations: ["body"] });
            const email = bodyData.email;
            const verificationCode = bodyData.verificationCode;

            await AuthUtils.validateUniqueEmailVerificationCode(email, verificationCode);
            return ResponseService.success(res, { email }, "Email verified. Please complete Registration.");
        } catch (error) {
            return ResponseService.error(res,  "Failed to validate email verification code.", error.status || 500);
        }

    }
}
