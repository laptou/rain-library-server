import * as Router from "koa-router";
import { Logger, LogSource } from "../util";
import { BookRouter } from "./book";
import { HoldRouter } from "./hold";
import { PersonRouter } from "./person";

export const ApiRouter = new Router();
const logger = new Logger(LogSource.Api);

ApiRouter.use(async (ctx, next) =>
              {
                  try
                  {
                      await next();
                  }
                  catch (err)
                  {
                      ctx.status = 500;
                      logger.error(err);
                  }
              });
ApiRouter.use("/book", BookRouter.routes());
ApiRouter.use("/person", PersonRouter.routes());
ApiRouter.use("/hold", HoldRouter.routes());
