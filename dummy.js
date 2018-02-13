(function ()
{
    let trace = (operation, result) =>
    {
        if (result.ok)
        {
            print(`${operation}: OK`);
        }
        else if (result instanceof WriteResult)
        {
            let message = `${operation}: OK`;
            if ('nRemoved' in result)
                message += `, removed ${result.nRemoved}`;
            if ('nModified' in result)
                message += `, modified ${result.nModified}`;
            if ('nUpserted' in result)
                message += `, inserted ${result.nUpserted}`;
            if ('nMatched' in result)
                message += ` records of ${result.nMatched} matched`;

            print(message);
        }
        else if (result instanceof BulkWriteResult)
        {
            if (result.writeErrors && result.writeErrors.length > 0)
            {
                print(`${operation}: Error`)
                printjson(message.writeErrors);
                return;
            }

            let message = `${operation}: OK`;
            if ('nRemoved' in result)
                message += `, removed ${result.nRemoved}`;
            if ('nInserted' in result)
                message += `, inserted ${result.nInserted}`;
            if ('nModified' in result)
                message += `, modified ${result.nModified}`;
            if ('nUpserted' in result)
                message += `, inserted ${result.nUpserted}`;
            if ('nMatched' in result)
                message += ` records of ${result.nMatched} matched`;
            print(message);
        }
        else
        {
            print(result)
            print(`${operation}: Failed - ${result.codeName} - ${result.errmsg}`);
        }
    };

    trace("Clearing fines", db.fines.remove({}));
    trace("Clearing holds", db.holds.remove({}));
    trace("Clearing checkouts", db.checkouts.remove({}));

    trace("Clearing test books", db.books.remove(
        {
            genre: "test"
        }));

    trace("Clearing test people", db.people.remove(
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
            return (typeof indices === 'number' ? [indices] : indices).map(arr);

        return (typeof indices === 'number' ? [indices] : indices).map(i => arr[i]);
    }

    function range(n)
    {
        const a = [];
        for (let i = 0; i < n; i++)a.push(i);
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
    const fnames = ["Victoria", "Joe", "John", "Michael", "Amy", 
    "Simpson", "Jessica", "Cameron", "Camila", "Jody", "Dean",
    "Tucker", "Emerald", "Sapphire", "Jones", "Alejandro", 
    "Luke", "Alejandra", "Alexandra", "Nithish", "Sabrina", "Varun", "Zenobia",
    "Daryl", "Butch", "Felicia", "Shira", "Gregory", "Gunther", "Harold", "Harry",
    "Gene", "Jack", "Jacques", "Kaitlyn", "Chay", "Riley", "Kyle", "Lucy", "James",
    "María", "Pablo", "Tita", "Edith", "Martin", "Michelle", "Nigel", "Niranjan",
    "Norton", "Orson", "Prerna", "Ritika", "QuaJayvis", "Samuel", "Tyrone", "Uniqua",
    "Wonuola", "Winston"];
    const lnames = ["Alkin", "Gregory", "Simpson", "Ryo", "Ng", "Ramirez", "Suarez", "Bishop",
    "Ortiz", "White", "Brown", "Smith", "Black",  "Tucker", "Braginskiy", "Orwell",
     "Savliev", "Cage", "Venkatesh", "Narasimman", "Lagraba", "Stuart", "Johnson",
     "Cassidy", "Burka", "Pierce", "Frome", "Feinberg", "Hammond", "Drummond", "Pratt",
     "Lane", "Arellano", "Arellano-Felix", "Escobar", "Iyer", "Wharton", "Musk", "Vanderbilt",
     "Crosby", "Jackson", "Edelman", "Björk", "Nkese", "Nguyen", "Panganiban", "Cruz", "Calliope",
     "Rembrandt", "Lotus", "Shiro", "Montpellier", "Greer", "Ahrens", "Krakovsky", "Ivy", "Allender",
     "Wrenchey", "Wright", "Saxby", "Danaee"];
    const words = ["jackal", "greek", "roman", "byzantine", "apple", "serpent", "house", "flew", "orchid", "cherry", "blossom", "affair", "politics", "problem", "economy", "edible", "joyous", "indelible", "space", "war", "world", "game", "hunger", "death", "note", "promise", "surprise", "joke", "vandal", "American", "attack", "titan",
        "bank", "crisis", "removal", "edict", "savior", "airplane", "physics", "introduction", "snakes", "badgers", "habits", "silence", "night", "relationships", "calm", "pond", "poem", "home", "destroyer", "rocket", "Mars", "lunar", "landing", "fake", "news", "art", "modern", "ancient"];
    const joiners = ["for", "of", "with", "the", "over", "into", "on", "to", "without", "inside of", "on top of", "under", "attached to"];
    const genres = ["mystery", "horror", "adventure", "romance", "young-adult", "thriller", "action", "adult", "child"]
    const permissions = ["check_out", "place_hold", "modify_hold", "modify_book", "modify_fine", "modify_person", "admin", "author", "user", "test"];
    const names = [];

    // name must be unique because username is derived from name
    // and username must be unique
    for (let f in fnames)
    {
        for (let l in lnames)
        {
            names.push({ first: fnames[f], last: lnames[l] });
        }
    }

    let authors = [];
    let users = [];
    let name = names.splice(0, 1)[0];

    for (let i = 0; i < 50; i++)
    {
        let person = {
            name: name,
            permissions: ["author", "test"]
        };

        name = names.splice(random(names.length), 1)[0];

        if (Math.random() < 0.1)
        {
            person.permissions.push("user");
            person.permissions.push("place_hold");
            person.username = person.name.first + person.name.last;
            person.password = "$2a$12$bcWv0QtdlVZ3O4Wi0pmmPu0HmEPMpAgxCmeBwvxEF04G9U04gC/za";

            if (Math.random() < 0.1)
            {
                person.permissions.push("modify_hold");
                person.permissions.push("check_out");
                person.permissions.push("modify_book");
                person.permissions.push("modify_fine");
            }
        }

        authors.push(db.people.insertOne(person).insertedId);
        if (person.permissions.indexOf("user") !== -1)
            users.push(authors[authors.length - 1]);
    }

    const books = [];

    for (let i = 0; i < 150; i++)
    {
        let book = {
            authors: get(random(authors.length, 1 + random(3)), authors),
            name: sentence(1 + random(8)),
            isbn: isbn(),
            copies: get(1 + random(4), () => ObjectId()),
            year: NumberInt(1950 + random(2018 - 1950)),
            genre: ["test"].concat(get(random(genres.length, 1 + random(3)), genres))
        };
        books.push(book);
    }

    trace("Inserting test books", db.books.insert(books));

    const holds = [];
    for (let i = 0; i < 30; i++)
    {
        let hold = {
            person: users[random(users.length)],
            isbn: books[random(books.length)].isbn,
            completed: false,
            date: new Date(new Date().valueOf() - random(7 * 86400 * 1000))
        };
        holds.push(hold)
    }
    trace("Inserting test holds", db.holds.insert(holds));

})();