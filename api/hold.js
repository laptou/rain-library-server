"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const auth_1 = require("../auth");
const data_1 = require("../data");
const util_1 = require("../util");
const logger = new util_1.Logger(util_1.LogSource.Api);
exports.HoldRouter = new Router();
exports.HoldRouter.get("/book/:isbn/count", auth_1.AuthWall(), async (ctx) => {
    ctx.body = (await data_1.Database.getHoldsForBook(ctx.params.isbn)).length;
});
exports.HoldRouter.get("/book/:isbn", auth_1.AuthWall("modify_hold"), async (ctx) => {
    ctx.body = await data_1.Database.getHoldsForBook(ctx.params.isbn);
});
exports.HoldRouter.get("/person/:id", auth_1.AuthWall("modify_hold"), async (ctx) => {
    ctx.body = await data_1.Database.getHoldsForPerson(ctx.params.id);
});
exports.HoldRouter.get("/me", auth_1.AuthWall("place_hold"), async (ctx) => {
    ctx.body = await data_1.Database.getHoldsForPerson(ctx.state.user);
});
//# sourceMappingURL=hold.js.map