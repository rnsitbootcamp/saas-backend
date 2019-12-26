require("dotenv").config();
const md5 = require("md5");

import * as _ from "lodash";
import { createConnection } from "mongoose";

import AggregatorData from "../models/AggregatorData";
import Company from "../models/Company";
import ProcessedSurveys from "../models/ProcessedSurveys";
import Store from "../models/Store";

import logger from "../services/LoggerService";

const S = "[AggregateProcessor]";
export default class AggregateProcessor {

    public static createQueryHash(data: { channel: number, sub_channel: number, region: number, sub_region: number }) {
        data = {
            channel: data.channel,
            sub_channel: data.sub_channel,
            region: data.region,
            sub_region: data.sub_region,
        };
        for (const i in data) {
            if (data[i] === undefined || data[i] === null) {
                delete data[i];
            }
        }
        return md5(JSON.stringify(data));
    }
    private channel: string;
    private subChannel: string;
    private region: string;
    private subRegion: string;
    private timeRange: number[];
    private companyId: string;
    private connection;
    private company;

    constructor(query: {
        company_id: string, channel: string,
        sub_channel: string, region: string,
        sub_region: string, time_range: number[]
    }) {
        this.channel = query.channel;
        this.subChannel = query.sub_channel;
        this.region = query.region;
        this.subRegion = query.sub_region;
        this.timeRange = query.time_range;
        if (!this.timeRange || (this.timeRange.length === 0)) {
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            this.timeRange = [firstDay.getTime(), lastDay.getTime()];
        }
        this.companyId = query.company_id;
    }

    public async init() {
        await this.setUpConnection();
    }

    public async process() {

        const filter = {
            "region.id": this.region,
            "sub_region.id": this.subRegion,
            "channel.id": this.channel,
            "sub_channel.id": this.subChannel,
        };
        for (const i in filter) {
            if (!filter[i]) { delete filter[i]; }
        }
        return await this.fetchAndProcessSurvey(filter);
    }

    public async fetchAndProcessSurvey(filter) {
        const stores = await Store(this.connection).find(filter);
        const query = {
            store_id: { $in: stores.map((store) => store._id) }, survey_added_at: {
                $gt: new Date(this.timeRange[0]),
                $lt: new Date(this.timeRange[1]),
            },
        };

        return await new Promise((resolve, reject) => {
            this.accumulateSurvey(query, async (error, accumulated) => {
                if (accumulated && accumulated.data) { accumulated.data = await this.computeScore(accumulated.data); }
                return error ? reject(error) : resolve(accumulated);
            });
        });
    }

    public accumulateSurvey(query, callback, skip = 0, accumulated = null) {
        ProcessedSurveys(this.connection).find(query, null, { limit: 100, skip }, (error, processedSurveys) => {
            if (error) { return callback(error, accumulated); }
            if (processedSurveys && processedSurveys.length === 0) { return callback(null, accumulated); }
            for (const processedSurvey of processedSurveys) {
                if (!accumulated) {
                    accumulated = processedSurvey;
                } else {
                    const result = this.addTwoProcessedSurveyData(accumulated.data, processedSurvey.data);
                    accumulated.data = result;
                }
            }
            this.accumulateSurvey(query, callback, skip + processedSurveys.length, accumulated);
        });
    }

    public addTwoProcessedSurveyData(data1, data2) {
        data1 = _.cloneDeep(data1);
        data2 = _.cloneDeep(data2);
        data1.weight += data2.weight;
        data1.points.obtained += data2.points.obtained;
        data1.points.possible += data2.points.possible;
        (data1.sub_kpis || []).forEach((subKpi, i) => {
                let tempData2: any = _.find(data2.sub_kpis, { id: data1.sub_kpis[i].id });
                if (!tempData2) { tempData2 = _.find(data2.sub_kpis, { title: data1.sub_kpis[i].title }); }
                if (tempData2) {
                    data1.sub_kpis[i] = this.addTwoProcessedSurveyData(data1.sub_kpis[i], tempData2);
                }
        });
        return data1;
    }

    public computeScore(data) {
        data.score = _.divide(data.points.obtained, data.weight);
        for (const d of data.sub_kpis) {
            this.computeScore(d);
        }
        return data;
    }

    public async save(data) {
        try {
            return await AggregatorData(this.connection).create(data);
        } catch (error) {
            if (error && error.code === 11000) {
                await AggregatorData(this.connection).update({
                    surveyed_month: data.surveyed_month,
                    query_hash: data.query_hash
                }, { $set: data }, {upsert: true});
                logger.info("Aggregator data updated: ", {
                    surveyed_month: data.surveyed_month,
                    query_hash: data.query_hash
                });
                return;
            }
            logger.error("Aggregator data save error: ", error);
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
