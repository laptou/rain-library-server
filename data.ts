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
        }),
    Checkout: new mongoose.Schema(
        {
            start: Date,
            end: Date,
            penalty_factor: Number,
            book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
        }),
    Hold: new mongoose.Schema(
        {
            date: Date,
            completed: Boolean,
            book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
            person: { type: mongoose.Schema.Types.ObjectId, ref: "Person" }
        })
};

schema.Person.set("toJSON", { virtuals: true });
schema.Book.set("toJSON", { virtuals: true });
schema.Checkout.set("toJSON", { virtuals: true });
schema.Hold.set("toJSON", { virtuals: true });

let Model = {
    Person: mongoose.model<Person>("Person", schema.Person),
    Book: mongoose.model<Book>("Book", schema.Book),
    Hold: mongoose.model<Hold>("Hold", schema.Hold),
    Checkout: mongoose.model<Checkout>("Checkout", schema.Checkout)
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

export interface Checkout extends mongoose.Document
{
    start: Date;
    end: Date | null;
    penalty_factor: number;
    book: string | Book;
    person: string | Person;
}

export interface Hold extends mongoose.Document
{
    date: Date;
    completed: boolean;
    book: string | Book;
    person: string | Person;
}

export class Database
{
    static Model = Model;
    
    static async addPerson (person: Person)
    {
        await new Model.Book(person).save();
    }
    
    static async getBookById (id: string, populate: boolean = true): Promise<Book>
    {
        let query = Model.Book.findById(id);
    
        return await query.exec();
    }
    
    static async getBooksByIsbn (isbn: string, populate: boolean = true): Promise<Book[]>
    {
        let query = Model.Book.find({ isbn });
        
        if (populate)
            query = query.populate("authors");
        
        return <Book[]>await query.exec();
    }
    
    static async getBooksByTitle (title: string, populate: boolean = true): Promise<Book[]>
    {
        let query = Model.Book.find({ name: title }).collation({ locale: "en", strength: 1 });
        
        if (populate)
            query = query.populate("authors");
    
        return await query.exec();
    }
    
    static async getCheckedOut (userId: string): Promise<Checkout[]>
    {
        return await Model.Checkout
                          .find({
                                    person: userId,
                                    $or: [{ end: { $gte: new Date() } }, { end: null }]
                                })
                          .populate({
                                        path: "book",
                                        populate: { path: "authors" }
                                    });
    }
    
    static async getPersonById (id: string): Promise<Person>
    {
        let query = Model.Person.findById(id);
        
        return await query.exec();
    }
    
    static async getPersonByUsername (name: string): Promise<Person>
    {
        let query = Model.Person.findOne({ "username": name }, null,
                                         { collation: { locale: "en", strength: 1 } });
    
        return await query.exec();
    }
    
    static async searchBooks (search: string, populate: boolean = true, limit?: number): Promise<Book[]>
    {
        let query = Model.Book.find({ $text: { $search: search } });
    
        if (limit)
            query = query.limit(limit);
        
        if (populate)
            query = query.populate("authors");
    
        return await query.exec();
    }
    
    static async searchBooksByTitle (search: string, populate: boolean = true, limit?: number): Promise<Book[]>
    {
        let query = Model.Book.find({ name: { $regex: `^${search}`, $options: "i" } });
    
        if (limit)
            query = query.limit(limit);
        
        if (populate)
            query = query.populate("authors");
    
    
        return await query.exec();
    }
    
    static async getBooksByAuthor (person: string | Person, populate = true, limit?: number)
    {
        if (typeof person === "string")
        {
            let query = Model.Book.find({ authors: person });
            
            if (limit)
                query = query.limit(limit);
            
            if (populate)
                query = query.populate("authors");
            
            return await query;
        }
        else
        {
            let query = Model.Book.find({ authors: person.id });
            
            if (limit)
                query = query.limit(limit);
            
            if (populate)
                query = query.populate("authors");
            
            return await query;
        }
    }
}
