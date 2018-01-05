"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const regexEscape = require("regex-escape");
const config = require("./config");
const model_1 = require("./model");
const util_1 = require("./util");
mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error
const dev = process.env.NODE_ENV === "development";
let conn = mongoose.connection;
let dbLogger = new util_1.Logger(util_1.LogSource.Database);
conn.on("error", err => {
    dbLogger.err("Failed to connect to database.");
    dbLogger.err(err);
});
conn.on("open", () => {
    dbLogger.info("Successfully connected to database.");
});
let schema = {
    Person: new mongoose.Schema({
        name: { first: String, last: String, full: String },
        permissions: [{ type: String }],
        password: String
    }),
    Book: new mongoose.Schema({
        name: String,
        edition: [{ version: Number, publisher: String }],
        authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
        genre: [{ type: String }]
    })
};
let Model = {
    Person: mongoose.model("Person", schema.Person),
    Book: mongoose.model("Book", schema.Book)
};
class Database {
    static async addPerson(person) {
        await new Model.Book(person).save();
    }
    static async findBooksByTitle(search, populate = true) {
        let query = Model.Book.find({ name: { $regex: `^${regexEscape(search)}`, $options: "i" } });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getBooksByIsbn(isbn, populate = true) {
        const isbnStr = isbn instanceof model_1.Isbn ? isbn.toString(false) : isbn.replace("-", "");
        let query = Model.Book.find("isbn", isbnStr);
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getPersonById(id) {
        let query = Model.Book.findById(id);
        return await query.exec();
    }
    static async getPersonByUsername(name) {
        let query = Model.Person.findOne({ "name.full": name });
        return await query.exec();
    }
}
Database.Model = Model;
exports.Database = Database;
//# sourceMappingURL=data.js.map