"use strict";
require("dotenv").config();
import * as kue from "kue";
import * as nodemailer from "nodemailer";

import DefaultConfig from "../config/Default";
import MailConfig from "../config/Mail";

import FailedQueue from "../models/FailedQueue";

import logger from "../services/LoggerService";

const S = "[task][email]";
const mailService = MailConfig.driver;
const config = MailConfig[mailService];
const transporter = nodemailer.createTransport(config);

const processQueue = (data, done) => {
    const M = `${S}[processQueue]`;
    const { subject, to, from, html, attachments } = data;
    const mailOptions = { subject, to, from, html, text: html, attachments };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            FailedQueue.create({ type: "email", data, message: error });
            logger.error(M, error);
            return done(error);
        }
        logger.info(M, `Message sent: ${info.messageId} `, to, subject);
        done();
    });
};

export default function () {
    const queue = kue.createQueue({
        redis: DefaultConfig.REDIS_URL,
    });
    queue.process("email", 10, (job, done) => {
        processQueue(job.data, done);
    });
}
