import * as mongoose from "mongoose";
const collection = "survey-aggregated-data";

const template = new mongoose.Schema(
    {
        query_hash: {
            required: true,
            type: String,
        },
        region: {
            default: null,
            type: Number
        },
        sub_region: {
            default: null,
            type: Number
        },
        channel: {
            default: null,
            type: Number
        },
        sub_channel: {
            default: null,
            type: Number
        },
        surveyed_month: {
            required: true,
            type: Number,
            validate: {
                message: (props) => `${props.value} is not a valid survey month!`,
                validator:  (v) => {
                    return String(v).length >= 5 && String(v).length <= 6;
                },
            },
        },
        data: {
            required: true,
            type: Object,
        },
        gps: {
            latitude: Number,
            longitude: Number,
        },
    },
    {
        strict: false,
        timestamps: true,
        versionKey: false,
    },
);
template.index({ query_hash: 1, surveyed_month: 1 }, { unique: true });

export default function SurveyAggregated(connection) {
    if (connection) {
        return connection.model("SurveyAggregated", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
