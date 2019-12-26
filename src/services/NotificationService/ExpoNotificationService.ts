import Expo from 'expo-server-sdk';

import logger from '../LoggerService';
import NotificationService from "./NotificationService";

const expo = new Expo();

export class ExpoNotificationService extends NotificationService {
    constructor(userId) {
        super(userId);
    }

    public addMessage(message: { body: string, data: { [s: string]: any; } }) {
        if (!this.isTokenValid()) {
            return;
        }
        this.messages.push({
            to: this.pushToken,
            sound: 'default',
            body: message.body,
            data: message.data,
        });
    }

    public async send() {
        const chunks = expo.chunkPushNotifications(this.messages);
        const tickets = [];
        for (const chunk of chunks) {
            // NOTE: If a ticket contains an error code in ticket.details.error, you
            // must handle it appropriately. The error codes are listed in the Expo
            // documentation:
            // https://docs.expo.io/versions/latest/guides/push-notifications#response-format
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                logger.error(`Failed to send expo push notification: `, error);
                tickets.push(error);
            }
        }
        return tickets;
    }

    protected isTokenValid() {
        if (!Expo.isExpoPushToken(this.pushToken)) {
            logger.error(`Push token ${this.pushToken} is not a valid Expo push token`);
            return false;
        }
        return true;
    }
}
