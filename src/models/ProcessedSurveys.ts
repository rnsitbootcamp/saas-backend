import * as mongoose from "mongoose";
const collection = "processed_surveys";

const processFilesTemplate = new mongoose.Schema({
    images: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
    }],
    audios: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
    }],
    files: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
    }],
},
    {
        strict: false,
        versionKey: false,
        _id: false,
    },
);
const template = new mongoose.Schema(
    {
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        store_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
        },
        survey_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Survey",
            unique: true
        },
        files: processFilesTemplate,
        survey_added_at: {
            required: true,
            type: Date,
        },
        data: Object,
        gps: {
            latitude: Number,
            longitude: Number,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export default function ProcessedSurvey(connection) {
    if (connection) {
        return connection.model("ProcessedSurvey", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
