"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function asyncMap(coll, mapper) {
    return Promise.all(coll.map(item => mapper(item)));
}
exports.asyncMap = asyncMap;
//# sourceMappingURL=lib.js.map