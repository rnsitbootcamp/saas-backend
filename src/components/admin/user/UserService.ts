import * as dayjs from "dayjs";
import { Request } from "express";
import * as _ from "lodash";
import { Types } from "mongoose";

import UserEvents from "../../../events/UserEvents";

import Company from "../../../models/Company";
import User from "../../../models/User";

import AuthService from "../../../services/AuthService";
import logger from "../../../services/LoggerService";
import PaginateService from "../../../services/PaginateService";
import S3Service from "../../../services/S3Service";

const S = "[UserService]";
export default class UserService {
    public static userTypes: string[] = ["admins", "auditors", "viewers"];

    // Show the list of users based on the IDs
    public static async getUsersByIds(userIds: any[]) {
        return await User.find({ _id: { $in: userIds } }, { _id: 1, name: 1 }).lean();
    }

    public static addUserRoleInCompany(company, user, userId) {
        user.isAdmin = user.isViewer = user.isAuditor = false;
        if (company.admins && company.admins.indexOf(String(userId)) > -1) {
            user.isAdmin = true;
        }
        if (company.viewers && company.viewers.indexOf(String(userId)) > -1) {
            user.isViewer = true;
        }
        if (company.auditors && company.auditors.indexOf(String(userId)) > -1) {
            user.isAuditor = true;
        }
    }

    // Show a list of users based on the request
    public static async getUsersPaginated(req: Request) {
        const company = req.company;

        if (req.user.isAuditor) {
            req.body.userType = "auditor";
        }

        const $match = UserService.getFinder(req.body, company);
        const { page, per_page } = req.body;
        const sortBy = req.body.sort_by || 'name';
        const sortOrder = req.body.sort_order || 1;

        const aggregate = [
            { $match },
            { $sort: { [sortBy]: sortOrder } },
            { $skip: per_page * (page - 1) },
            { $limit: per_page },
            {
                $lookup: {
                    from: "files",
                    as: "avatar",
                    localField: "avatar",
                    foreignField: "_id",
                },
            },
            {
                $unwind: {
                    path: "$avatar",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "companies",
                    as: "preferredCompany",
                    localField: "preferredCompany",
                    foreignField: "_id",
                },
            },
            {
                $unwind: {
                    path: "$preferredCompany",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    first_name: 1,
                    last_name: 1,
                    contact: 1,
                    email: 1,
                    approved: 1,
                    verified: 1,
                    deleted: 1,
                    preferredCompany: {
                        _id: 1,
                        name: 1,
                    },
                    city: 1,
                    zip_code: 1,
                    country: 1,
                    street: 1,
                    loginAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    avatar: {
                        key: 1,
                        bucket: 1,
                    },
                },
            },
        ];
        let users = await User.aggregate(aggregate);
        const count = await User.countDocuments($match);
        const paginate = PaginateService(count, users.length, per_page, page);

        users = users.map((x) => {
            UserService.addUserRoleInCompany(company, x, x._id);
            if (x.avatar) {
                x.avatar = S3Service.getUrl(x.avatar.key, x.avatar.bucket);
            } else {
                x.avatar = null;
            }
            return x;
        });

        return { users, paginate };
    }

    // Find a user based on query or create one based on the user passed
    public static async firstOrCreate(findQuery, user, notifyUser) {
        const M = `${S}[firstOrCreate]`;
        try {
            const data = await User.findOne(findQuery);
            if (data) { return data; }
            // Now before creating a new user, we will validate and add reset_token and other details
            user.password = -1;
            user.reset_token = AuthService.createToken();
            user.reset_expiry = dayjs().add(1, "day");
            user = await User.create(user);
            if (notifyUser) {
                UserEvents.created(user);
                await UserEvents.userAddedByAdmin(user);
            }
            return user;
        } catch (error) {
            if (error && error.code === 11000) {
                user.verified = 0;
                user.deleted = false;
                user = await User.findOneAndUpdate(findQuery, user, { new: true });
                if (notifyUser) {
                    await UserEvents.userAddedByAdmin(user);
                    UserEvents.created(user);
                }
                return user;
            }
            logger.error(M, error);
        }
    }

    // Show a single user based on the request param
    public static async getUser(req: Request) {
        const user: any = await User.findById(req.params.id, "-password")
            .populate("avatar", ["key", "bucket"])
            .populate("preferredCompany", ["_id", "name"])
            .lean();
        if (!user) {
            return false;
        }
        UserService.addUserRoleInCompany(req.company, user, req.params.id);
        delete user.verify_token;
        delete user.reset_token;
        delete user.password;
        user.avatar = !user.avatar ? null : S3Service.getUrl(user.avatar.key, user.avatar.bucket);
        return user;
    }

    // Update a user
    public static async updateUser(req: Request) {
        const user: any = await User.findById(req.params.id);
        if (!user) {
            return false;
        }

        // Update the user
        const {
            name,
            first_name,
            last_name,
            email,
            contact,
            country_code,
            city,
            country,
            street,
            preferredCompany,
            avatar,
            userType,
            approved,
            zip_code
        } = req.body;

        const updateParams = {
            name: name || ((first_name || '') + (last_name ? ` ${last_name}` : '')),
            first_name: first_name || name || user.first_name || user.name,
            last_name,
            email, contact, country_code, city, country, street,
            approved, avatar, preferredCompany,
            zip_code
        };
        _.forEach(updateParams, (v, k) => {
            if (v || v === false) {
                user[k] = v;
            }
        });
        await user.save();
        const updatedCompany: any = await UserService.updateUserRole(req.params.id, userType, req.company._id);
        AuthService.UpdateCompanyInReq(req, updatedCompany);
        // Return the updated user
        return await UserService.getUser(req);
    }

    public static async updateUserRole(userID, userType, companyID) {
        const userTypes = UserService.userTypes;
        if (userID && userType && userTypes.indexOf(userType) > -1) {
            const updateParamsCompany: any = { $addToSet: { [userType]: userID } };
            updateParamsCompany.$pull = {};
            for (const x of userTypes) {
                if (x !== userType) {
                    updateParamsCompany.$pull[x] = userID;
                }
            }
            return await Company.findOneAndUpdate({ _id: companyID }, updateParamsCompany, { new: true });
        }
    }

    // $match object based on the input filters
    private static getFinder(body, company) {
        const $match: any = {
            deleted: false,
        };

        const {
            _id,
            q,
            name,
            email,
            contact,
            city,
            country,
            street,
            preferredCompany,
            approved,
            verified,
            include_deleted,
        } = body;
        let { userType }: any = body;

        if (userType) {
            userType = (userType + "s").replace(/s+$/, "s");
            userType = userType.toLowerCase();
        }

        const matchParams = { preferredCompany, approved, verified };
        const regExParams = { name, email, contact, city, country, street };

        _.forEach(matchParams, (v, k) => {
            if (v) {
                $match[k] = v;
            }
        });

        _.forEach(regExParams, (v, k) => {
            if (v) {
                $match[k] = new RegExp(v, "ig");
            }
        });

        // Master search on all text fields
        if (q) {
            $match.$or = _.map(regExParams, (v, k) => {
                return { [k]: new RegExp(q, "ig") };
            });
        }

        if (include_deleted) {
            $match.deleted = true;
        }

        // Users
        company.admins = company.admins || [];
        company.viewers = company.viewers || [];
        company.auditors = company.auditors || [];
        let userIds;
        if (userType) {
            userIds = company[userType];
        } else {
            userIds = [...company.admins, ...company.viewers, ...company.auditors];
        }
        if (_id) {
            userIds = _.filter(userIds, (x) => x === _id);
        }
        $match._id = {
            $in: userIds.map((x) => {
                return Types.ObjectId(x);
            })
        };

        return $match;
    }
}
