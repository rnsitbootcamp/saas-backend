export default {
    driver: process.env.MAIL_SERVICE || "DEBUGMAIL",
    SENDGRID: {
        pool: true,
        host: process.env.SENDGRID_HOST,
        port: process.env.SENDGRID_PORT || 587,
        auth: {
            user: process.env.SENDGRID_USERNAME,
            pass: process.env.SENDGRID_PASSWORD,
        },
    },
    MAILTRAP: {
        pool: true,
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT || 587,
        auth: {
            user: process.env.MAILTRAP_USERNAME,
            pass: process.env.MAILTRAP_PASSWORD,
        },
    },
    MAILGUN: {
        pool: true,
        host: process.env.MAILGUN_HOST,
        port: process.env.MAILGUN_PORT || 587,
        auth: {
            user: process.env.MAILGUN_USERNAME,
            pass: process.env.MAILGUN_PASSWORD,
        },
    },
    DEBUGMAIL: {
        pool: true,
        host: process.env.DEBUGMAIL_HOST,
        port: process.env.DEBUGMAIL_PORT || 587,
        auth: {
            user: process.env.DEBUGMAIL_USERNAME,
            pass: process.env.DEBUGMAIL_PASSWORD,
        },
    },
};
