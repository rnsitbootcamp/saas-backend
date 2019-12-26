import { NextFunction, Request, Response } from "express";

export default function(req: Request, res: Response, next: NextFunction) {
    // Query (GET||POST)
    req.query.page = Number(req.query.page) || 1;
    req.query.per_page = Number(req.query.per_page) || 20;
    // Body (POST)
    req.body.page = Number(req.body.page) || 1;
    req.body.per_page = Number(req.body.per_page) || 20;
    next();
}
