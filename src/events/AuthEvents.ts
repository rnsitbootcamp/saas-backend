import AuthMailer from "../mailers/AuthMailer";

class AuthEvents {
    // user resets password
    public async reset(user) {
        // Send mail
        const mailer = new AuthMailer(user.email);
        await mailer.sendResetMail(user);
    }

    // send verification email
    public async verificationCodeEmail(user: { email: string, verificationCode: string }) {
        // Send mail
        const mailer = new AuthMailer(user.email);
        await mailer.sendVerificationCodeEmail({
            email: user.email,
            verificationCode: user.verificationCode
        });
    }
}

const Events = new AuthEvents();
export default Events;
