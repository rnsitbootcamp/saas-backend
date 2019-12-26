import * as mongoose from "mongoose";

const queue = new mongoose.Schema({
    type: {
        type: String,
    },
    data: {
        type: Object,
    },
    message: {
        type: String,
    },
}, {
        strict: false,
        versionKey: false,
        collection: "failed_queue",
    }
);

export default mongoose.model("FailedQueue", queue);
