const { checkSchema } = require("express-validator/check");
import { NextFunction, Request, Response } from "express";

import * as compose from "composable-middleware";
import * as expressJwt from "express-jwt";
import * as jwt from "jsonwebtoken";
import * as mongoose from "mongoose";
import Company from "../models/Company";
import User from "../models/User";
import logger from "./LoggerService";
import ResponseService from "./ResponseService";

const validateJwt = expressJwt({ secret: process.env.SESSION });
const S = "[AuthService]";

const LRU = require("lru-cache");

const CONNECTION_CACHE = new LRU({
    max: 300,
    dispose(key, connection) {
        try {
            connection.close();
            connection = null;
        } catch (error) {
            logger.error(S, "closing connection error:", error);
        }
    },
    maxAge: 1000 * 60 * 60 * 1,
});

export default class AuthService {
    public static isAuthenticated() {
        return compose()
            .use(AuthService.validateToken)
            .use(AuthService.attachUser)
            .use(AuthService.isValidCompanyId())
            .use(ResponseService.checkValidationErrors)
            .use(AuthService.attachCompany);
    }

    public static isValidCompanyId() {
        return checkSchema({
            company_id: {
                in: ["query"],
                isMongoId: true,
                optional: true
            },
        });
    }

    public static isCompanyExists() {
        return checkSchema({
            company_id: {
                in: ["query"],
                isMongoId: true,
                custom: {
                    options: (value, { req }) => {
                        if (!req.company) {
                            const error: any = new Error("Company not found");
                            error.Unauthorized = true;
                            throw error;
                        }
                        return true;
                    },
                },
            },
        });
    }

    public static isUserExistsInCompany() {
        return checkSchema({
            id: {
                in: ["params"],
                isMongoId: true,
                custom: {
                    options: (value, { req }) => {
                        const company = req.company;
                        company.admins = company.admins || [];
                        company.viewers = company.viewers || [];
                        company.auditors = company.auditors || [];
                        const userIds = [...company.admins, ...company.viewers, ...company.auditors];
                        if (!userIds.includes(value)) {
                            const error: any = new Error("User not found in your company");
                            error.Unauthorized = true;
                            throw error;
                        }
                        return true;
                    },
                },
            },
        });
    }

    public static validateToken(req: Request, res: Response, next: NextFunction) {
        if (
            (req.query.access_token === process.env.AUTH_BYPASS_SECRET) &&
            req.query.user_id) {

            req.user = {
                _id: req.query.user_id
            };

            return next();
        }
        // allow access_token to be passed through query parameter as well
        if (req.query && req.query.hasOwnProperty("access_token")) {
            req.headers.authorization = "Bearer " + req.query.access_token;
        }
        validateJwt(req, res, (error) => {
            if (error) {
                return ResponseService.unauthorizedError(res);
            }
            next();
        });
    }

    public static attachUser(req: Request, res: Response, next: NextFunction) {
        User.findById(req.user._id)
            .lean()
            .then((user: any) => {
                if (!user) {
                    return ResponseService.unauthorizedError(res);
                }
                req.user = user;
                next();
            })
            .catch((err) => {
                return ResponseService.serverError(req, res, err);
            });
    }

    public static attachCompany(req: Request, res: Response, next: NextFunction) {
        const M = `${S}[attachCompany][${req.request_id || ""}]`;
        if (!req.query.company_id) { return next(); }
        Company.findById(req.query.company_id)
            .lean()
            .then((company: any) => {
                if (!company) {
                    return ResponseService.unauthorizedError(res);
                }
                const dbUrl = `${process.env.MONGO_BASE_URL}${company.database.path}`;
                AuthService.UpdateCompanyInReq(req, company);

                let companyConnection = CONNECTION_CACHE.get(dbUrl);
                if (!companyConnection) {
                    logger.debug(M, `companyConnection not found in Cache. creating new one`, dbUrl);
                    companyConnection = mongoose.createConnection(dbUrl);
                    CONNECTION_CACHE.set(dbUrl, companyConnection);
                } else {
                    // logger.debug(M, `reusing the connection from connection cache`, dbUrl);
                }
                req.companyConnection = companyConnection;
                next();
            })
            .catch((err) => {
                logger.error(M, "catch: ", err);
                return ResponseService.serverError(req, res, err, "Company not found");
            });
    }

    public static UpdateCompanyInReq(req, company) {
        if (company) {
            company.admins = company.admins ? company.admins.map((x) => String(x)) : [];
            company.viewers = company.viewers ? company.viewers.map((x) => String(x)) : [];
            company.auditors = company.auditors ? company.auditors.map((x) => String(x)) : [];
            if (company.admins.indexOf(String(req.user._id)) > -1) {
                req.user.isAdmin = true;
            }
            if (company.viewers.indexOf(String(req.user._id)) > -1) {
                req.user.isViewer = true;
            }
            if (company.auditors.indexOf(String(req.user._id)) > -1) {
                req.user.isAuditor = true;
            }
            req.company = company;
        }
    }

    public static isAdminOfCompany(req: Request, res: Response, next: NextFunction) {
        const { company, user } = req;

        if (!company) {
            return ResponseService.unauthorizedError(res, "The company is required.");
        }

        if (company && company.admins.indexOf(String(user._id)) === -1) {
            return ResponseService.unauthorizedError(res, "You need to be admin to perform this action.");
        }
        next();
    }

    public static signToken({ _id, name }) {
        return jwt.sign({ _id, name }, process.env.SESSION);
    }

    public static createToken() {
        return Math.random()
            .toString(36)
            .substring(2);
    }

    public static userAndToken(user) {
        return {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
            token: AuthService.signToken(user),
        };
    }

    public static isUserExists(email: string) {
        return User.findOne({email});
    }
}
