import dayjs = require("dayjs");
import { Request, Response } from "express";
import * as useragent from 'express-useragent';
import { matchedData } from "express-validator/filter";
import * as _ from "lodash";
import { Types } from "mongoose";
import * as request from "request";

import User from "../../models/User";
import UserActivity, { userAppActivityTypes } from "../../models/UserActivity";

import UserAssignment from "../../models/UserAssignment";
import logger from "../../services/LoggerService";
import PaginateService from "../../services/PaginateService";
import ResponseService from "../../services/ResponseService";
import S3Service from "../../services/S3Service";
import { NextFunction } from "connect";

export default class MiscellaneousController {
    public static getCurrentTime(req: Request, res: Response) {
        const currentTime = new Date().getTime();
        return ResponseService.success(res, { time: currentTime }, 'Current time in UTC');
    }

    public static async savePushToken(req: Request, res: Response) {
        try {
            const bodyData = matchedData(req, { locations: ["body"] });
            await User.findByIdAndUpdate(req.user._id, { $set: bodyData });
            return ResponseService.success(res, null, "Token saved successfully.");
        } catch (error) {
            return ResponseService.serverError(req, res, error, "Save token failed.");
        }
    }

    public static async saveUserActivity(req: Request, res: Response) {
        try {
            const activities = [];
            for (const activity of (req.body.activities || [])) {
                const userAgent = useragent.parse(req.header('user-agent'));
                activity.userId = req.user._id;
                activity.companyId = req.company._id;
                if (userAgent) {
                    activity.userAgent = userAgent;
                }

                if (activity.location && activity.location.longitude && activity.location.latitude) {
                    // @ts-ignore
                    activity.location = {
                        type: 'Point', coordinates: [activity.location.longitude, activity.location.latitude]
                    };
                } else {
                    delete activity.location;
                }

                // @ts-ignore
                if (activity.title) {
                    activity.type = "other";
                    for (const type of Object.keys(userAppActivityTypes)) {
                        if (userAppActivityTypes[type].includes(activity.title)) {
                            // @ts-ignore
                            activity.type = type;
                        }
                    }
                }
                activities.push(activity);
            }

            let result = await UserActivity.insertMany(activities, { ordered: false, rawResult: true });
            if (result && result.length === 0) {
                throw new Error("All failed");
            }
            // @ts-ignore
            if (result && result.mongoose && result.mongoose.validationErrors) {
                // @ts-ignore
                result = result.mongoose.validationErrors;
            } else {
                result = [];
            }
            return ResponseService.success(res, result, "User activity saved successfully.");
        } catch (error) {
            return ResponseService.serverError(req, res, error, "User activity failed.");
        }
    }

    public static async getUserActivity(req: Request, res: Response) {
        try {
            const {
                page,
                per_page
            } = req.body;

            const sortBy = req.body.sort_by || 'createdAt';
            const sortOrder = req.body.sort_order || -1;

            const filter = req.body.filter || {};
            filter.time = dayjs(filter.time) || dayjs();
            if (filter.time) {
                filter.time = {
                    $gte: new Date(filter.time.$y, filter.time.$M, filter.time.$D, 0),
                    $lte: new Date(filter.time.$y, filter.time.$M, filter.time.$D, 24)
                };
            }
            filter.companyId = req.company._id;
            if (!req.user.isAdmin) {
                filter.userId = req.user._id;
            } else if (filter && filter.user_ids && filter.user_ids.length > 0) {
                filter.userId = { $in: filter.user_ids.map((x) => Types.ObjectId(x)) };
                delete filter.user_ids;
            }
            for (const key in filter) {
                if (filter[key] && _.isString(filter[key]) && filter[key].startsWith("-")) {
                    filter[key] = { $ne: filter[key].replace(/-/, "") };
                }
            }
            const aggregate = [
                { $match: filter },
                { $sort: { [sortBy]: sortOrder } },
                { $skip: per_page * (page - 1) },
                { $limit: per_page },
                {
                    $lookup: {
                        from: "users",
                        localField: "userId",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                { $unwind: "$user" },
                {
                    $lookup: {
                        from: "companies",
                        localField: "companyId",
                        foreignField: "_id",
                        as: "company",
                    },
                },
                { $unwind: "$company" },
                {
                    $project: {
                        title: 1,
                        type: 1,
                        label: 1,
                        time: 1,
                        location: {
                            longitude: { $arrayElemAt: ["$location.coordinates", 0] },
                            latitude: { $arrayElemAt: ["$location.coordinates", 1] }
                        }
                    }
                }
            ];

            const activities = await UserActivity.aggregate(aggregate);
            const count = await UserActivity.countDocuments(filter);
            const paginate = PaginateService(count, activities.length, per_page, page);
            return ResponseService.success(res, {
                data: activities, paginate
            }, "User activity listed successfully.");
        } catch (error) {
            return ResponseService.serverError(req, res, error, "failed.");
        }
    }

    public static async leaderBoard(req: Request, res: Response) {
        try {
            const filter = req.body.filter || {};
            filter.time = dayjs(filter.time) || dayjs();
            if (filter.time) {
                filter.time = {
                    $gte: new Date(filter.time.$y, filter.time.$M, 0),
                    $lte: new Date(filter.time.$y, filter.time.$M + 1, 0)
                };
            }
            filter.companyId = req.company._id;

            for (const key in filter) {
                if (filter[key] && _.isString(filter[key]) && filter[key].startsWith("-")) {
                    filter[key] = { $ne: filter[key].replace(/-/, "") };
                }
            }

            const aggregate = [
                {
                    $match: {
                        expires_at: filter.time
                    }
                },
                {
                    $lookup: {
                        from: "surveys",
                        localField: "survey_id",
                        foreignField: "_id",
                        as: "survey",
                    },
                },
                {
                    $unwind: {
                        path: "$survey",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $lookup: {
                        from: "stores",
                        localField: "store_id",
                        foreignField: "_id",
                        as: "store",
                    },
                },
                {
                    $unwind: {
                        path: "$store",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                { $group: { _id: "$user_id", assignments: { $push: "$$ROOT" } } }
            ];

            const assignments = await UserAssignment(req.companyConnection).aggregate(aggregate);
            let users = await User.aggregate([
                {
                    $match: { _id: { $in: assignments.map((data) => data._id) } }
                },
                {
                    $lookup: {
                        localField: "avatar",
                        foreignField: "_id",
                        from: "files",
                        as: "avatar",
                    },
                },
                { $unwind: { path: "$avatar", preserveNullAndEmptyArrays: true } },
                {
                    $project: { _id: 1, name: 1, avatar: 1, email: 1, contact: 1, createdAt: 1 }
                }
            ]);
            users = users.map((data: any) => {
                try {
                    if (data.avatar) {
                        data.avatar = S3Service.getUrl(data.avatar.key, data.avatar.bucket);
                    }
                } catch (error) {
                    logger.error("Som error in getting s3 signed url: ", error, data);
                }
                return data;
            });

            const result = assignments.map((data) => {
                const totalSurveys = data.assignments.length;
                let totalCompleted = 0;
                const stores = [];
                for (const assignment of data.assignments) {
                    if (assignment.survey && assignment.survey._id) {
                        totalCompleted++;
                    }

                    stores.push({
                        name: assignment.store.name,
                        survey_added_at: assignment.survey_date
                    });
                }
                const user = _.find(users, (x: any) => {
                    return x._id.equals(data._id);
                });
                return {
                    ...{
                        user_id: data._id,
                        totalSurveys,
                        totalCompleted,
                        point: totalCompleted / totalSurveys,
                        stores
                    },
                    ...user
                };
            }).sort((x, y) => y.point - x.point);
            return ResponseService.success(res, result, 'Leader board fetched successfully.');
        } catch (error) {
            return ResponseService.serverError(req, res, error, "failed.");
        }
    }

    /*
    The SKU = (Brand, Variant (flavor), Size (Ex. 500ml), +
     Package (Ex. PET or Glass bottle or Can etc.). Tag the returned data to create the SKU in our system)
    */
    // Rewrite this function properly, Product info doesn't have all info always
    public static barCodeInfo(req: Request, res: Response) {
        try {
            const barcode = req.params.id;
            const options = {
                method: 'GET',
                url: `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
                headers: {},
                json: true
            };

            request(options, (error, response, body) => {
                if (error) {
                    return ResponseService.error(res, "OOOmbi", 500);
                }
                if (body && body.product) {
                    const sku = (`${body.product.brands || ""}-${body.product.categories || ""}-` +
                        `${body.product.quantity || ""}` +
                        `-${body.product.packaging || ""}`).toLowerCase().replace(/\s/gim, "_");
                    body.sku = sku;
                }
                return ResponseService.success(res, body, "BarCode details");
            });
        } catch (error) {
            return ResponseService.error(res, "OOOmbi", 500);
        }
    }

    public static homePageStats(req: Request, res: Response) {
        const dateAdded =new Date().getTime(); 
        const increment = Math.floor(Math.floor((new Date().getTime() - dateAdded)/1000*60*60*24)/7);
        return res.status(200).json({
            status: "success",
            data: {
                brands: 5 + increment,
                countries: 10 + increment,
                sku: 50 + increment*2     
            },
        });
    }
}
