import * as mongoose from "mongoose";
import * as regexEscape from "regex-escape";
import * as config from "./config";
import { Isbn } from "./model";
import { Logger, LogSource } from "./util";

mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error

const dev = process.env.NODE_ENV === "development";

let conn = mongoose.connection;

let dbLogger = new Logger(LogSource.Database);

conn.on("error", err =>
{
    dbLogger.err("Failed to connect to database.");
    dbLogger.err(err);
});

conn.on("open", () =>
{
    dbLogger.info("Successfully connected to database.");
});

let schema = {
    Person: new mongoose.Schema(
        {
            name: { first: String, last: String, full: String },
            permissions: [{ type: String }],
            password: { hash: String, salt: String }
        }),
    Book: new mongoose.Schema(
        {
            name: String,
            edition: [{ version: Number, publisher: String }],
            authors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Person" }],
            genre: [{ type: String }]
        })
};

let Model: { Person: mongoose.Model<Person>; Book: mongoose.Model<mongoose.Document> } = {
    Person: mongoose.model<Person>("Person", schema.Person),
    Book: mongoose.model("Book", schema.Book)
};

export declare interface Person extends mongoose.Document
{
    name: { first: string, last: string, full: string };
    permissions: string[];
    password: { hash: string, salt: string };
}

export class Database
{
    static Model = Model;
    
    static async addPerson (person: Person)
    {
        await new Model.Book(person).save();
    }
    
    static async findBooksByTitle (search: string, populate: boolean = true)
    {
        let query = Model.Book.find({ name: { $regex: `^${regexEscape(search)}`, $options: "i" } });
        
        if (populate)
            query = query.populate("authors");
        
        return await query.exec();
    }
    
    static async getBooksByIsbn (isbn: Isbn | string, populate: boolean = true)
    {
        const isbnStr = isbn instanceof Isbn ? isbn.toString(false) : isbn.replace("-", "");
    
        let query = Model.Book.find("isbn", isbnStr);
    
        if (populate)
            query = query.populate("authors");
    
        return await query.exec();
    }
    
    static async getPersonById (id: string)
    {
        let query = Model.Book.findById(id);
        
        return await query.exec();
    }
    
    static async getPersonByUsername (name: string)
    {
        let query = Model.Person.find({ "name.full": name });
        
        return await query.exec();
    }
}
