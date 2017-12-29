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
const chalk_1 = require("chalk");
const mongoose = require("mongoose");
const regexEscape = require("regex-escape");
const config = require("./config");
const model_1 = require("./model");
mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error
let conn = mongoose.connection;
conn.on("error", err => {
    console.error(chalk_1.default.bold("api: Failed to connect to database."));
    console.error(err);
});
conn.on("open", () => {
    console.info(chalk_1.default.greenBright.bold("api: Successfully connected to database."));
});
let schema = {
    person: new mongoose.Schema({
        name: { first: String, last: String },
        permissions: [{ type: String }]
    }),
    book: new mongoose.Schema({
        name: String,
        edition: [{ version: Number, publisher: String }],
        authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
        genre: [{ type: String }]
    })
};
let model = {
    person: mongoose.model("Person", schema.person),
    book: mongoose.model("Book", schema.book)
};
class Database {
    static findBooksByTitle(search, populateAuthors = true) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = model.book.find({ name: { $regex: `^${regexEscape(search)}`, $options: "i" } });
            if (populateAuthors)
                query = query.populate("authors");
            return yield query.exec();
        });
    }
    static getAuthorById(id) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    static getBooksByIsbn(isbn, populateAuthors = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const isbnStr = isbn instanceof model_1.Isbn ? isbn.toString(false) : isbn.replace("-", "");
            let query = model.book.find("isbn", isbnStr);
            if (populateAuthors)
                query = query.populate("authors");
            return yield query.exec();
        });
    }
}
exports.Database = Database;
//# sourceMappingURL=data.js.map