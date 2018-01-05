import * as Router from "koa-router";
import { BookRouter } from "./book";
import { PersonRouter } from "./person";

export const ApiRouter = new Router();

ApiRouter.use("/Book", BookRouter.routes());
ApiRouter.use("/Person", PersonRouter.routes());