"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = require("bcrypt");
const KoaPassport = require("koa-passport");
const Router = require("koa-router");
const passport_local_1 = require("passport-local");
const data_1 = require("../data");
const util_1 = require("../util");
const logger = new util_1.Logger(util_1.LogSource.Auth);
KoaPassport.serializeUser((user, done) => {
    done(null, { id: user.id, name: user.name, username: user.username });
});
KoaPassport.deserializeUser(async (user, done) => {
    const doc = await data_1.Database.getPersonById(user.id);
    done(null, doc);
});
KoaPassport.use("local-register", new passport_local_1.Strategy({ passReqToCallback: true }, async (req, username, password, done) => {
    try {
        let person = await data_1.Database.getPersonByUsername(username);
        let valid = true;
        if (person) {
            done(null, null, {
                message: "User with this name already exists."
            });
            valid = false;
        }
        let first = req.body.name.first || req.body.firstName;
        let last = req.body.name.last || req.body.lastName;
        if (!first || !last) {
            done(null, null, {
                message: "First and last name are required to create a new user."
            });
            valid = false;
        }
        if (valid) {
            let hash = await bcrypt.hash(password, await bcrypt.genSalt(12));
            person = new data_1.Model.Person();
            person.username = username;
            person.name = { first, last };
            person.permissions = ["user"];
            person.password = hash;
            await person.save({ safe: true });
            done(null, person, { message: "User created." });
        }
    }
    catch (err) {
        done(err);
    }
}));
KoaPassport.use("local-login", new passport_local_1.Strategy({ passReqToCallback: true }, async (req, username, password, done) => {
    try {
        let person = await data_1.Database.getPersonByUsername(username);
        if (person) {
            if (person.permissions.indexOf("user") === -1) {
                done(null, null, {
                    message: "This person does not have the required permissions. "
                });
                return;
            }
            if (await bcrypt.compare(password, person.password)) {
                done(null, person, { message: "User authenticated." });
                return;
            }
        }
        done(null, null, { message: "Invalid username or password." });
    }
    catch (err) {
        done(err);
    }
}));
exports.AuthRouter = new Router();
exports.AuthWall = (...permissions) => {
    if (permissions.length === 0)
        permissions = ["user"];
    let err = new Error();
    let stack = err.stack;
    return async (ctx, next) => {
        console.log(stack);
        let authenticated = ctx.isAuthenticated();
        if (authenticated) {
            if (ctx.state.user.permissions.indexOf("admin") === -1) {
                for (const permission of permissions) {
                    if (ctx.state.user.permissions.indexOf(permission) === -1) {
                        authenticated = false;
                        break;
                    }
                }
            }
        }
        if (authenticated)
            await next();
        else {
            if (util_1.acceptsJson(ctx))
                ctx.status = 401;
            else
                ctx.redirect("/");
        }
    };
};
exports.AuthRouter.get("/me", exports.AuthWall(), async (ctx) => {
    const user = ctx.state.user;
    ctx.body = {
        id: user.id,
        name: user.name,
        username: user.username,
        permissions: user.permissions
    };
});
exports.AuthRouter.get("/logout", exports.AuthWall(), async (ctx) => {
    ctx.logout();
    ctx.status = 200;
});
exports.AuthRouter.post("/register", exports.AuthWall("admin"), KoaPassport.authenticate("local-register"), async (ctx) => {
    // if it gets here, that means it got past Passport
    ctx.status = 200;
});
exports.AuthRouter.post("/login", KoaPassport.authenticate("local-login"), async (ctx) => {
    // if it gets here, that means it got past Passport
    ctx.status = 200;
});
//# sourceMappingURL=index.js.map