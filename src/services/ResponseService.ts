import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator/check";

import logger from "./LoggerService";

const S = "[ResponseService]";

export default class ResponseService {

    public static success(res: Response, data = null, message = null, status = 200) {
        return res.status(200).json({ error: false, message, status, data });
    }

    public static error(res: Response, message = null, status = 200) {
        return res.status(status).json({ error: true, message, status });
    }

    public static Forbidden(res: Response, message = "Forbidden access") {
        return res.status(403).json({
            error: true,
            message
        });
    }

    public static unauthorizedError(res: Response, message = "Unauthorized.") {
        return res.status(401).json({ error: true, status: 401, message });
    }

    public static notFoundError(res: Response, message = "Entity not found") {
        return res.status(404).json({ error: true, status: 404, message });
    }

    public static validationError(res: Response,
                                  errors: Array<{ path?: string; message?: string, param?: string; msg?: string, }>) {
        for (const error of errors || []) {
            error.path = error.path || error.param;
            error.message = error.message || error.msg;
            delete error.param;
            delete error.msg;
        }
        return res.status(422).json({ error: true, status: 422, message: "Validation Failed", errors });
    }

    public static serverError(
        req: Request,
        res: Response,
        e: any,
        message: string = "Unexpected Error Occurred.",
    ) {
        const M = `${S}[serverError][${req.request_id || ""}]`;
        const { user, company } = req;
        const companyId = company && company._id ? company._id : null;
        const userId = user && user._id ? user._id : null;
        logger.error(M, `company_id=${companyId} user_id=${userId}`, e, message);
        if (process.env.TYPE === "development" || process.env.NODE_ENV === "development") {
            message += " - " + e.message;
        }
        return res.status(500).json({ error: true, status: 500, message });
    }

    public static checkValidationErrors(req: Request, res: Response, next: NextFunction) {
        const M = `${S}[checkValidationErrors][${req.request_id || ""}]`;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const { user, company } = req;
            const companyId = company && company._id ? company._id : null;
            const userId = user && user._id ? user._id : null;
            logger.error(M, `${req.method}:${req.path} company_id=${companyId} user_id=${userId}`, errors.array());
            return ResponseService.validationError(res, errors.array());
        }
        return next();
    }
}
