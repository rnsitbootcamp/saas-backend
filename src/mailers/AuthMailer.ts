import Mailer from "./Mailer";

import logger from "../services/LoggerService";

const S = "[AuthMailer]";
export default class AuthMailer extends Mailer {

    constructor(toEmail: string) {
        super(toEmail);
    }

    public async userCreated(user) {
        const M = `${S}[userCreated]`;
        if (!user.verify_token) {
            return;
        }
        const templateName = "welcome";
        const variables = {
            email: user.email,
            username: user.name,
            verify_link: `${process.env.ACCOUNT_VERIFY_BASE_URL}?_id=${user._id}&verify_token=${user.verify_token}`,
        };

        await this.getTemplate(templateName, variables, "Welcome to POPPROBE.");

        logger.info(M, `Mail: Sending userCreated@AuthMailer to user ${this.toEmail}`);
        this.send();
    }

    public async sendResetMail(user) {
        const M = `${S}[sendResetMail]`;
        if (!user.reset_token) {
            logger.error(M, "Reset_token not found");
            throw new Error("Reset token not found");
        }

        const templateName = "reset";
        const username = user.name || user.first_name || user.last_name || user.email.split("@")[0];
        const variables = {
            email: user.email,
            username,
            reset_link: `${process.env.PASSWORD_RESET_BASE_URL}?_id=${user._id}&` +
            `reset_token=${user.reset_token}&username=${username}&email=${user.email}`,
        };

        await this.getTemplate(templateName, variables, "Reset Password");

        logger.error(`Mail: Sending sendResetMail@AuthMailer to user ${this.toEmail}`);
        this.send();
    }

    public async userAddedByAdmin(user) {
        const M = `${S}[userAddedByAdmin]`;
        const templateName = "admin_added_user";
        const username = user.name || user.first_name || user.last_name || user.email.split("@")[0];
        const variables = {
            username,
            email: user.email,
        };
        await this.getTemplate(templateName, variables, "Account created by admin.");

        logger.info(M, `Mail: Sending userAddedByAdmin@AuthMailer to user ${this.toEmail}`);
        this.send();
    }

    public async sendVerificationCodeEmail(user: { email: string, verificationCode: string }) {
        const M = `${S}[sendVerificationCodeEmail]`;
        const templateName = "send_email_verification_code";
        if (!user.verificationCode) {
            logger.error(M, "verification code not found");
            throw new Error("Failed to send email.");
        }
        const variables = {
            email: user.email,
            verificationCode: user.verificationCode
        };
        await this.getTemplate(templateName, variables, "Your Email verification code for POPPROBE");

        logger.info(M, `Mail added to Queue: ${this.toEmail}`);
        this.send();
    }
}
