import { Application } from "express";

import AuthService from "../../services/AuthService";
import ResponseService from "../../services/ResponseService";
import AuthController from "./AuthController";
import * as AuthValidator from "./AuthValidator";

export default class AuthRoutes {
    public static init(app: Application) {

        /**
         * @api {post} /auth/send/email/verification sendEmail verification
         * @apiName sendEmailVerification
         * @apiGroup Auth
         *
         * @apiParam {String} email Email of the user.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": null | (status=200|null) {
         *
         *        }
         *      }
         *
         */
        app.post(
            "/auth/send/email/verification",
            AuthValidator.sendEmailVerification,
            ResponseService.checkValidationErrors,
            AuthController.sendEmailVerificationCode,
        );

        /**
         * @api {post} /auth/verify/email/verification verifyEmail verification
         * @apiName verifyEmailVerificationCode
         * @apiGroup Auth
         *
         * @apiParam {String} email Email of the user.
         * @apiParam {String} verificationCode Verification code that sent to users email.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": null | (status=200|null) {
         *
         *        }
         *      }
         *
         */
        app.post(
            "/auth/verify/email/verification",
            AuthValidator.validateEmailVerificationCode,
            ResponseService.checkValidationErrors,
            AuthController.validateEmailVerificationCode,
        );

        /**
         * @api {post} /sessions/create Login
         * @apiName LoginUser
         * @apiGroup Auth
         *
         * @apiParam {String} email Email of the user.
         * @apiParam {String} password Password of the user.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": null | (status=200|null) {
         *          token: String,
         *          user: {
         *            _id: String,
         *            name: String,
         *            email: String
         *          } | (status=422) [
         *            {path: String, message: String}
         *          ]
         *        }
         *      }
         *
         */
        app.post(
            "/sessions/create",
            AuthValidator.login,
            ResponseService.checkValidationErrors,
            AuthController.login,
        );
        /**
         * @api {post} /sessions/destroy Logout
         * @apiName LogoutUser
         * @apiGroup Auth
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "message": String
         *      }
         *
         */
        app.all(
            "/sessions/destroy",
            AuthService.isAuthenticated(),
            AuthController.logout,
        );

        /**
         * @api {post} /sessions/new Register
         * @apiName RegisterUser
         * @apiGroup Auth
         *
         * @apiParam {String} email Email of the user.
         * @apiParam {String} password Password of the user.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": null | (status=200|null) {
         *          token: String,
         *          user: {
         *            _id: String,
         *            name: String,
         *            email: String
         *          }
         *        } | (status=422) [
         *            {path: String, message: String}
         *          ]
         *      }
         *
         */
        app.post(
            "/sessions/new",
            AuthValidator.register,
            ResponseService.checkValidationErrors,
            AuthController.register,
        );

        /**
         * @api {post} /sessions/forgot Forgot
         * @apiName ForgotPassword
         * @apiGroup Auth
         *
         * @apiParam {String} email Email of the user.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String
         *      }
         *
         */
        app.post(
            "/sessions/forgot",
            AuthValidator.forgot,
            ResponseService.checkValidationErrors,
            AuthController.forgot,
        );

        /**
         * @api {post} /sessions/reset Reset
         * @apiName ResetPassword
         * @apiGroup Auth
         *
         * @apiParam {String} _id ID of the user sent via mail.
         * @apiParam {String} password Password of the user.
         * @apiParam {String} password_confirmation Password confirmation of the user.
         * @apiParam {String} reset_token Reset token of the user sent via mail.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": null | (status=200|null) {
         *          token: String,
         *          user: {
         *            _id: String,
         *            name: String,
         *            email: String
         *          }
         *        } | (status=422) [
         *            {path: String, message: String}
         *          ]
         *      }
         *
         */
        app.post(
            "/sessions/reset",
            AuthValidator.reset,
            ResponseService.checkValidationErrors,
            AuthController.reset,
        );

        /**
         * @api {post} /sessions/changepassword ChangePassword
         * @apiName ChangePassword
         * @apiGroup Auth
         * @apiParam {String} old_password Old Password of the user.
         * @apiParam {String} password New Password of the user.
         * @apiParam {String} password_confirmation Password confirmation of the user.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": null | (status=200|null) {
         *          token: String,
         *          user: {
         *            _id: String,
         *            name: String,
         *            email: String
         *          }
         *        } | (status=422) [
         *            {path: String, message: String}
         *          ]
         *      }
         *
         */
        app.post("/sessions/changepassword",
            AuthService.isAuthenticated(),
            AuthValidator.changepassword,
            ResponseService.checkValidationErrors,
            AuthController.changepassword,
        );

        /**
         * @api {post} /sessions/verify Verify
         * @apiName VerifyUser
         * @apiGroup Auth
         *
         * @apiParam {String} _id ID of the user sent via mail.
         * @apiParam {String} verify_token Verify token of the user sent via mail.
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} message  Message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error": Boolean,
         *        "status": Number
         *        "message": String,
         *        "data": null | (status=200|null) {
         *          token: String,
         *          user: {
         *            _id: String,
         *            name: String,
         *            email: String
         *          }
         *        } | (status=422) [
         *            {path: String, message: String}
         *          ]
         *      }
         *
         */
        app.all("/sessions/verify", AuthController.verify);
    }
}
