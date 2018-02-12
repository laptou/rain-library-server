(function ()
{
    printjson(db.fines.remove({}));
    printjson(db.holds.remove({}));
    printjson(db.checkouts.remove({}));

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
        do
        {
            for (var i = 0; i < num; i++)
            {
                numbers[i] = random(max);
            }
        } while (new Set(numbers).size !== numbers.length);
        return numbers;
    }

    function get(indices, arr)
    {
        if (typeof arr === "function")
            return (typeof indices === 'number' ? [range(indices)] : indices).map(arr);

        return (typeof indices === 'number' ? [range(indices)] : indices).map(i => arr[i]);
    }

    function range(n)
    {
        const a = [];
        for(let i = 0; i < n; i ++)a.push(i);
        return a;
    }

    function sentence(max)
    {
        let length = 1 + random(max - 1);
        let s = "";
        let p = false;
        for (let i = 0; i < length; i++)
        {
            s += words[random(words.length)] + " ";

            if (!p && Math.random() < 0.3 && i < length - 1)
            {
                p = true;
                s += joiners[random(joiners.length)] + " ";
            }
            else
            {
                p = false;
            }
        }
        return s.trim();
    }

    function isbn()
    {
        let s = "9780";
        for (var i = 0; i < 9; i++)
        {
            s += random(10);
        }
        return s;
    }
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const fnames = ["Joe", "John", "Michael", "Amy", "Simpson", "Jessica", "Cameron", "Camila", "Jody", "Dean", "Tucker", "Emerald", "Sapphire", "Jones", "Alejandro", "Luke", "Alejandra", "Alexandra"];
    const lnames = ["Gregory", "Simpson", "Ryo", "Ng", "Ramirez", "Suarez", "Ortiz", "White", "Brown", "Smith", "Black", "Alkin", "Tucker", "Braginskiy", "Savliev", "Cage", "Venkatesh", "Narasimman", "Lagraba", "Stuart", "Johnson"];
    const words = ["jackal", "greek", "roman", "byzantine", "apple", "serpent", "house", "flew", "orchid", "cherry", "blossom",  "affair", "politics", "problem", "economy", "edible", "joyous", "indelible", "space", "war", "world", "game", "hunger", "death", "note", "promise", "surprise", "joke", "vandal", "American", "attack", "titan", 
"bank", "crisis", "removal", "edict", "savior", "airplane", "physics", "introduction", "snakes", "badgers", "habits", "silence", "night", "relationships", "calm", "pond", "poem", "home", "destroyer", "rocket", "Mars", "lunar", "landing", "fake", "news", "art", "modern", "ancient"];
    const joiners = ["for", "of", "with", "the", "over", "into", "on", "to", "without", "inside of", "on top of", "under", "attached to"];
    const genres = ["mystery", "horror", "adventure", "romance", "young-adult", "thriller", "action", "adult", "child"]
    const permissions = ["check_out", "place_hold", "modify_hold", "modify_book", "modify_fine", "modify_person", "admin", "author", "user", "test"];
    let authors = [];

    for (let i = 0; i < 50; i++)
    {
        let person = {
            name:
                {
                    first: fnames[random(fnames.length)],
                    last: lnames[random(lnames.length)]
                },
            permissions: ["author", "test"]
        };

        if(random() < 0.1)
        {
            person.permissions.push("user");
            person.permissions.push("place_hold");
            person.username = person.name.first + person.name.last;
            person.password = "$2a$12$pRcEPIMwrwj9D81xSvU.vO98GLOy607GIFdmJvaeXAO03OviEkRcu";

            if(random() < 0.1)
            {
                person.permissions.push("modify_hold");
                person.permissions.push("check_out");
                person.permissions.push("modify_book");
                person.permissions.push("modify_fine");
            }
        }

        authors.push(db.people.insertOne(person).insertedId);
    }

    const books = [];
    for (let i = 0; i < 150; i++)
    {
        let book = {
            authors: get(random(authors.length, 1 + random(6)), authors),
            name: sentence(1 + random(8)),
            isbn: isbn(),
            copies: get(random(4), () => ObjectId()),
            year: NumberInt(1950 + random(2018 - 1950)),
            genre: ["test"].concat(get(random(genres.length, 1 + random(3)), genres))
        };
        books.push(book)
    }

    printjson(db.books.insert(books));
})();