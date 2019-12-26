import OtherMailer from "../mailers/OtherMailer";

import User from "../models/User";

import logger from "../services/LoggerService";
import pushNotification from "../services/NotificationService";
import NotificationService from "../services/NotificationService/NotificationService";

const S = "[StoreEvents]";

export default class StoreEvents {
    private store;
    constructor(store) {
        this.store = store;
    }
    public async storeDisapproved({ admin, disapproval_reason }) {
        const M = `${S}[store_disapproved]`;
        try {
            if (this.store.lastUpdatedBy.toString() !== admin._id.toString()) {
                const lastUpdatedBy: any = await User.findOne({
                    _id: this.store.lastUpdatedBy,
                });
                const mailer = new OtherMailer(lastUpdatedBy.email);
                await mailer.storeDisapproval(lastUpdatedBy, admin, disapproval_reason);
            }
            if (this.store.addedBy.toString() !== admin._id.toString()) {
                const addedBy: any = await User.findOne({
                    _id: this.store.addedBy,
                });
                const mailer = new OtherMailer(addedBy.email);
                await mailer.storeDisapproval(addedBy, admin, disapproval_reason);
            }
        } catch (error) {
            logger.error(M, "Store disapprove event error occurred:", error);
        }
    }

    public async storeDisapprovedSendPushNotification(storeId, message, userId) {
        const notification: NotificationService = await pushNotification(userId);
        notification.addMessage({
            body: `Store you created got disapproved: ${message}`,
            data: {
                store_id: storeId
            }
        });
        const result = await notification.send();
        logger.info(`${S}[sendPushNotification]`, result);
        return result;
    }
}
