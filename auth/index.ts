import * as Router from "koa-router";

export const AuthRouter = new Router();
AuthRouter.post("/register", ctx =>
{
    ctx.body;
});