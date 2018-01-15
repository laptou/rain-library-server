(function()
{
    printjson(db.books.remove(
    {
        genre: "test"
    }));
    printjson(db.people.remove(
    {
        permissions: "test"
    }));

    function random(max, num)
    {
        if (num === undefined || num === 1) return Math.floor(Math.random() * Math.floor(max));
        numbers = [];
        do {
            for (var i = 0; i < num; i++)
            {
                numbers[i] = random(max);
            }
        } while (new Set(numbers).size !== numbers.length);
        return numbers;
    }

    function get(indices, arr)
    {
        return (typeof indices === 'number' ? [indices] : indices).map(i => arr[i]);
    }

    function sentence(max)
    {
        let length = 1 + random(max - 1);
        let s = "";
        let p = false;
        for (let i = 0; i < length; i++)
        {
            if (!p && Math.random() < 0.3)
            {
                p = true;
                s += joiners[random(joiners.length)] + " ";
            }
            s += words[random(words.length)] + " ";
        }
        return s.trim();
    }

    function isbn()
    {
        let s = "";
        for (var i = 0; i < 13; i++)
        {
            s += random(10);
        }
        return s;
    }
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const names = ["Joe", "John", "Michael", "Amy", "Simpson", "Jessica", "Cameron", "Dean", "Tucker", "Emerald", "Sapphire", "Jones", "Cage", "Luke", "Wolfe", "Johnson"];
    const words = ["jackal", "apple", "serpent", "house", "flew", "orchid", "cherry", "blossom", "lust", "affair", "politics", "problem", "economy", "edible", "joyous", "indelible", "space", "war", "world", "game", "hunger", "death", "note", "promise", "surprise", "joke", "vandal", "American", "attack", "titan", "ender"];
    const joiners = ["for", "of", "with", "the", "over", "into", "on"];
    const genres = ["mystery", "horror", "adventure", "romance", "young-adult", "thriller", "action", "adult", "child", "erotica"]
    const permissions = ["check_out", "place_hold", "modify_hold", "modify_book", "modify_fine", "modify_person", "admin", "author", "user", "test"];
    let authors = [];
    for (let i = 0; i < 30; i++)
    {
        let person = {
            name:
            {
                first: names[random(names.length)],
                last: names[random(names.length)]
            },
            permissions: ["author", "test"]
        };
        authors.push(db.people.insertOne(person).insertedId);
    }
    const books = [];
    for (let i = 0; i < 150; i++)
    {
        let book = {
            authors: get(random(authors.length, 1 + random(6)), authors),
            name: sentence(1 + random(4)),
            isbn: isbn(),
            year: NumberInt(1850 + random(300)),
            genre: ["test"].concat(get(random(genres.length, 1 + random(3)), genres))
        };
        books.push(book)
    }
    printjson(db.books.insert(books));
})();