import { NextFunction } from "express";
import * as mongoose from "mongoose";

const collection = "surveys";
const questionsTemplate = new mongoose.Schema(
    {
        id: {
            required: true,
            type: mongoose.Schema.Types.Mixed
        },
        title: {
            type: String,
            required: true
        },
        answer: {
            required: true,
            type: mongoose.Schema.Types.Mixed,
        },
        type: {
            type: String,
            required: true
        },
        startTime: {
            type: String,
            // required: true
        },
        endTime: {
            type: String,
            // required: true
        },
        gps: {
            latitude: Number,
            longitude: Number,
        },
        audio: {
            type: Array
        },
        images: {
            type: Array
        }
    }
);

const template = new mongoose.Schema(
    {
        store_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
        },
        assignment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Assignment",
        },
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
        },
        questions: [questionsTemplate],
        pocs: [{
            id: Number,
            poc_title: String,
            skus: [{
                id: Number,
                title: String,
                selected: Boolean,
                fronts: Number,
                customer_price: Number,
                expiry: Date,
                price: Number
            }]
        }],
        gps: {
            latitude: Number,
            longitude: Number,
        },
        survey_added_at: {
            type: Date,
            required: true
        },
        temp_store_id: String,
        offline: {
            type: Boolean,
            default: false,
        },
        signature: {
            type: String
        },
        approved: { type: Boolean },
        disapproval_reason: { type: String },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        deletedAt: { type: Date, default: null },
        deleted: { type: Boolean, default: false },
        startTime: {
            type: String,
            // required: true
        },
        endTime: {
            type: String,
            // required: true
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

function findNotDeletedMiddleware(next: NextFunction) {
    this.where({ deleted: { $ne: true } });
    next();
}

template.pre("find", findNotDeletedMiddleware);
template.pre("findOne", findNotDeletedMiddleware);

export default function Survey(connection) {
    if (connection) {
        return connection.model("Survey", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
