import { NextFunction } from "express";
import * as mongoose from "mongoose";
import * as validator from 'validator';

const collection = "stores";
const template = new mongoose.Schema(
    {
        temp_id: {
            type: String,
        },
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            validate: {
                message: (props) => `${props.value} is not a valid email!`,
                validator: (v) => {
                    if (v === undefined) { return true; }
                    return validator.isEmail(v);
                },
            }
        },
        channel: {
            type: Object,
            required: true
        },
        sub_channel: {
            type: Object,
            required: true
        },
        region: {
            type: Object,
            required: true
        },
        sub_region: {
            type: Object,
            required: true
        },
        image: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
        }],
        gps: {
            latitude: Number,
            longitude: Number,
        },
        address: {
            type: String
        },
        authorizedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        approved: { type: Boolean, default: true },
        enabled: { type: Boolean, default: true },
        offline: { type: Boolean, default: false },
        disapproval_reason: {
            type: String,
        },
        deletedAt: { type: Date, default: null },
        deleted: { type: Boolean, default: false },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        }
    },
    {
        timestamps: true,
        versionKey: false
    },
);
// template.index({ name: 1, region: 1, sub_region: 1 }, { unique: true });

function findNotDeletedMiddleware(next: NextFunction) {
    this.where({ deleted: { $ne: true } });
    next();
}

template.pre("find", findNotDeletedMiddleware);
template.pre("findOne", findNotDeletedMiddleware);

export default function Store(connection) {
    if (connection) {
        return connection.model("Store", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
