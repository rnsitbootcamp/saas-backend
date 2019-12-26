import * as mongoose from "mongoose";
const collection = "store_map_reducer";

const filesTemplate = new mongoose.Schema({
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
        },
        files: filesTemplate,
        survey_added_at: {
            type: Date,
            required: true
        },
        data: {
            type: Object,
            required: true
        },
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

export default function StoredMapReducerData(connection) {
    if (connection) {
        return connection.model("StoredMapReducerData", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
