"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const util_1 = require("../util");
const book_1 = require("./book");
const hold_1 = require("./hold");
const person_1 = require("./person");
exports.ApiRouter = new Router();
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.ApiRouter.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (err) {
        ctx.status = 500;
        logger.error(err);
    }
});
exports.ApiRouter.use("/book", book_1.BookRouter.routes());
exports.ApiRouter.use("/person", person_1.PersonRouter.routes());
exports.ApiRouter.use("/hold", hold_1.HoldRouter.routes());
//# sourceMappingURL=index.js.map