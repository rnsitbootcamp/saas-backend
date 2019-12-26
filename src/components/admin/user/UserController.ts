import { Request, Response } from "express";
import * as _ from "lodash";

import Company from "../../../models/Company";
import User from "./../../../models/User";

import UserService from "./UserService";

import logger from "../../../services/LoggerService";
import ResponseService from "../../../services/ResponseService";

const S = "[UserController]";
export default class UserController {
    public static async index(req: Request, res: Response) {
        try {
            const data = await UserService.getUsersPaginated(req);
            return ResponseService.success(res, data);
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async create(req: Request, res: Response) {
        try {
            const M = `${S}[create][${req.request_id || ""}]`;
            const company = req.company;
            // User can be in DB or can not. In later case, create a user.
            // Now if sendMailToNotify is true, we also need to notify them that they have been added to the new company
            const {
                name,
                first_name,
                last_name,
                email,
                userType,
                notifyUser,
                contact,
                country_code,
                street,
                country,
                zip_code,
                avatar
            } = req.body;

            logger.debug(M, `creating user ${email} in company=${company._id}`);

            const data = {
                name: name || ((first_name || '') + (last_name ? ` ${last_name}` : '')),
                first_name: first_name || name,
                last_name,
                email,
                contact: contact || null,
                country_code: country_code || null,
                street: street || null,
                avatar: avatar || null,
                country: country || null,
                zip_code: zip_code || null,
                preferredCompany: company._id
            };

            const user: any = await UserService.firstOrCreate({ email }, data, notifyUser);
            if (!user) {
                return ResponseService.serverError(
                    req, res, new Error("Server error, Failed to create user.")
                );
            }
            if (user) {
                delete user.verify_token;
                delete user.reset_token;
                delete user.password;
            }
            // Get the user types
            const companyUserTypes = company[userType];
            // Add the user._id to it and select unique
            companyUserTypes.push(user._id);

            await Company.findByIdAndUpdate(company._id, { $set: { [userType]: companyUserTypes } });
            return ResponseService.success(res, user, "Used added successfully.");
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async show(req: Request, res: Response) {
        try {
            const user = await UserService.getUser(req);
            if (!user) {
                return ResponseService.notFoundError(res, "User not found.");
            }
            return res.json({ error: false, data: user });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async update(req: Request, res: Response) {
        try {
            const M = `${S}[update][${req.request_id || ""}]`;
            const user = await UserService.updateUser(req);
            if (!user) {
                logger.error(M, `User(${req.params.id}) not found in DB`);
                return ResponseService.notFoundError(res, "User not found.");
            }
            return res.json({ error: false, data: user, message: "User updated successfully." });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async destroy(req: Request, res: Response) {
        try {
            await User.findByIdAndUpdate(req.params.id, { $set: { deleted: true, deletedAt: new Date() } });
            return ResponseService.success(res, null, "User deleted successfully");
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }
}
