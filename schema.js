db = db.getSiblingDB("library");
db.createCollection("checkouts");
db.createCollection("holds");
db.createCollection("people");
db.createCollection("books");

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
                required: ["start", "penalty_factor", "book", "person", "due"],
                properties: {
                    start: { bsonType: "date" },
                    due: { bsonType: "date" },
                    end: { bsonType: "date" },
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
                    rating: { bsonType: "double" },
                    ratingCount: { bsonType: "int" }
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
                    password: {
                        bsonType: "string"
                    },
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
                    }
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

printjson(db.holds.createIndex({ "book": 1, "person": 1 }, { name: "Main" }));
printjson(db.checkouts.createIndex({ "book": 1 }, { name: "Book" }));
printjson(db.checkouts.createIndex({ "start": 1, "due": 1, "end": 1 }, { name: "Date" }));
printjson(db.checkouts.createIndex({ "person": 1 }, { name: "Person" }));

printjson(db.people.update({ _id: ObjectId("5a400a88da662e0ec88f88f3") },
                           {
                               name: { first: "Alexandre", last: "Dumas" },
                               permissions: ["author"]
                           },
                           { upsert: true }));

printjson(db.books.update({ "_id": ObjectId("5a400cf0da662e0ec88f88f4") },
                          {
                              name: "The Count of Monte Cristo",
                              editions: [{ "publisher": "Heehee Publishing", "version": NumberInt(3) }],
                              authors: [ObjectId("5a400a88da662e0ec88f88f3")],
                              genre: ["mystery", "egg"],
                              year: NumberInt(1845),
                              isbn: "9780553213508"
                          },
                          { upsert: true }));
print("done");