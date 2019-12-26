import * as dayjs from "dayjs";
import AuthMailer from "../mailers/AuthMailer";
import User from "../models/User";
import AuthService from "../services/AuthService";
class UserEvents {
    // Event to fire when user is created
    public created(user) {
        // Send mail
        const mailer = new AuthMailer(user.email);
        mailer.userCreated(user);
    }

    // When admin adds user
    public async userAddedByAdmin(user) {
        // Send mail
        const mailer = new AuthMailer(user.email);
        const update = {
            reset_token: AuthService.createToken(),
            // @ts-ignore
            reset_token_expiry: dayjs()
                .add(1, "day")
                .unix(),
        };
        user = await User.findOneAndUpdate({ email: user.email }, { $set: update }, { new: true });
        const resetMailer = new AuthMailer(user.email);
        resetMailer.sendResetMail(user);
        mailer.userAddedByAdmin(user);
    }
}

const Events = new UserEvents();
export default Events;
