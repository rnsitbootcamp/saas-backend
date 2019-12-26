import * as kue from "kue";

import DefaultConfig from "../config/Default";

import logger from "./LoggerService";

const S = "[Queue]";

class Queue {

    public init() {
        const queue = kue.createQueue({
            redis: DefaultConfig.REDIS_URL,
            jobEvents: false,
        });
        this.attachHandlers(queue);
        queue.watchStuckJobs(3000);
        return queue;
    }

    public attachHandlers(queue) {
        const M = `${S}[attachHandlers]`;
        queue
            .on("job enqueue", (id, type) => {
                // logger.debug(M, "Job %s got queued of type %s", id, type);
            })
            .on("job complete", (id, result) => {
                kue.Job.get(id, (err, job) => {
                    if (err) { return; }
                    job.remove((jobRemoveError) => {
                        if (jobRemoveError) { throw jobRemoveError; }
                        logger.debug(M, "removed completed job #%d", job.id);
                    });
                });
            });
    }

    public attachJobHandlers(job) {
        const M = `${S}[attachJobHandlers]`;
        job.log(`The job#${job.id} is being logged`);
        job
            .on("complete", (result) => {
                logger.debug(M, "Job completed with data ", result);
            })
            .on("failed attempt", (errorMessage, doneAttempts) => {
                logger.debug(M, "Job failed");
            })
            .on("failed", (errorMessage) => {
                logger.debug(M, "Job failed");
            })
            .on("progress", (progress, data) => {
                logger.debug(M, "\r  job #" + job.id + " " + progress + "% complete with data ", data);
            });
    }
}

const q = new Queue();
export default q.init();
