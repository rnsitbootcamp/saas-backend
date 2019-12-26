// Pending to do.
/// Need to rewrite this file. Split into services, Controllers, validator.
import { Request, Response } from "express";
import * as _ from "lodash";

import AggregatorData from "../../../models/AggregatorData";
import Files from "../../../models/File";
import ProcessedSurvey from "../../../models/ProcessedSurveys";
import Store from "../../../models/Store";
import StoreMapReducerData from "../../../models/StoreMapReducerData";
import User from "../../../models/User";

import Db from "../../../services/Db";
import logger from "../../../services/LoggerService";
import PaginateService from "../../../services/PaginateService";
import ResponseService from "../../../services/ResponseService";
import S3Service from "../../../services/S3Service";

import ExportServices from "./ExportService";
import ReportingService from "./ReportingService";

const S = "[ReportingController]";

export default class ReportingController {
    public static async index(req: Request, res: Response) {
        const { page, per_page } = req.query;

        Db.registerSchemas(["Store"], req.companyConnection);

        try {
            const stores = await ProcessedSurvey(req.companyConnection)
                .find()
                .skip((page - 1) * per_page)
                .limit(per_page)
                .populate("store_id", ["name", "channel", "sub_channel", "gps", "region", "sub_region"])
                .populate({ path: "files.images", model: Files })
                .populate({ path: "files.audios", model: Files })
                .populate({ path: "files.files", model: Files })
                .lean();
            try {
                for (const store of stores) {
                    store.files.images = store.files.images.map((x) => {
                        x.url = S3Service.getUrl(x.key, x.bucket);
                        return x;
                    });
                }
            } catch (error) {
                //
            }
            const count = await ProcessedSurvey(req.companyConnection).countDocuments();
            const paginate = PaginateService(count, stores.length, per_page, page);
            return ResponseService.success(res, { stores, paginate });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async show(req: Request, res: Response) {
        Db.registerSchemas(["Store"], req.companyConnection);
        try {
            const store = await ProcessedSurvey(req.companyConnection)
                .findOne({ store_id: req.params.id })
                .populate("store_id", ["-questions"])
                .populate({ path: "files.images", model: Files })
                .populate({ path: "files.audios", model: Files })
                .populate({ path: "files.files", model: Files })
                .lean();
            if (!store) {
                return ResponseService.notFoundError(res, "Store not found.");
            }
            try {
                store.files.images = store.files.images.map((x) => {
                    x.url = S3Service.getUrl(x.key, x.bucket);
                    return x;
                });
            } catch (error) {
                //
            }
            store.store = store.store_id;
            delete store.store_id;

            return ResponseService.success(res, store);
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async listStoreMapReducer(req: Request, res: Response) {
        const { page, per_page } = req.query;

        Db.registerSchemas(["Store"], req.companyConnection);

        try {
            const stores = await StoreMapReducerData(req.companyConnection)
                .find()
                .skip((page - 1) * per_page)
                .limit(per_page)
                .populate("store_id", ["name", "channel", "sub_channel", "gps", "region", "sub_region"])
                .populate({ path: "files.images", model: Files })
                .populate({ path: "files.audios", model: Files })
                .populate({ path: "files.files", model: Files })
                .lean();
            try {
                for (const store of stores) {
                    store.files.images = store.files.images.map((x) => {
                        x.url = S3Service.getUrl(x.key, x.bucket);
                        return x;
                    });
                }
            } catch (error) {
                //
            }
            const count = await StoreMapReducerData(req.companyConnection).countDocuments();
            const paginate = PaginateService(count, stores.length, per_page, page);
            return ResponseService.success(res, { stores, paginate });
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async showStoreMapReducer(req: Request, res: Response) {
        Db.registerSchemas(["Store"], req.companyConnection);
        Db.registerSchemas(["Survey"], req.companyConnection);
        try {
            const store = await StoreMapReducerData(req.companyConnection)
                .findOne({ _id: req.params.id })
                .populate("store_id", ["name", "region", "sub_region", "channel", "sub_channel"])
                .populate("survey_id", ["survey_added_at", "addedBy"])
                .populate({ path: "addedBy", model: User, select: "name" })
                .populate({ path: "files.images", model: Files })
                .populate({ path: "files.audios", model: Files })
                .populate({ path: "files.files", model: Files })
                .lean();
            if (!store) {
                return ResponseService.notFoundError(res, "Survey not found.");
            }
            try {
                store.files.images = store.files.images.map((x) => {
                    x.url = S3Service.getUrl(x.key, x.bucket);
                    return x;
                });
            } catch (error) {
                //
            }

            store.store = store.store_id;
            delete store.store_id;

            store.survey = store.survey_id;
            delete store.survey_id;

            return ResponseService.success(res, store);
        } catch (e) {
            return ResponseService.serverError(req, res, e);
        }
    }

    public static async getReports(req: Request, res: Response) {
        const M = `${S}[getReports][${req.request_id || ""}]`;
        try {
            logger.debug(M, 'Getting aggregate data');
            const data = await ReportingService.getData(req);
            return res.status(200).json({
                status: "success",
                ...data,
            });
        } catch (error) {
            if (error && error.name === "CastError") {
                logger.error(M, error.message);
            } else {
                logger.error(M, error);
            }
            return ResponseService.serverError(req, res, new Error('Report error'), "Server error");
        }
    }

    public static async getReportingFilters(req: Request, res: Response) {
        const M = `${S}[getReportingFilters][${req.request_id || ""}]`;
        try {
            const result = await Promise.all([
                Store(req.companyConnection).aggregate([
                    {
                        $group: {
                            _id: "$region",
                            sub_regions: { $addToSet: "$sub_region" }
                        }
                    }
                ]),
                Store(req.companyConnection).aggregate([
                    {
                        $group: {
                            _id: "$channel",
                            sub_channels: { $addToSet: "$sub_channel" }
                        }
                    }
                ]),
                AggregatorData(req.companyConnection).distinct("surveyed_month"),
            ]);

            const regions = [];
            const subRegions = [];
            for (const region of result[0]) {
                try {
                    regions.push({
                        id: region._id.id,
                        title: region._id.title
                    });
                    for (const subRegion of region.sub_regions) {
                        subRegions.push({
                            id: subRegion.id,
                            title: subRegion.title,
                            region_id: region._id.id
                        });
                    }
                } catch (error) {
                    logger.error(M, error);
                }
            }

            const channels = [];
            const subChannels = [];

            for (const channel of result[1]) {
                try {
                    channels.push({
                        id: channel._id.id,
                        title: channel._id.title
                    });
                    for (const subChannel of channel.sub_channels) {
                        subChannels.push({
                            id: subChannel.id,
                            title: subChannel.title,
                            channel_id: channel._id.id
                        });
                    }
                } catch (error) {
                    logger.error(M, error);
                }
            }

            // const data = {
            //     time_range: result[2].map((x) => {
            //         return {
            //             id: x,
            //             title: String(x).substr(0, 4) + "-" + String(x).substr(4)
            //         };
            //     }),
            //     region: regions,
            //     sub_region: subRegions,
            //     channel: channels,
            //     sub_channel: subChannels,
            // };
            result[2] = result[2].sort((x, y) => {
                return y - x;
            });
            const data = [
                {
                    title: "Date",
                    key: "time_range",
                    value: result[2].map((x) => {
                        return {
                            id: x,
                            title: String(x).substr(0, 4) + "-" + String(x).substr(4)
                        };
                    })
                },
                {
                    title: "Countries",
                    key: "region",
                    value: regions,
                },
                {
                    title: "Cities",
                    key: "sub_region",
                    value: subRegions,
                },
                {
                    title: "Channels",
                    key: "channel",
                    value: channels,

                },
                {
                    title: "Sub Channels",
                    key: "sub_channel",
                    value: subChannels,
                }
            ];
            return ResponseService.success(res, data, 'Reporting filters');
        } catch (error) {
            return ResponseService.serverError(req, res, error, `${M} Failed to fetch filters`);
        }
    }

    public static async getMonthReports(req: Request, res: Response) {
        try {
            const params = req.body;
            const { page, per_page, home_page } = params;
            const sortBy = params.sort_by || 'name';
            const sortOrder = params.sort_order || -1;
            const data = await ReportingService.getMonthWiseReport(params, {
                page, per_page, sortBy, sortOrder
            }, req.companyConnection);
            return ResponseService.success(res, data);
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async exportReport(req: Request, res: Response) {
        try {
            const ReportExporter = new ExportServices(req);
            const data = await ReportExporter.fetchData();
            if (_.isObject(data)) {
                return ResponseService.success(res, data, "Report sent successfully.");
            } else {
                const dateCreated = new Date().toISOString();
                res.setHeader('Content-disposition', `attachment; filename=report-${dateCreated}.csv`);
                res.setHeader('Content-type', 'text/csv');
                res.write(data);
                res.end();
            }
        } catch (error) {
            return ResponseService.serverError(req, res, error, "Failed to generate report");
        }
    }
}
