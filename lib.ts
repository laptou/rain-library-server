import { AsyncFunction } from "async";

export function asyncMap<T, U> (coll: T[], mapper: (item: T) => Promise<U>)
{
    return Promise.all(coll.map(item => mapper(item)));
}