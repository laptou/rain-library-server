"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const config = require("./config");
const util_1 = require("./util");
mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error
const dev = process.env.NODE_ENV === "development";
let conn = mongoose.connection;
let dbLogger = new util_1.Logger(util_1.LogSource.Database);
conn.on("error", err => {
    dbLogger.error("Failed to connect to database.");
    dbLogger.error(err);
});
conn.on("open", () => {
    dbLogger.info("Successfully connected to database.");
});
let schema = {
    Person: new mongoose.Schema({
        username: String,
        name: { first: String, last: String },
        permissions: [{ type: String }],
        password: String
    }),
    Book: new mongoose.Schema({
        name: String,
        editions: [{ version: Number, publisher: String }],
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
    static async getBookById(id, populate = true) {
        let query = Model.Book.findById(id);
        return await query.exec();
    }
    static async getBooksByIsbn(isbn, populate = true) {
        let query = Model.Book.find("isbn", isbn);
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getBooksByTitle(title, populate = true) {
        let query = Model.Book.find({ name: title }).collation({ locale: "en", strength: 1 });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async getPersonById(id) {
        let query = Model.Person.findById(id);
        return await query.exec();
    }
    static async getPersonByUsername(name) {
        let query = Model.Person.findOne({ "username": name }, null, { collation: { locale: "en", strength: 1 } });
        return await query.exec();
    }
    static async searchBooks(search, populate = true) {
        let query = Model.Book.find({ $text: { $search: search } });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
    static async searchBooksByTitle(search, populate = true) {
        let query = Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } });
        if (populate)
            query = query.populate("authors");
        return await query.exec();
    }
}
Database.Model = Model;
exports.Database = Database;
//# sourceMappingURL=data.js.map