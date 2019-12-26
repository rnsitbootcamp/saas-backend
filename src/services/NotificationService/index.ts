import { ExpoNotificationService } from "./ExpoNotificationService";
import NotificationService from "./NotificationService";

const PUSH_NOTIFICATION_SERVICE = process.env.PUSH_NOTIFICATION_SERVICE || 'expo';

export default async function pushNotification(userId, type = PUSH_NOTIFICATION_SERVICE): Promise<NotificationService> {
    if (type === 'expo') {
        const notification = new ExpoNotificationService(userId);
        await notification.init();
        return notification;
    } else {
        const notification = new NotificationService(userId);
        await notification.init();
        return notification;
    }
}
