import * as mongoose from "mongoose";

const S = `[models/UserActivity]`;

export const userAppActivityTypes = {
    auth: ["login", "logout", "forgotPassword"],
    app: ["closedApp", "openApp"],
    survey: ["surveyStarted", "surveyCompleted", "submitSurvey",
        "updateSurvey", "selectPOC", "selectSKUs", "fillDetails"
    ],
    store: ["refreshStoresList", "createStore", "storeCreated", "selectStore", "editStore"],
    profile: ["updateProfile", "changePassword"],
    offline: ["syncOfflineFiles", "syncOfflineData"],
    other: ["selectCompany", "directions", "scanner", "openMaps", "uploadDocs", "captureSignature"],
    gps: ["gps"],
    break: ["startBreak", "endBreak", "startLunchBreak",
    "endLunchBreak", "startShortBreak", "endShortBreak", "startTeaBreak", "endTeaBreak"]
};
export const activityTypes = Object.keys(userAppActivityTypes);
export const activities = activityTypes.reduce((accumulator, currentValue) => {
      return [...accumulator, ...userAppActivityTypes[currentValue]];
}, []);

const UserActivity = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "companies",
        required: true
    },
    userAgent: {
        isMobile: Boolean,
        isDesktop: Boolean,
        isChrome: Boolean,
        isFirefox: Boolean,
        isAndroid: Boolean,
        source: String
    },
    type: {
        type: String,
        enum: activityTypes,
        required: true
    },
    title: {
        type: String,
        enum: activities,
        required: true
    },
    label: {
        type: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number]
        }
    },
    time: {
        type: Date
    }
},
    {
        timestamps: true,
    }
);

UserActivity.index(
    { companyId: 1, userId: 1, type: 1 }
);

export default mongoose.model("User-activity", UserActivity);
