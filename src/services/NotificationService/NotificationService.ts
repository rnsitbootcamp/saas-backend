import User from '../../models/User';

export default class NotificationService {
    protected pushToken;
    protected messages = [];
    protected userId;

    constructor(userId) {
        this.userId = userId;
    }

    public async init() {
        const user: any = await User.findById(this.userId);
        if (!user || (user && !user.push_token)) {
            throw new Error("User/Push token not found.");
        }
        this.pushToken = user.push_token;
    }

    public send() {
        //
    }

    public addMessage(message: { body: string, data: { [s: string]: any; } }) {
        //
    }

    protected isTokenValid() {
        return true;
    }
}
