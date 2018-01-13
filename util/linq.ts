export class Linq<T, U> implements Iterable<U>
{
    private source: Iterable<T>;
    private transform: Transform<T, U>;
    
    constructor (enumerable: Iterable<T>, transform: Transform<T, U>)
    {
        this.source = enumerable;
        this.transform = transform;
    }
    
    static array<T> (arr: T[]): Linq<T, T>
    {
        return new Linq<T, T>(arr, t => t);
    }
    
    public * [Symbol.iterator] (): Iterator<U>
    {
        for (let u of this.transform(this.source))
            yield u;
    }
    
    public distinct (key: (item: U) => any = item => item): Linq<U, U>
    {
        return new Linq<U, U>(this, function * (iterable)
        {
            const set = new Set();
            
            for (let item of iterable)
            {
                const itemKey = key(item);
                
                if (set.has(itemKey)) continue;
                
                set.add(itemKey);
                
                yield item;
            }
            
            set.clear();
        });
    }
    
    public select<V> (selector: (item: U) => V): Linq<U, V>
    {
        return new Linq<U, V>(this, function * (iterable)
        {
            for (let item of iterable)
            {
                yield selector(item);
            }
        });
    }
    
    public selectMany<V> (selector: (item: U) => Iterable<V>): Linq<U, V>
    {
        return new Linq<U, V>(this, function * (iterable)
        {
            for (let coll of iterable)
            {
                for (let item of selector(coll))
                {
                    yield item;
                }
            }
        });
    }
    
    public slice (start: number, end?: number): Linq<U, U>
    {
        return new Linq<U, U>(this, function * (iterable)
        {
            if (end <= start || end === 0) return;
            
            let index = 0;
            for (let item of iterable)
            {
                if (index < start) continue;
                if (end && end <= index) break;
                yield item;
                index++;
            }
        });
    }
    
    public toArray (): U[]
    {
        return [...this];
    }
    
    public where (predicate: (item: U) => boolean): Linq<U, U>
    {
        return new Linq<U, U>(this, function * (iterable)
        {
            for (let item of iterable)
            {
                if (predicate(item)) yield item;
            }
        });
    }
}

type Transform<T, U> = (iterable: Iterable<T>) => Iterable<U>;

