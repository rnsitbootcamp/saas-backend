#!/usr/bin/node
require("dotenv").config();
import * as dayjs from "dayjs";
import * as _ from "lodash";
import { createConnection } from "mongoose";

import DefaultConfig from "../config/Default";

import Company from "../models/Company";
import Store from "../models/Store";

import Db from "../services/Db";
import logger from "../services/LoggerService";
import Queue from "../services/Queue";

const redis = require("redis");
const async = require("async");
const redisClient = redis.createClient(DefaultConfig.REDIS_URL, { db: 2 });
const Redlock = require('redlock');

const redlock = new Redlock(
    // you should have one client for each independent redis node
    // or cluster
    [redisClient],
    {
        driftFactor: 0.01, // time in ms
        retryCount: 1,
        retryDelay: 200, // time in ms
        retryJitter: 200 // time in ms
    }
);
const RED_LOCK_TTL = 60000 * 5;

const S = "[PopulateAggregateQueries]";

export default class PopulateAggregateQueries {
    public static addJobToQueue(job) {
        return new Promise((resolve, reject) => {
            Queue
                .create("aggregate.processor", job)
                .priority("high")
                .attempts(5)
                .removeOnComplete(true)
                .save((error) => {
                    return error ? reject(error) : resolve();
                });
        });
    }

    public static addToPending(companyId, surveyAddedAt) {
        const d = dayjs(surveyAddedAt);
        // @ts-ignore
        const key = `pendingPopulate-${companyId}-${d.$y}-${d.$M}`;
        redisClient.hmset(key, {
            company_id: companyId.toString(),
            survey_added_at: surveyAddedAt.toISOString()
        });
    }

    public static listenForPendingPopulate() {
        const M = `${S}[listenForPendingPopulate]`;
        setInterval(async () => {
            redisClient.keys("pendingPopulate-*", (error, result) => {
                if (error) {
                    logger.error(M, "pendingPopulate-*:", error);
                }
                async.mapLimit(result, 1, (key, callback) => {
                    redisClient.hgetall(key, async (pendingError, pendingResult) => {
                        try {
                            const lock = await redlock.lock(`lock:${key}`, RED_LOCK_TTL);
                            if (pendingError) {
                                logger.error(M, pendingError);
                                return callback(null, pendingResult);
                            }
                            const queryPopulate = new PopulateAggregateQueries(
                                pendingResult.company_id, pendingResult.survey_added_at
                            );
                            await queryPopulate.init();
                            await queryPopulate.main();
                            try {
                                await lock.unlock();
                            } catch (error) {
                                logger.error(M, "Unlock failed", error);
                            }
                            redisClient.del(key, (delError) => {
                                if (pendingError) {
                                    logger.error(M, pendingError);
                                }
                                return callback(null, pendingResult);
                            });
                        } catch (error) {
                            logger.error(M, 'try/catch', error);
                            return callback();
                        }
                    });
                }, (asyncError) => {
                    if (asyncError) {
                        logger.error(M, asyncError);
                    }
                });
            });
        }, 30000);
    }

    private companyId;
    private connection;
    private company;
    private surveyDate;

    constructor(companyId, surveyDate?: string) {
        this.companyId = companyId;
        this.surveyDate = surveyDate;
    }

    public async init() {
        await this.setUpConnection();
    }

    public async main() {
        const regions = await Store(this.connection).distinct("region.id");
        regions.push(undefined);
        // const subRegions = await Store(this.connection).distinct("sub_region.id");
        // subRegions.push(undefined);
        // const channels = await Store(this.connection).distinct("channel.id");
        // channels.push(undefined);
        // const subChannels = await Store(this.connection).distinct("sub_channel.id");
        // subChannels.push(undefined);
        const parsedDate = dayjs(this.surveyDate);
        // @ts-ignore
        const month = String(parsedDate.$M + 1);
        // @ts-ignore
        const day = String(parsedDate.$D);
        // @ts-ignore
        const currentMonth = String(parsedDate.format("YYYY-MM-DD"));
        const regionOnlyList = [];

        const regionCityList = [];
        const regionCityChannelList = [];
        const regionCityChannelSubChannelList = [];
        for (const region of regions) {
            regionOnlyList.push({
                company_id: this.companyId,
                region,
                time_range: currentMonth,
            });

            const subRegionAggregate: any = [
                {
                    $group: {
                        _id: "region",
                        sub_regions: { $addToSet: "$sub_region.id" }
                    }
                }
            ];
            if (region) {
                subRegionAggregate.unshift({
                    $match: {
                        "region.id": region
                    }
                });
            }
            let subRegions = await Store(this.connection).aggregate(subRegionAggregate);
            if (subRegions && subRegions.length) {
                subRegions = subRegions[0].sub_regions || [];
            }
            subRegions = subRegions || [];
            subRegions.push(undefined);
            subRegions = _.uniq(subRegions);

            for (const subRegion of subRegions) {
                regionCityList.push({
                    company_id: this.companyId,
                    region,
                    sub_region: subRegion,
                    time_range: currentMonth,
                });

                let channels = await Store(this.connection).aggregate([
                    {
                        $match: {
                            "region.id": region,
                            "sub_region.id": subRegion
                        }
                    },
                    {
                        $group: {
                            _id: "region",
                            channels: { $addToSet: "$channel.id" }
                        }
                    }
                ]);
                if (channels && channels.length) {
                    channels = channels[0].channels || [];
                }
                channels = channels || [];
                channels.push(undefined);
                channels = _.uniq(channels);

                for (const channel of channels) {
                    regionCityChannelList.push({
                        company_id: this.companyId,
                        region,
                        sub_region: subRegion,
                        channel,
                        time_range: currentMonth,
                    });

                    let subChannels = await Store(this.connection).aggregate([
                        {
                            $match: {
                                "region.id": region,
                                "sub_region.id": subRegion,
                                "channel.id": channel
                            }
                        },
                        {
                            $group: {
                                _id: "region",
                                sub_channels: { $addToSet: "$sub_channel.id" }
                            }
                        }
                    ]);
                    if (subChannels && subChannels.length) {
                        subChannels = subChannels[0].sub_channels || [];
                    }
                    subChannels = subChannels || [];
                    subChannels.push(undefined);
                    subChannels = _.uniq(subChannels);

                    for (const subChannel of subChannels) {
                        regionCityChannelSubChannelList.push({
                            company_id: this.companyId,
                            region,
                            sub_region: subRegion,
                            channel,
                            sub_channel: subChannel,
                            time_range: currentMonth,
                        });
                    }
                }
            }
        }

        const regionChannelList = [];
        const regionChannelSubChannelLIst = [];
        for (const region of regions) {
            const channelMatch: any = {
                $match: {
                    "region.id": region
                }
            };
            const channelAggregate: any = [
                {
                    $group: {
                        _id: "region",
                        channels: { $addToSet: "$channel.id" }
                    }
                }
            ];
            if (region) {
                channelAggregate.unshift(channelMatch);
            }
            let channels = await Store(this.connection).aggregate(channelAggregate);
            if (channels && channels.length) {
                channels = channels[0].channels || [];
            }

            channels = channels || [];
            channels.push(undefined);
            channels = _.uniq(channels);
            for (const channel of channels) {
                regionChannelList.push({
                    company_id: this.companyId,
                    region,
                    channel,
                    time_range: currentMonth,
                });
                const subChannelAggregate: any = [
                    {
                        $group: {
                            _id: "region",
                            sub_channels: { $addToSet: "$sub_channel.id" }
                        }
                    }
                ];
                if (region) {
                    subChannelAggregate.unshift({
                        $match: {
                            "region.id": region,
                            "channel.id": channel
                        }
                    });
                } else {
                    subChannelAggregate.unshift({
                        $match: {
                            "channel.id": channel
                        }
                    });
                }
                let subChannels = await Store(this.connection).aggregate(subChannelAggregate);
                if (subChannels && subChannels.length) {
                    subChannels = subChannels[0].sub_channels || [];
                }
                subChannels = subChannels || [];
                subChannels.push(undefined);
                subChannels = _.uniq(subChannels);
                for (const subChannel of subChannels) {
                    regionChannelSubChannelLIst.push({
                        company_id: this.companyId,
                        region,
                        channel,
                        sub_channel: subChannel,
                        time_range: currentMonth,
                    });
                }
            }
        }
        for (const job of [...regionOnlyList, ...regionCityList,
        ...regionCityChannelList, ...regionCityChannelSubChannelList,
        ...regionChannelList, ...regionCityChannelSubChannelList]) {
            await PopulateAggregateQueries.addJobToQueue(job);
        }
    }

    private async setUpConnection() {
        const M = `${S}[setUpConnection]`;
        const company: any = await Company.findById(this.companyId);
        const dbUrl = `${process.env.MONGO_BASE_URL}${company.database.path}`;
        let companyConnection = global.CONNECTION_CACHE.get(dbUrl);
        if (!companyConnection) {
            logger.debug(M, `companyConnection not found in Cache. creating new one`, dbUrl);
            companyConnection = createConnection(dbUrl);
            global.CONNECTION_CACHE.set(dbUrl, companyConnection);
        }
        this.connection = companyConnection;
        this.company = company;
    }
}

async function scheduleTasks() {
    const M = `${S}[scheduleTasks]`;
    const companies = await Company.find({});
    for (const company of companies) {
        try {
            const x = new PopulateAggregateQueries(company._id);
            await x.init();
            await x.main();
        } catch (error) {
            logger.error(M, "Error in PopulateAggregate queries", error);
        }
    }
}

if (process.argv.length > 2) {
    const LRU = require("lru-cache");

    const CONNECTION_CACHE = new LRU({
        max: 300,
        dispose(key, connection) {
            try {
                connection.close();
            } catch (error) {
                // logger.error(S, "closing connection error:", error);
            }
        },
        maxAge: 1000 * 60 * 60 * 1,
    });
    global.CONNECTION_CACHE = CONNECTION_CACHE;
    setTimeout(async () => {
        await Db.init();
        await scheduleTasks();
    }, 3000);
}
