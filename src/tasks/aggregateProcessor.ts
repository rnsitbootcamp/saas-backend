"use strict";

require("dotenv").config();
import * as dayjs from "dayjs";
import * as kue from "kue";

import DefaultConfig from "../config/Default";

import FailedQueue from "../models/FailedQueue";

import AggregateProcessor from "../processor/AggregateProcessor";
import StoreMapReducer from "../processor/StoreMapReducer";

import logger from "../services/LoggerService";

const S = "[aggregateProcessor]";

const processQueue = async (data, done) => {
    const M = `${S}[processQueue]`;
    try {
        const parsedDate = dayjs(data.time_range);
        // @ts-ignore
        const currentMonthFirstDay = new Date(parsedDate.$y, parsedDate.$M, 1);
        // @ts-ignore
        const currentMonthLastDay = new Date(parsedDate.$y, parsedDate.$M + 1, 0);
        const currentMonth = [currentMonthFirstDay.getTime(), currentMonthLastDay.getTime()];

        // Aggregate data for current month
        const currentMonthProcessor = new AggregateProcessor({
            company_id: data.company_id,
            channel: data.channel,
            sub_channel: data.sub_channel,
            region: data.region,
            sub_region: data.sub_region,
            time_range: currentMonth,
        });

        await currentMonthProcessor.init();
        const currentMonthAggregateData = await currentMonthProcessor.process();
        // @ts-ignore
        const previousMonthFirstDay = new Date(parsedDate.$y, (parsedDate.$M - 1), 1);
        // @ts-ignore
        const previousMonthLastDay = new Date(parsedDate.$y, (parsedDate.$M), 0);
        const previousMonth = [previousMonthFirstDay.getTime(), previousMonthLastDay.getTime()];
        // Aggregate data for previous month
        const previousMonthProcessor = new AggregateProcessor({
            company_id: data.company_id,
            channel: data.channel,
            sub_channel: data.sub_channel,
            region: data.region,
            sub_region: data.sub_region,
            time_range: previousMonth,
        });
        await previousMonthProcessor.init();
        const previousMonthAggregateData = await previousMonthProcessor.process();
        // MapReduce the data calculate  vspp
        const storeMap = await new StoreMapReducer(this.connection);
        await storeMap.init({
            survey: currentMonthAggregateData,
            previousSurvey: previousMonthAggregateData,
        });
        const finalAggregatedOutput = storeMap.process();

        // @ts-ignore
        const month = String(parsedDate.$M + 1);
        const payload = {
            gps: finalAggregatedOutput.gps,
            query_hash: AggregateProcessor.createQueryHash(data),
            channel: data.channel || null,
            sub_channel: data.sub_channel || null,
            region: data.region || null,
            sub_region: data.sub_region || null,
            // @ts-ignore
            surveyed_month: Number(String(parsedDate.format("YYYYMM"))),
            data: finalAggregatedOutput.data,
        };
        await currentMonthProcessor.save(payload);
        return done();
    } catch (error) {
        logger.error(M, "Aggregate processor error: ", error);
        FailedQueue.create({ type: "email", data, message: error });
        return done();
    }
};

export default function() {
    const M = `${S}[default]`;
    logger.info(M, "Initializing aggregate Processor");
    const queue = kue.createQueue({
        redis: DefaultConfig.REDIS_URL,
    });
    queue.process("aggregate.processor", 1, (job, done) => {
        processQueue(job.data, done);
    });
}
