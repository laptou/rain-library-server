import { Isbn } from "./model";
export declare class Database {
    static getBooksByIsbn(isbn: Isbn, populateAuthors?: boolean): Promise<any>;
}
