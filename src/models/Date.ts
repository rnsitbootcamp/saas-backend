import * as mongoose from "mongoose";
const collection = "dates";
const template = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true,
            unique: true,
        },
        title: {
            type: Number,
            required: true,
            unique: true,
        },
        year: {
            type: Number,
            required: true,
        },
        month: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

export default function Date(connection) {
    if (connection) {
        return connection.model("Date", template, collection);
    } else {
        const message = `Tried to initialize to collection ${collection} but request does not have connection`;
        throw new Error(message);
    }
}
