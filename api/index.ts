import * as Router from "koa-router";
import { BookRouter } from "./book";
import { PersonRouter } from "./person";

export const ApiRouter = new Router();

ApiRouter.use("/book", BookRouter.routes());
ApiRouter.use("/person", PersonRouter.routes());