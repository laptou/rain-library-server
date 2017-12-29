import chalk from "chalk";
import * as mongoose from "mongoose";
import * as regexEscape from "regex-escape";
import * as config from "./config";
import { Isbn, Uuid } from "./model";

mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error

let conn = mongoose.connection;

conn.on("error", err =>
{
    console.error(chalk.bold("api: Failed to connect to database."));
    console.error(err);
});

conn.on("open", () =>
{
    console.info(chalk.greenBright.bold("api: Successfully connected to database."));
});

let schema = {
    person: new mongoose.Schema(
        {
            name: { first: String, last: String },
            permissions: [{ type: String }]
        }),
    book: new mongoose.Schema(
        {
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

export class Database
{
    static async findBooksByTitle (search: string, populateAuthors: boolean = true)
    {
        let query = model.book.find({ name: { $regex: `^${regexEscape(search)}`, $options: "i" } });
        
        if (populateAuthors)
            query = query.populate("authors");
        
        return await query.exec();
    }
    
    static async getAuthorById (id: string | Uuid)
    {
    
    }
    
    static async getBooksByIsbn (isbn: Isbn | string, populateAuthors: boolean = true)
    {
        const isbnStr = isbn instanceof Isbn ? isbn.toString(false) : isbn.replace("-", "");
        
        let query = model.book.find("isbn", isbnStr);
        
        if (populateAuthors)
            query = query.populate("authors");
        
        return await query.exec();
    }
}