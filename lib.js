"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function asyncMap(coll, mapper) {
    return Promise.all(coll.map(item => mapper(item)));
}
exports.asyncMap = asyncMap;
function asyncify(args, func) {
    return new Promise((resolve, reject) => {
        func.call(null, ...args, (error, result) => {
            if (error)
                reject(error);
            else
                resolve(result);
        });
    });
}
exports.asyncify = asyncify;
//# sourceMappingURL=lib.js.map