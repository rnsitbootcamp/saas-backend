import { Application } from "express";

import AuthService from "../../../services/AuthService";
import ResponseService from "../../../services/ResponseService";
import ProfileController from "./ProfileController";
import * as ProfileValidator from "./ProfileValidator";

export default class ProfileRoutes {
    public static init(app: Application) {
        /**
         * @api {get} /profile/me My Profile
         * @apiName MyProfile
         * @apiGroup Profile
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {Object} data  My profile data.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": {
         *        "_id": String,
         *        "name": String,
         *        "avatar": String,
         *        "preferredCompany": {
         *            "_id": String,
         *            "name": String,
         *            "logo": String
         *          }
         *        }
         *    }
         *
         */
        app.get("/profile/me", AuthService.isAuthenticated(), ProfileController.me);
        /**
         * @api {put} /profile/me Update
         * @apiName profileUpdate
         * @apiGroup Profile
         *
         * @apiParam {String} name,
         * @apiParam {String} first_name,
         * @apiParam {String} last_name,
         * @apiParam {String} contact,
         * @apiParam {String} country_code,
         * @apiParam {String} telephone,
         * @apiParam {String} cellphone,
         * @apiParam {String} fax,
         * @apiParam {String} company,
         * @apiParam {String} designation,
         * @apiParam {String} address,
         * @apiParam {String} country,
         * @apiParam {String} state,
         * @apiParam {String} city,
         * @apiParam {Number} zip_code,
         * @apiParam {String} avatar
         * @apiParam {String} street
         *
         * @apiSuccess {Boolean} error If expected error occurred.
         * @apiSuccess {String} message The response message.
         * @apiSuccess {Object} data  User data.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "message": "Profile updated."
         *    }
         *
         */
        app.put("/profile/me",
            AuthService.isAuthenticated(),
            ProfileValidator.update,
            ResponseService.checkValidationErrors,
            ProfileController.update,
        );
        /**
         * @api {put} /profile/me/preferred-company Update My Preferred Company
         * @apiName Preferred Company
         * @apiGroup Profile
         *
         * @apiSuccess {String} error If expected error occurred.
         * @apiSuccess {String} message  The response message.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "message": "Preferred company updated."
         *    }
         *
         */
        app.put("/profile/me/preferred-company", AuthService.isAuthenticated(), ProfileController.preferredCompany);

        /**
         * @api {get} /profile/me/companies Companies to which I am attached to.
         * @apiName User Companies
         * @apiGroup Profile
         *
         * @apiSuccess {String} error If expected error occured.
         * @apiSuccess {Object} data  My companies.
         *
         * @apiSuccessExample Success-Response:
         *     HTTP/1.1 200 OK
         *     {
         *        "error":false,
         *        "data": [
         *          {
         *            "_id": string,
         *            "name": String,
         *            "isAdmin": Boolean,
         *            "isViewer": Boolean,
         *            "isAuditor": Boolean
         *          }
         *        ]
         *    }
         *
         */
        app.get("/profile/me/companies", AuthService.isAuthenticated(), ProfileController.companies);
    }
}
