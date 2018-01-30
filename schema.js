db = db.getSiblingDB("library");
db.createCollection("checkouts");
db.createCollection("holds");
db.createCollection("people");
db.createCollection("books");
db.createCollection("fines");

printjson(db.runCommand(
    {
        "collMod": "fines",
        "validator": {
            "$jsonSchema": {
                bsonType: "object",
                required: ["date", "book", "person", "completed", "amount"],
                properties: {
                    date: { bsonType: "date" },
                    book: { bsonType: "objectId" },
                    person: { bsonType: "objectId" },
                    completed: { bsonType: "bool" },
                    amount: { bsonType: "decimal" }
                }
            }
        }
    }));

printjson(db.runCommand(
    {
        "collMod": "holds",
        "validator": {
            "$jsonSchema": {
                bsonType: "object",
                required: ["date", "isbn", "person", "completed"],
                properties: {
                    date: { bsonType: "date" },
                    isbn: { bsonType: "string" },
                    person: { bsonType: "objectId" },
                    completed: { bsonType: "bool" }
                }
            }
        }
    }));

printjson(db.runCommand(
    {
        "collMod": "checkouts",
        "validator": {
            "$jsonSchema": {
                bsonType: "object",
                required: ["start", "penalty_factor", "book", "person", "due", "completed"],
                properties: {
                    start: { bsonType: "date" },
                    due: { bsonType: "date" },
                    end: { bsonType: "date" },
                    completed: { bsonType: "bool" },
                    penalty_factor: { bsonType: "double" },
                    book: { bsonType: "objectId" },
                    person: { bsonType: "objectId" }
                }
            }
        }
    }));

printjson(db.runCommand(
    {
        "collMod": "books",
        "validator": {
            "$jsonSchema": {
                bsonType: "object",
                required: ["isbn", "name", "authors", "year", "genre"],
                properties: {
                    name: { bsonType: "string" },
                    isbn: { bsonType: "string", pattern: "^[0-9]{13}$" },
                    year: { bsonType: "int" },
                    genre: {
                        bsonType: "array",
                        items: {
                            bsonType: "string",
                            enum: ["mystery",
                                "horror",
                                "egg",
                                "history",
                                "adventure",
                                "romance",
                                "young-adult",
                                "thriller",
                                "action",
                                "adult",
                                "child",
                                "erotica",
                                "test"],
                        },
                        uniqueItems: true,
                        minItems: 1
                    },
                    authors: { bsonType: "array", items: { bsonType: "objectId" }, uniqueItems: true, minItems: 1 },
                    edition: {
                        bsonType: "object",
                        required: ["version", "publisher"],
                        properties: {
                            version: { bsonType: "int" },
                            publisher: { bsonType: "string" }
                        }
                    },
                    copies: { bsonType: "array", items: { bsonType: "objectId" }, uniqueItems: true, minItems: 1 },
                    versions: { bsonType: "array", items: { bsonType: "string", pattern: "^[0-9]{13}$" }, uniqueItems: true },
                    rating: { bsonType: "double" },
                    ratingCount: { bsonType: "int" },
                    location: {
                        bsonType: "object",
                        properties: {
                            site: { bsonType: "string" },
                            section: { bsonType: "string" },
                            shelf: { bsonType: "string" }
                        }
                    }
                }
            }
        }
    }));

printjson(db.runCommand(
    {
        "collMod": "people",
        "validator": {
            "$jsonSchema": {
                bsonType: "object",
                required: ["name", "permissions"],
                properties: {
                    username: { bsonType: "string" },
                    name: {
                        bsonType: "object",
                        required: ["first", "last"],
                        properties: {
                            first: { bsonType: "string" },
                            last: { bsonType: "string" }
                        }
                    },
                    password: { bsonType: "string" },
                    permissions: {
                        bsonType: "array",
                        items: {
                            bsonType: "string",
                            enum: ["check_out",
                                "place_hold",
                                "modify_hold",
                                "modify_book",
                                "modify_fine",
                                "modify_person",
                                "admin",
                                "author",
                                "user",
                                "test"]
                        },
                        uniqueItems: true
                    },
                    bio: { bsonType: "string" },
                    wiki: { bsonType: "string", pattern: "^(https?:\/\/)?([A-Za-z]{2}|simple).wikipedia.org\/wiki\/[^#<>{}\[\]\|]+$" }
                }
            }
        }
    }));

printjson(db.people.createIndex({ "username": 1 },
    {
        unique: true,
        partialFilterExpression: { username: { $exists: true } },
        name: "Username",
        collation: { locale: "en", strength: 1 }
    }));

printjson(db.people.createIndex({ "name.first": 1, "name.last": 1 },
    { name: "Full Name", collation: { locale: "en", strength: 1 } }));

printjson(db.books.createIndex({ "name": 1 }, { name: "Name (Collated)", collation: { locale: "en", strength: 1 } }));
printjson(db.books.createIndex({ "name": "text" }, { name: "Name (FTS)" }));
printjson(db.books.createIndex({ "isbn": 1 }, { name: "ISBN", unique: true }));
printjson(db.books.createIndex({ "copies": 1 }, { name: "IDs", unique: true }));

printjson(db.holds.createIndex({ "isbn": 1 }, { name: "ISBN" }));
printjson(db.holds.createIndex({ "person": 1 }, { name: "Person" }));

printjson(db.fines.createIndex({ "book": 1, "person": 1, "amount": 1 }, { name: "Book-Person-Amount" }));

printjson(db.checkouts.createIndex({ "book": 1 }, { name: "Book" }));
printjson(db.checkouts.createIndex({ "start": 1, "due": 1 }, { name: "Date" }));
printjson(db.checkouts.createIndex({ "person": 1 }, { name: "Person" }));

printjson(db.people.update({ _id: ObjectId("5a400a88da662e0ec88f88f3") },
    {
        name: { first: "Alexandre", last: "Dumas" },
        permissions: ["author"]
    },
    { upsert: true }));

printjson(db.people.update({ _id: ObjectId("5a5624d00408d33ed0c28ce4") },
    {
        "password": "$2a$12$pRcEPIMwrwj9D81xSvU.vO98GLOy607GIFdmJvaeXAO03OviEkRcu",
        "username": "rEeraa",
        "permissions": ["user", "place_hold", "admin"],
        "name": { "first": "ree", "last": "raa" }
    },
    { upsert: true }));

printjson(db.books.update({ "_id": ObjectId("5a400cf0da662e0ec88f88f4") },
    {
        name: "The Count of Monte Cristo",
        editions: [{ "publisher": "Heehee Publishing", "version": NumberInt(3) }],
        authors: [ObjectId("5a400a88da662e0ec88f88f3")],
        genre: ["mystery", "egg"],
        copies: [ ObjectId("5a5d01168a45aa1d1688609b") ],
        year: NumberInt(1845),
        isbn: "9780553213508"
    },
    { upsert: true }));


printjson(db.checkouts.update({ "_id": ObjectId("5a5d01168a45aa1d1688609c") },
    {
        "start": ISODate("2018-01-11T00:00:00Z"),
        "penalty_factor": 4,
        completed: false,
        "due": ISODate("2018-02-11T22:05:00Z"),
        "book": ObjectId("5a400cf0da662e0ec88f88f4"),
        "person": ObjectId("5a598571f206d2259c0edb7a")
    }, { upsert: true }));

printjson(db.holds.update({ "_id": ObjectId("5a5d01168a45ba1d1688609d") },
    {
        "date": ISODate("2018-01-11T00:00:00Z"),
        "completed": false,
        "isbn": "9780553213508",
        "person": ObjectId("5a598571f206d2259c0edb7a")
    }, { upsert: true }));

print("done");