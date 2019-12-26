import * as _ from "lodash";

import Mailer from "./Mailer";

import logger from "../services/LoggerService";

const S = "[otherMailer]";

export default class OtherMailer extends Mailer {

    constructor(toEmail: string) {
        super(toEmail);
    }

    public async storeDisapproval(user, admin, disapprovalReason) {
        const M = `${S}[storeDisapproval]`;
        const templateName = "store_disapproved";

        const variables = {
            user_email: user.email,
            username: user.name || user.first_name,
            admin_email: admin.email,
            admin_name: admin.name || admin.first_name,
            disapprovalReason,
        };

        await this.getTemplate(templateName, variables, "Store is Disapproved by admin");

        logger.error(M, `Mail: Sending disapproved warning to store user ${this.toEmail}`);
        this.send();
    }

    public async storeReport(report: { filename: string, content: string, contentType: string }, user) {
        const M = `${S}[storeReport]`;
        const templateName = "store_report";
        this.attachments = [report];
        const variables = {
            email: user.email,
            username: user.first_name || user.last_name || user.name
        };

        await this.getTemplate(templateName, variables, "Store Report");

        logger.error(M, `Mail: Sending report to ${this.toEmail}`);
        this.send();
    }
}
