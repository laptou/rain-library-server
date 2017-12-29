export function asyncMap<T, U> (coll: T[], mapper: (item: T) => Promise<U>)
{
    return Promise.all(coll.map(item => mapper(item)));
}

export function asyncify<U> (args: any, func: (args, callback: (error, result) => void) => void): Promise<U>
{
    return new Promise((resolve, reject) =>
                       {
                           func.call(null, ... args, (error, result) =>
                           {
                               if (error) reject(error);
                               else resolve(result);
                           });
                       });
}