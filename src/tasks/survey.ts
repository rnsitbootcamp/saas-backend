"use strict";
require("dotenv").config();
import * as kue from "kue";
import * as Console from "signale";

import FailedQueue from "../models/FailedQueue";
import SurveyProcessor from "../processor";

import logger from "../services/LoggerService";

const S = "[tasks][survey]";

export default function () {
    const M = `${S}[default]`;
    Console.info("Initializing Survey Processor");

    // processSurvey(data, function () {
    //   Console.info(`The survey ${JSON.stringify(data)} has been processed.`);
    // });

    const queue = kue.createQueue();
    queue.process("survey", 2, (job, done) => {
        logger.info(M, "Processing survey queue");
        processSurvey(job.data, done);
    });
}

const processSurvey = async (data, done) => {
    const M = `${S}[processSurvey]`;
    try {
        const processor = new SurveyProcessor(data);
        const status = await processor.init();
        logger.error(M, `Processing finished: ${JSON.stringify(status, null, 2)}`);
    } catch (e) {
        FailedQueue.create({ type: "survey", data, message: e.message });
        logger.error(M, `Processing failed: ${e.message}`);
    }
    done();
};
