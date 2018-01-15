"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Linq {
    constructor(enumerable, transform) {
        this.source = enumerable;
        this.transform = transform;
    }
    static array(arr) {
        return new Linq(arr, t => t);
    }
    *[Symbol.iterator]() {
        for (let u of this.transform(this.source))
            yield u;
    }
    distinct(key = item => item) {
        return new Linq(this, function* (iterable) {
            const set = new Set();
            for (let item of iterable) {
                const itemKey = key(item);
                if (set.has(itemKey))
                    continue;
                set.add(itemKey);
                yield item;
            }
            set.clear();
        });
    }
    select(selector) {
        return new Linq(this, function* (iterable) {
            for (let item of iterable) {
                yield selector(item);
            }
        });
    }
    selectMany(selector) {
        return new Linq(this, function* (iterable) {
            for (let coll of iterable) {
                for (let item of selector(coll)) {
                    yield item;
                }
            }
        });
    }
    slice(start, end) {
        return new Linq(this, function* (iterable) {
            if (end <= start || end === 0)
                return;
            let index = 0;
            for (let item of iterable) {
                if (index < start)
                    continue;
                if (end && end <= index)
                    break;
                yield item;
                index++;
            }
        });
    }
    toArray() {
        return [...this];
    }
    where(predicate) {
        return new Linq(this, function* (iterable) {
            for (let item of iterable) {
                if (predicate(item))
                    yield item;
            }
        });
    }
}
exports.Linq = Linq;
//# sourceMappingURL=linq.js.map