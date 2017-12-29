"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const data_1 = require("./data");
const Model = require("./model");
let router = new Router();
let bookRouter = new Router();
bookRouter.get("/isbn::isbn", (ctx) => __awaiter(this, void 0, void 0, function* () {
    try {
        let isbn = Model.Isbn.parse(ctx.params.isbn);
        ctx.response.body = yield data_1.Database.getBooksByIsbn(isbn);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
}));
bookRouter.get("/id::id", (ctx) => __awaiter(this, void 0, void 0, function* () {
    try {
        let id = Model.Uuid.parse(ctx.params.id);
        ctx.response.body = yield data_1.Database.getBookById(id);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
}));
bookRouter.get("/find/title::name", (ctx) => __awaiter(this, void 0, void 0, function* () {
    try {
        ctx.response.body = yield data_1.Database.findBooksByTitle(ctx.params.name);
    }
    catch (err) {
        ctx.response.status = 500;
        ctx.response.body = err.message;
        console.error(err);
    }
}));
let personRouter = new Router();
personRouter.get("/id::id", (ctx) => __awaiter(this, void 0, void 0, function* () {
    try {
        let id = Model.Uuid.parse(ctx.params.id);
        ctx.response.body = yield data_1.Database.getPerson(id);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
}));
personRouter.get("/search/:name", (ctx) => __awaiter(this, void 0, void 0, function* () {
    try {
        ctx.response.body = yield data_1.Database.searchPeople(ctx.params.name);
    }
    catch (err) {
        ctx.response.status = 403;
        ctx.response.body = err.message;
    }
}));
router.use("/book", bookRouter.routes());
router.use("/person", personRouter.routes());
router.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
    console.log("api: %s - %s %s", new Date().toISOString(), ctx.req.method, ctx.req.url);
    yield next();
}));
module.exports = router;
//# sourceMappingURL=api.js.map