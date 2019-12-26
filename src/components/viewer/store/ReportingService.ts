import async from "async";
import * as dayjs from "dayjs";
import { Request } from "express";
import * as _ from "lodash";

import AggregatorData from "../../../models/AggregatorData";
import Files from "../../../models/File";
import Store from "../../../models/Store";
import StoreMapReducerData from "../../../models/StoreMapReducerData";
import User from "../../../models/User";

import PaginateService from "../../../services/PaginateService";
import S3Service from "../../../services/S3Service";

export default class ReportingService {

    public static async mergeAggregateData(report, key, query, connection) {
        const Queries = (query[key].$in || query[key]).map((x) => {
            const newQuery = _.cloneDeep(query);
            newQuery[key] = x;
            return newQuery;
        });
        const newReport = [];
        for (const Query of Queries) {
            const dataWithSameKeyValue: any = _.filter(report, Query);
            const dataData = [];
            const storeCount = await ReportingService.getStoreCount(Query, connection);
            for (const datum of dataWithSameKeyValue) {
                datum.data.channel = datum.channel;
                dataData.push(datum.data);
            }
            if (dataWithSameKeyValue && dataWithSameKeyValue.length) {
                dataWithSameKeyValue[0].storeCount = storeCount;
                dataWithSameKeyValue[0].data = dataData;
                newReport.push(dataWithSameKeyValue[0]);
            }
        }
        return newReport;
    }

    public static async getStoreReport(
        query: {
            store_id: any,
            survey_added_at?: any
        } | any,
        paginate: {
            per_page: number,
            page: number,
            sortOrder: number,
            sortBy: string
        },
        connection: any,
        onlyCount?: boolean
    ) {
        const filters: any = _.omitBy(query, (x) => x === undefined);
        const aggregate = [
            { $match: filters },
            { $sort: { survey_added_at: -1 } },
            { $skip: ((paginate.page || 1) - 1) * (paginate.per_page || 50) },
            { $limit: paginate.per_page || 50 },
            {
                $lookup: {
                    from: "stores",
                    localField: "store_id",
                    foreignField: "_id",
                    as: "store",
                },
            },
            { $unwind: "$store" },
            { $sort: { [`store.${paginate.sortBy}`]: paginate.sortOrder } },
            { $sort: { survey_added_at: -1 } },
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
                $project: {
                    _id: 1,
                    store: {
                        _id: 1,
                        name: 1,
                        channel: 1,
                        sub_channel: 1,
                        region: 1,
                        image: 1,
                        sub_region: 1,
                        gps: 1,
                        address: 1,
                    },
                    survey: {
                        _id: 1,
                        date: 1,
                        survey_added_at: 1,
                    },
                    survey_added_at: 1,
                    addedBy: 1,
                    data: 1,
                    gps: 1,
                    files: 1
                },
            },
        ];
        const totalReports = await StoreMapReducerData(connection).countDocuments(filters);
        if (onlyCount) {
            return totalReports;
        }
        let reports = await StoreMapReducerData(connection).aggregate(aggregate);
        reports = await StoreMapReducerData(connection)
            .populate(reports,
                [
                    { path: "files.images", model: Files, },
                    { path: "addedBy", model: User, select: ["email", "name", "first_name", "last_name"] }
                ]);
        for (const report of reports) {
            report.files.images = report.files.images.map((x) => {
                return {
                    url: S3Service.getUrl(x.key, x.bucket)
                };
            });
        }
        const nextPaginate = PaginateService(totalReports, reports.length, paginate.per_page, paginate.page);
        return {
            reports,
            paginate: nextPaginate
        };
    }

    public static async getChannelWiseReport(
        filters: {
            region: any,
            sub_region: any,
            surveyed_month: any,
            channel: any
        },
        connection: any) {

        let channels: any = await Store(connection).distinct("channel") || [];
        if (filters.channel) {
            channels = [_.find(channels, (x) => {
                return x.id === filters.channel;
            })];
        } else {
            channels.unshift({ id: null, title: "Total" });
        }
        channels = _.uniqBy(channels, (x: any) => {
            return x.id;
        });
        return new Promise((resolve, reject) => {
            async.mapLimit(channels, 3, async (channel) => {
                let channelFilter: any = _.clone(filters);
                channelFilter.channel = channel.id;
                channelFilter = _.omitBy(channelFilter, (x) => x === undefined);
                const result = await AggregatorData(connection).findOne(channelFilter).lean();
                if (result) {
                    result.channel = _.find(channels, { id: result.channel });
                    result.title = result.channel ? result.channel.title : result.title;
                }
                return result;
            }, (error, results) => {
                results = results.filter((x) => x);
                return error ? reject(error) : resolve(results);
            });
        });
    }

    public static async getMonthWiseReport(
        filters: {
            region?: any,
            sub_region?: any,
            channel?: any,
            sub_channel?: any,
            store_id?: any
        },
        paginate: {
            per_page: number,
            page: number,
            sortOrder: number,
            sortBy: string
        },
        connection: any
    ) {
        filters = _.clone(filters);
        const channels = await Store(connection).distinct("channel");
        if (filters.store_id) {
            const storesData = await ReportingService.getStoreReport(
                {
                    store_id: filters.store_id,
                },
                {
                    page: paginate.page,
                    per_page: paginate.per_page,
                    sortBy: paginate.sortBy,
                    sortOrder: paginate.sortOrder
                },
                connection
            );
            storesData.reports = storesData.reports.map((x) => {
                if (x.channel) {
                    x.channel = _.find(channels, (y) => y.id === x.channel);
                }
                if (x.channel && x.channel.title) {
                    x.title = x.channel.title;
                    x.data.title = x.channel.title;
                }
                x.data = [x.data];
                return x;
            });
            return storesData.reports;
        } else if (filters.region && !filters.sub_region) {
            const regions = await Store(connection).distinct("region");
            let result = await AggregatorData(connection).find({
                region: filters.region,
                sub_region: null,
                channel: filters.channel || null,
                sub_channel: filters.sub_channel || null
            }).lean();
            result = result.map((x) => {
                if (x.region) {
                    x.region = _.find(regions, (y) => y.id === x.region);
                }
                if (x.channel) {
                    x.channel = _.find(channels, (y) => y.id === x.channel);
                }
                if (x.channel && x.channel.title) {
                    x.title = x.channel.title;
                    x.data.title = x.channel.title;
                }
                x.data = [x.data];
                return x;
            });
            return result;
        } else if (filters.region && filters.sub_region) {
            const regions = await Store(connection).distinct("region");
            const subRegions = await Store(connection).distinct("sub_region");
            let result = await AggregatorData(connection).find({
                region: filters.region,
                sub_region: filters.sub_region,
                channel: filters.channel || null,
                sub_channel: filters.sub_channel || null
            }).lean();
            result = result.map((x) => {

                if (x.channel) {
                    x.channel = _.find(channels, (y) => y.id === x.channel);
                }
                if (x.region) {
                    x.region = _.find(regions, (y) => y.id === x.region);
                }
                if (x.sub_region) {
                    x.sub_region = _.find(subRegions, (y) => y.id === x.sub_region);
                }
                if (x.channel && x.channel.title) {
                    x.title = x.channel.title;
                    x.data.title = x.channel.title;
                }
                x.data = [x.data];
                return x;
            });
            return result;
        } else {
            throw new Error("Unsupported filters.");
        }
    }

    public static getStoreCount(
        query: {
            region?: any,
            sub_region?: any,
            channel?: any,
            sub_channel?: any
        },
        connection: any) {
        const filter = {};
        for (const key in query) {
            if (key && query[key] && ['region', 'sub_region', 'channel', 'sub_channel'].includes(key)) {
                filter[`${key}.id`] = query[key];
            }
        }
        return Store(connection).countDocuments(filter);
    }

    public static async getData(req: Request) {
        const params = req.body;
        const { page, per_page, home_page } = params;
        const sortBy = params.sort_by || 'name';
        const sortOrder = params.sort_order || -1;
        const parsedDate = dayjs(String(params.time_range || params.date || dayjs()));
        // @ts-ignore
        const surveyMonth = Number(parsedDate.format("YYYYMM"));
        const channels = await Store(req.companyConnection).distinct("channel");
        if ((params.region && params.sub_region && !home_page) || params.stores) {
            // @ts-ignore
            const firstDayOfMonth = new Date(parsedDate.$y, parsedDate.$M, 1);
            // @ts-ignore
            const lastDayOfMonth = new Date(parsedDate.$y, parsedDate.$M + 1, 0);
            let storeQuery: any = {
                "region.id": params.region,
                "sub_region.id": params.sub_region,
                "channel.id": params.channel,
                "sub_channel.id": params.sub_channel
            };
            storeQuery = _.omitBy(storeQuery, (x) => x === undefined);
            const stores = await Store(req.companyConnection)
                .find(storeQuery);
            // .skip(((page || 1) - 1) * (per_page || 50))
            // .limit(per_page || 50)
            // .sort({ [sortBy]: sortOrder });
            const storesData = await ReportingService.getStoreReport(
                {
                    store_id: { $in: stores.map((x) => x._id) },
                    survey_added_at: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
                },
                { page, per_page, sortOrder, sortBy },
                req.companyConnection
            );
            return {
                data: {
                    stores: storesData.reports,
                },
                paginate: storesData.paginate
            };
        } else if (!params.region && !params.sub_region) {
            const countries = await Store(req.companyConnection).distinct("region");
            let query1: any = {
                region: { $in: countries.map((x) => x ? x.id : undefined).filter((x) => x) },
                sub_region: null,
                surveyed_month: surveyMonth,
                channel: params.channel || (home_page ? undefined : null),
                sub_channel: params.sub_channel || null
            };
            query1 = _.omitBy(query1, (x) => x === undefined);
            const promises = [
                AggregatorData(req.companyConnection).find(query1).lean()
            ];
            promises.push(ReportingService.getChannelWiseReport({
                region: null,
                surveyed_month: query1.surveyed_month,
                sub_region: query1.sub_region,
                channel: params.channel
            }, req.companyConnection));
            promises.push(ReportingService.getStoreCount(params, req.companyConnection));
            const result = await Promise.all(promises);
            let countriesData = result[0];
            let channelData = result[1];
            const storeCount = result[2];
            if (home_page) {
                countriesData = await ReportingService.mergeAggregateData(
                    countriesData, 'region', query1, req.companyConnection
                );
            }
            countriesData = countriesData = countriesData.map((x) => {
                x.region = _.find(countries, { id: x.region });
                if (home_page) {
                    x.data = x.data.map((y) => {
                        if (y.channel) {
                            y.channel = _.find(channels, { id: y.channel });
                            y.title = y.channel ? y.channel.title : "Total";
                        } else {
                            y.channel = {
                                id: null,
                                title: "Total"
                            };
                        }
                        return y;
                    });
                }
                return x;
            });
            channelData = (channelData || []).map((x) => {
                x.region = _.find(countries, { id: x.region });
                return x;
            });
            return {
                data: {
                    countries: countriesData,
                    channel: channelData,
                    storeCount
                },
            };
        } else if (params.region) {
            const store = await Store(req.companyConnection).findOne(
                { "region.id": params.region }, "region sub_region");
            let cities = await Store(req.companyConnection).aggregate([
                {
                    $match: {
                        "region.id": params.region
                    }
                },
                {
                    $group: {
                        _id: "$region",
                        sub_regions: { $addToSet: "$sub_region" }
                    }
                }
            ]);
            if (cities && cities.length) {
                cities = cities[0].sub_regions;
            }
            // let cities = await Store(req.companyConnection).distinct("sub_region");
            if (home_page && params.sub_region) {
                cities = cities.filter((x) => {
                    return x.id === params.sub_region;
                });
            }
            let query1: any = {
                region: params.region,
                sub_region: { $in: cities.map((x) => x ? x.id : undefined).filter((x) => x) },
                surveyed_month: surveyMonth,
                channel: params.channel || (home_page ? undefined : null),
                sub_channel: params.sub_channel || null
            };
            query1 = _.omitBy(query1, (x) => x === undefined);
            const promises = [
                AggregatorData(req.companyConnection).find(query1).lean()
            ];
            promises.push(ReportingService.getChannelWiseReport({
                region: query1.region,
                surveyed_month: query1.surveyed_month,
                sub_region: null,
                channel: params.channel
            }, req.companyConnection));
            promises.push(ReportingService.getStoreCount(params, req.companyConnection));
            const result = await Promise.all(promises);
            let citiesData = result[0];
            let channelData = result[1];
            const storeCount = result[2];
            if (home_page) {
                citiesData = await ReportingService.mergeAggregateData(
                    citiesData, 'sub_region', query1, req.companyConnection
                );
            }
            citiesData = citiesData.map((x) => {
                x.region = store.region;
                x.sub_region = _.find(cities, { id: x.sub_region });
                if (home_page) {
                    x.data = x.data.map((y) => {
                        if (y.channel) {
                            y.channel = _.find(channels, { id: y.channel });
                            y.title = y.channel ? y.channel.title : "Total";
                        } else {
                            y.channel = {
                                id: null,
                                title: "Total"
                            };
                        }
                        return y;
                    });
                }
                return x;
            });

            channelData = (channelData || []).map((x) => {
                x.region = store.region;
                x.sub_region = _.find(cities, { id: x.sub_region });
                return x;
            });

            return {
                data: {
                    cities: citiesData,
                    channel: channelData,
                    storeCount
                },
            };
        } else {
            throw new Error("Unsupported filters");
        }
    }

}
