import * as otpGenerator from "otp-generator";
import * as redis from "redis";

import DefaultConfig from "../../config/Default";

import AuthEvents from "../../events/AuthEvents";

import logger from "../../services/LoggerService";

const redisClient = redis.createClient(DefaultConfig.REDIS_URL, { db: 2 });

const S = "[AuthUtils]";

export default class AuthUtils {

    public static generateUniqueVerificationCode() {
        return otpGenerator.generate(6, { upperCase: false, specialChars: false });
    }

    public static getKeyForUniqueVerificationCode(email: string) {
        return `unique_email_verification_key:${email}`;
    }

    public static checkRedisKeyExists(key) {
        return new Promise((resolve, reject) => {
            redisClient.exists(key, (error, isExists) => {
                return error ? reject(error) : resolve(isExists);
            });
        });
    }

    public static getKey(key) {
        return new Promise((resolve, reject) => {
            redisClient.hgetall(key, (error, result) => {
                return error ? reject(error) : resolve(result);
            });
        });
    }

    public static setKey(key, value, retry = 1, validated = 0) {
        return new Promise((resolve, reject) => {
            redisClient.hmset(key, { value, retry, validated }, (error, result) => {
                redisClient.expire(key, 60 * 10, (expiryError) => {
                    if (expiryError) {
                        logger.error(S, expiryError);
                    }
                });
                return error ? reject(error) : resolve(result);
            });
        });
    }

    public static async sendUniqueEmailVerificationCode(email) {
        const uniqueKey = AuthUtils.getKeyForUniqueVerificationCode(email);
        const existingUniqueCode: any = await AuthUtils.getKey(uniqueKey);
        if (existingUniqueCode) {
            if (existingUniqueCode && existingUniqueCode.retry <= 3) {
                await AuthUtils.setKey(uniqueKey, existingUniqueCode.value, existingUniqueCode.retry + 1);
                // send email
                return await AuthEvents.verificationCodeEmail({ email, verificationCode: existingUniqueCode.value });
            }
            throw new Error("Exceeded retry attempt. Please try again after 5 minutes");
        }
        const uniqueCode = AuthUtils.generateUniqueVerificationCode();
        await AuthUtils.setKey(uniqueKey, uniqueCode);
        await AuthEvents.verificationCodeEmail({ email, verificationCode: uniqueCode });
    }

    public static async validateUniqueEmailVerificationCode(email: string, verificationCode: string) {
        const uniqueKey = AuthUtils.getKeyForUniqueVerificationCode(email);
        const existingUniqueCode: any = await AuthUtils.getKey(uniqueKey);
        if (existingUniqueCode && existingUniqueCode.value === verificationCode) {
            await AuthUtils.setKey(uniqueKey, existingUniqueCode.value, existingUniqueCode.retry, 1);
            return {
                msg: "User verified."
            };
        } else {
            const error: any = new Error("That is not the verification code we sent.");
            error.status = 400;
            throw error;
        }
    }

    public static async isEmailVerified(email: string) {
        const uniqueKey = AuthUtils.getKeyForUniqueVerificationCode(email);
        const existingUniqueCode: any = await AuthUtils.getKey(uniqueKey);
        return existingUniqueCode && (existingUniqueCode.validated === "1" || existingUniqueCode.validated === 1);
    }
}
