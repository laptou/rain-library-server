import * as mongoose from "mongoose";
import * as config from "./config";
import { Logger, LogSource } from "./util";

mongoose.connect(config.db, { useMongoClient: true });
require("mongoose").Promise = Promise; // use require() to get rid of TS error

const dev = process.env.NODE_ENV === "development";

let conn = mongoose.connection;

let dbLogger = new Logger(LogSource.Database);

conn.on("error", err =>
{
    dbLogger.error("Failed to connect to database.");
    dbLogger.error(err);
});

conn.on("open", () =>
{
    dbLogger.info("Successfully connected to database.");
});

let schema = {
    Person: new mongoose.Schema(
        {
            username: String,
            name: { first: String, last: String },
            permissions: [{ type: String }],
            password: String
        }),
    Book: new mongoose.Schema(
        {
            name: String,
            editions: [{ version: Number, publisher: String }],
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
    username: string | null;
    name: { first: string, last: string };
    permissions: string[];
    password: string;
}

export declare interface Book extends mongoose.Document
{
    name: string;
    edition: { version: number, publisher: string } [];
    authors: Person[] | string[];
    genre: string[];
}

export class Database
{
    static Model = Model;
    
    static async addPerson (person: Person)
    {
        await new Model.Book(person).save();
    }
    
    static async getBookById (id: string, populate: boolean = true)
    {
        let query = Model.Book.findById(id);
    
        return await query.exec();
    }
    
    static async getBooksByIsbn (isbn: string, populate: boolean = true)
    {
        let query = Model.Book.find("isbn", isbn);
        
        if (populate)
            query = query.populate("authors");
        
        return <Book[]>await query.exec();
    }
    
    static async getBooksByTitle (title: string, populate: boolean = true)
    {
        let query = Model.Book.find({ name: title }).collation({ locale: "en", strength: 1 });
        
        if (populate)
            query = query.populate("authors");
    
        return await query.exec();
    }
    
    static async getPersonById (id: string)
    {
        let query = Model.Person.findById(id);
        
        return await query.exec();
    }
    
    static async getPersonByUsername (name: string)
    {
        let query = Model.Person.findOne({ "username": name }, null,
                                         { collation: { locale: "en", strength: 1 } });
    
        return await query.exec();
    }
    
    static async searchBooks (search: string, populate: boolean = true)
    {
        let query = Model.Book.find({ $text: { $search: search } });
        
        if (populate)
            query = query.populate("authors");
        
        return await query.exec();
    }
    
    static async searchBooksByTitle (search: string, populate: boolean = true)
    {
        let query = Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } });
        
        if (populate)
            query = query.populate("authors");
        
        return await query.exec();
    }
}
