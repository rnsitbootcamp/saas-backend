"use strict";
require("dotenv").config();
import * as fs from "fs";
import * as kue from "kue";
import * as Console from "signale";

import DefaultConfig from "../config/Default";

import FailedQueue from "../models/FailedQueue";
import File from "../models/File";

import logger from "../services/LoggerService";
import S3Service from "../services/S3Service";

const S = "[fileUploads]";

const processFiles = (files, cb) => {
    const M = `${S}[processFiles]`;
    files.forEach(async (file) => {
        const response = await processFile(file);
        logger.error(M, { response, file: file.filename });
    });
    cb();
};

const processFile = async (file) => {
    // Upload file to S3, insert it in DB and do processing if image.
    // Finally remove the file from the fileSystem
    try {
        Console.start(`File upload to S3: ${file.filename}`);
        file.key = S3Service.fileKey(file);
        await S3Service.uploadFile(file);
        Console.success(`File upload to S3: ${file.filename}`);

        file.contentType = file.mimetype;
        file.name = file.originalname;
        const addedFile = await File.create(file);
        Console.success(`File inserted: ${addedFile._id}`);

        fs.unlinkSync(file.path);
        Console.success(`File unlinked: ${file.filename}`);

        return true;
    } catch (e) {
        Console.error(`Error uploading: ${e.message}`);
        FailedQueue.create({ type: "fileUpload", data: file, message: e.message });
        return false;
    }
};

export default function() {
    Console.start("Initializing File Upload Processor");
    const queue = kue.createQueue({
        redis: DefaultConfig.REDIS_URL,
    });

    queue.process("fileUpload", (job, done) => {
        Console.start(`Processing fileUpload queue. Files to process: ${job.data.length}`);
        processFiles(job.data, done);
    });
}
