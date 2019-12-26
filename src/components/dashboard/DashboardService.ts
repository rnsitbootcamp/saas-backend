
import { Request } from "express";
import * as _ from "lodash";
import dayjs = require("dayjs");

import Store from "../../models/Store";
import User from "../../models/User";

import UserAssignment from "../../models/UserAssignment";
import logger from "../../services/LoggerService";
import S3Service from "../../services/S3Service";
import ReportingService from "../viewer/store/ReportingService";

export default class DashboardService {

    public static async getData(req: Request) {
        try {
            const { storeCount, surveyedStoreCount } = req.query;
            const promises = storeCount && storeCount !== "undefined" ? [
                DashboardService.getStoreData(req)
            ]: surveyedStoreCount && surveyedStoreCount !== "undefined" ? [
                DashboardService.getSurveyedStoreData(req)
            ]:[
                DashboardService.getLeaderBoardData(req),
                DashboardService.getStoreData(req),
                DashboardService.getSurveyedStoreData(req),
                DashboardService.getActiveAuditors(req),
                // DashboardService.getAuditorsOnBreak(req),
                DashboardService.getStoreReportData(req)
            ];

            const data = await Promise.all(promises);

            return storeCount && storeCount !== "undefined"  ? {
                storeCount: data[0]
            } : surveyedStoreCount && surveyedStoreCount !== "undefined" ? {
                surveyedStoreCount: data[0]
            } 
            : {
                leaderBoard: data[0],
                storeCount: data[1],
                surveyedStoreCount: data[2],
                activeAuditorsCount: data[3][0],
                auditorsOnBreak: data[3][1],
                storeReport: {
                    data: {
                        stores: data[4].reports,
                    },
                    paginate: data[4].paginate
                }

            };
        } catch (e) {
            throw new Error(e);
        }
    }

    public static async getLeaderBoardData(req: Request) {
        try {
            const filter = req.query.filter || {};
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
                for (const assignment of data.assignments) {
                    if (assignment.survey && assignment.survey._id) {
                        totalCompleted++;
                    }
                }
                const user = _.find(users, (x: any) => {
                    return x._id.equals(data._id);
                });
                return {
                    ...{
                        user_id: data._id,
                        totalSurveys,
                        totalCompleted,
                        point: totalCompleted / totalSurveys
                    },
                    ...user
                };
            }).sort((x, y) => y.point - x.point);
            return result;
        } catch (e) {
            throw new Error(e);
        }
    }

    public static getStoreData(req: Request) {
        const query: any = { deleted: false };
        const { storeCount } = req.query;

        if (storeCount && storeCount !== "all") {
            query.createdAt = DashboardService.filterByDate(storeCount);
        }

        return Store(req.companyConnection).countDocuments(query);
    }

    public static getSurveyedStoreData(req: Request) {
        const query: any = { deleted: false, approved: true };
        const { surveyedStoreCount } = req.query;

        if (surveyedStoreCount && surveyedStoreCount !== "all") {
            query.createdAt = DashboardService.filterByDate(surveyedStoreCount);
        }

        return Store(req.companyConnection).countDocuments(query);
    }

    public static async getActiveAuditors(req: Request) {
        try {
           const auditors = await UserAssignment(req.companyConnection).distinct("user_id");
           const active = Math.ceil(Math.random()*auditors.length);
           return [active, auditors.length - active];
        } catch(e) {
            throw new Error(e);
        }
    }

    public static getAuditorsOnBreak(req: Request) {

    }

    public static getStoreReportData(req: Request) {
        return ReportingService.getStoreReport(
            { },
            { page: 1, per_page: 20, sortOrder: -1, sortBy: "createdAt" },
            req.companyConnection
        );
    }

    public static filterByDate(filter) {
        const date = date => new Date(new Date(new Date(new Date(date).setHours(0)).setMinutes(0)).setSeconds(0));
        const today = date(new Date());
        let obj;

        switch (filter) {
            case "today":
                obj = { $gte: today };
                break;

            case "weekly":
                obj = {
                    $gte: date(new Date().setDate(new Date().getDate() - 7)),
                    $lte: today
                };
                break;

            case "monthly":
                obj = {
                    $gte: date(new Date().setDate(1)),
                    $lte: today
                };
                break;

            case "yearly":
                obj = {
                    $gte: date(new Date(new Date().setDate(1)).setMonth(0)),
                    $lte: today
                };
                break;
        }

        return obj;
    }

}
