import * as mongoose from "mongoose";

const event = new mongoose.Schema(
    {
        type: {
            type: String,
        },
        message: {
            type: String,
        },
        data: {
            type: Object,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: false,
        },
    }, {
        versionKey: false,
    }
);

export default mongoose.model("Event", event);
