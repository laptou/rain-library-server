# Server 

This repository contains the code for the server of this application. It runs on [Node.js](http://nodejs.org/) and is written primarily in [Typescript](http://typescriptlang.org/). It provides a REST API to a [MongoDB](http://mongodb.com/) database, which is hosted separately on a dedicated computer for security.


## API Documentation

### Data Structures

There are 5 data structures defined in this project, corresponding to 5 tables in the database: `Person`, `Checkout`, `Hold`, `Fine`, and `Book`. Since Typescript interfaces look like schemas, they are included here unabridged. Self explanatory properties are not commented.

```typescript
interface Person {
    id: string;
    username: string | null;
    
    // a link to a relevant Wikipedia article about an author, for example
    wiki?: string;

    // a short description of a person
    bio?: string;

    // the user's display name
    name: { first: string; last: string };

    permissions: Permission[];

    // the maximum number of days that this person can check out a book
    // and the maximum number of books they can check out at the same time
    limits?: { days: number; books: number };
}

interface Book {
    id: string;
    name: string;

    // the id of the specific copy of the book that this represents
    copy?: string;

    edition: { version: number; publisher: string };
    authors: Person[] | string[];

    // all of the IDs of the copies of this book
    copies: string[];

    // the genres that this book belongs to
    genre: string[];

    // the average of user-assigned ratings of this book
    rating: number;

    isbn: string;
}

interface Checkout {
    id: string;
    start: Date | string;
    due: Date | string | null;

    // whether the book has been returned
    completed: boolean;

    // the fine multiplier in the event that the book is not returned on time
    penalty: number;

    // the book that is being checked out
    book: string | Book;

    // the person checking the book out
    person: string | Person;
}

interface Hold {
    id: string;
    date: Date | string;

    // has the user checked out or canceled?
    completed: boolean;

    // the ISBN of the book that this hold is placed on
    isbn: string;
    person: string | Person;

    // this property is not present in the database: it is calculated based on whether hold is ready for pickup
    ready: boolean;
}

interface Fine {
    id: string;
    date: Date | string;

    // has this fine been paid?
    completed: boolean;
    amount: number;
    book: string | Book;
    person: string | Person;
}
```

### REST API

Sequences prefixed with a colon such as `:id` represent a variable in the URI. The required permissions column indicates the permissions that the logged in user must have in order to make this request. A `+` indicates that the user must simply be logged in, but requires no other permissions.

#### Person

| Method   | URI                             | Type                                                    | Description                                                                                                                                                                              | Required Permissions |
| -------- | ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| GET      | `/person/:id`                   | `Person`                                                | Gets the person with the given ID.                                                                                                                                                       |
| POST     | `/person/:id`                   | `Person`                                                | Sets the properties of the person with the given ID, including their password.                                                                                                           | `modify_person`      |
| GET      | `/person/me/status/checkedout`  | `Checkout[]`                                            | Gets a list of checkouts currently held by the logged in user.                                                                                                                           | `+`                  |
| GET      | `/person/me/status/onhold`      | `Hold[]`                                                | Gets a list of holds currently held by the logged in user.                                                                                                                               | `+`                  |
| GET      | `/person/me/status/current`     | `(Fine | Hold | Checkout)[]`                            | Gets a list of holds, checkouts, and pending fines held by the logged in user.                                                                                                           | `+`                  |
| GET      | `/person/me/status/all`         | `(Fine | Hold | Checkout)[]`                            | Gets a list of all holds, checkouts, and fines that the logged in user has ever held.                                                                                                    | `+`                  |
| GET      | `/person/me/status/:isbn`       | `{ status: string; checkout?: Checkout; hold?: Hold };` | If the logged in user has checked this book out, then the `checkout` property is populated. If the logged in user has placed a hold on this book, then the `hold` property is populated. | `+`                  |
| GET      | `/person/:id/status/checkedout` | `Checkout[]`                                            | Gets a list of checkouts currently held by the user with this ID.                                                                                                                        | `modify_person`      |
| GET      | `/person/:id/status/onhold`     | `Hold[]`                                                | Gets a list of holds currently held by the user with this ID.                                                                                                                            | `modify_person`      |
| GET      | `/person/:id/status/current`    | `(Fine | Hold | Checkout)[]`                            | Gets a list of holds, checkouts, and pending fines held by the user with this ID.                                                                                                        | `modify_person`      |
| GET      | `/person/:id/status/all`        | `(Fine | Hold | Checkout)[]`                            | Gets a list of all holds, checkouts, and fines that the user with this ID has ever held.                                                                                                 | `modify_person`      |
| GET      | `/person/u/:username`           | `Person`                                                | Gets the person with the given username.                                                                                                                                                 |                      |
| GET      | `/person/search/:username`      | `Person[]`                                              | Searches all people by username and display name.                                                                                                                                        |                      |

#### Book

| Method   | URI                               | Type                                                  | Description                                             | Required Permissions |
| -------- | --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- | -------------------- |
| GET      | `/book/:isbn`                     | `Book`                                                | Gets the book with the given ISBN.                      |                      |
| POST     | `/book/:isbn`                     | `Book`                                                | Sets the properties of the book with the given ISBN.    | `modify_book`        |
| POST     | `/book/author/:id`                | `Book[]`                                              | Gets books authored by the person with id `:id`.        |                      |
| POST     | `/book/title/:name`               | `Book[]`                                              | Gets books titled `:name`.                              |                      |
| POST     | `/book/search/:query`             | `Book[]`                                              | Searches books.                                         |                      |
| POST     | `/book/search/title/:query`       | `Book[]`                                              | Searches books by title.                                |                      |
| GET      | `/book/all/checkedout?days=:days` | `Checkout[]`                                          | Gets checkouts in the last `:days` days.                | `check_out`          |
| GET      | `/book/all/fined?days=:days`      | `Fine[]`                                              | Gets fines in the last `:days` days.                    | `modify_fine`        |
| GET      | `/book/copy/:id`                  | `Book`                                                | Gets the book where one of the copies has the id `:id`. |                      |
| GET      | `/book/copy/:id/checkout`         | `Checkout`                                            | Gets the active checkout for the copy with id `:id`.    | `check_out`          |
| POST     | `/book/copy/:id/checkout`         | `{ user: string; length?: number; penalty?: number }` | Checks out the copy with id `:id`.                      | `check_out`          |
| POST     | `/book/copy/:id/checkin`          | HTTP 200                                              | Checks in the copy with id `:id`.                       | `check_out`          |

#### Hold

| Method   | URI                        | Type     | Description                                                                     | Required Permissions |
| -------- | -------------------------- | -------- | ------------------------------------------------------------------------------- | -------------------- |
| GET      | `/hold/me`                 | `Hold[]` | Gets all current and past holds for the logged in user.                         | `+`                  |
| GET      | `/hold/me/pending`         | `Hold[]` | Gets pending holds for the logged in user.                                      | `+`                  |
| GET      | `/hold/me/:isbn`           | `Hold[]` | Gets pending holds for the logged in user placed on the book with ISBN `:isbn`. | `+`                  |
| DELETE   | `/hold/me/:isbn`           | HTTP 200 | Deletes the current user's active hold on the book with ISBN `:isbn`.           | `+`                  |
| GET      | `/hold/person/:id`         | `Hold[]` | Gets all current and past holds for the user with id `:id`.                     | `modify_hold`        |
| GET      | `/hold/person/:id/pending` | `Hold[]` | Gets all pending holds for the user with id `:id`.                              | `modify_hold`        |
| GET      | `/hold/:id`                | `Hold`   | Gets the hold with id `:id`.                                                    | `place_hold`         |
| POST     | `/hold/:id`                | `Hold`   | Updates or creates a hold with id `:id`.                                        | `modify_hold`        |
| DELETE   | `/hold/:id`                | `Hold`   | Deletes the hold with id `:id`.                                                 | `modify_hold`        |
| GET      | `/hold/book/:isbn`         | `Hold[]` | Gets pending holds for the book with ISBN `:isbn`.                              | `modify_hold`        |
| GET      | `/hold/book/:isbn/all`     | `Hold[]` | Gets all current and past holds for the book with ISBN `:isbn`.                 | `modify_hold`        |
| GET      | `/hold/book/:isbn/count`   | `Hold[]` | Gets the number of pending holds for the book with ISBN `:isbn`.                | `place_hold`         |

