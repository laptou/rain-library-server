import * as uuid from "uuid/v4";

export enum IsbnRegion
{
    EnglishLanguage,
    FrenchLanguage,
    GermanLanguage,
    Japan,
    RussianLanguage,
    Afghanistan,
    Albania,
    Algeria,
    Andorra,
    Argentina,
    Armenia,
    Azerbaijan,
    Bahrain,
    Bangladesh,
    Belarus,
    Benin,
    Bhutan,
    Bolivia,
    BosniaHerzegovina,
    Botswana,
    Brazil,
    BruneiDarussalam,
    Bulgaria,
    Cambodia,
    Cameroon,
    CARICOM,
    Chile,
    China,
    Colombia,
    Congo,
    CostaRica,
    Croatia,
    Cuba,
    Curacao,
    Cyprus,
    Czechoslovakia,
    Denmark,
    DominicanRepublic,
    Ecuador,
    Egypt,
    ElSalvador,
    Eritrea,
    Estonia,
    Ethiopia,
    FaroeIslands,
    Finland,
    France,
    Gabon,
    Gambia,
    Georgia,
    Ghana,
    Greece,
    Guatemala,
    Haiti,
    Honduras,
    HongKong,
    Hungary,
    Iceland,
    India,
    Indonesia,
    Iran,
    Israel,
    Italy,
    Jordan,
    Kazakhstan,
    Kenya,
    Kosova,
    Kuwait,
    Kyrgyzstan,
    Laos,
    Latvia,
    Lebanon,
    Lesotho,
    Libya,
    Lithuania,
    Luxembourg,
    Macau,
    Macedonia,
    Malawi,
    Malaysia,
    Maldives,
    Mali,
    Malta,
    Mauritius,
    Mexico,
    Moldova,
    Mongolia,
    Montenegro,
    Morocco,
    Myanmar,
    Namibia,
    Nepal,
    Netherlands,
    Nicaragua,
    Nigeria,
    NorthKorea,
    Norway,
    Oman,
    Pakistan,
    Palestine,
    Panama,
    PapuaNewGuinea,
    Paraguay,
    Peru,
    Philippines,
    Poland,
    Portugal,
    Qatar,
    RepublicOfKorea,
    RepublikaSrpska,
    Romania,
    Rwanda,
    SaudiArabia,
    Seychelles,
    SierraLeone,
    Singapore,
    Slovenia,
    SouthPacific,
    Spain,
    SriLanka,
    Sudan,
    Suriname,
    Sweden,
    Syria,
    Taiwan,
    Tajikistan,
    Tanzania,
    Thailand,
    Tunisia,
    Turkey,
    Uganda,
    Ukraine,
    UnitedArabEmirates,
    Uruguay,
    Uzbekistan,
    Venezuela,
    Vietnam,
    Yugoslavia,
    Zambia
}

function join (arr: number[]): number
{
    return arr.reverse().reduce((prev, current, index) =>
                                {
                                    return prev + current * 10 ** index;
                                });
}

function inRange (start, x, end)
{
    return start <= x && x <= end;
}

function range (start, end)
{
    return Array(1 + end - start).map(v => start + v);
}

export class Isbn
{
    check: number;
    prefix: number[];
    publication: number[];
    registrant: number[];
    registrationGroup: number[];

    constructor (digits: number[])
    {
        if (digits.length === 13 &&
            !inRange(978, join(digits.slice(0, 3)), 979))
        {
            console.log(digits);
            throw new Error("Invalid prefix.");
        }

        if (digits.length !== 13 &&
            digits.length !== 10)
            throw new Error("These arguments do not create a valid ISBN.");

        this.prefix = digits.slice(0, 3);

        if ([0, 1, 2, 3, 4, 5, 7].indexOf(join(digits.slice(3, 4))) !== -1)
            this.registrationGroup = digits.slice(3, 4);

        if (inRange(80, join(digits.slice(3, 5)), 94))
            this.registrationGroup = digits.slice(3, 5);

        if (inRange(600, join(digits.slice(3, 6)), 621) ||
            inRange(950, join(digits.slice(3, 6)), 989))
            this.registrationGroup = digits.slice(3, 6);

        if (inRange(9926, join(digits.slice(3, 7)), 9989))
            this.registrationGroup = digits.slice(3, 7);

        if (inRange(99901, join(digits.slice(3, 8)), 99976))
            this.registrationGroup = digits.slice(3, 8);

        let start = 3 + this.registrationGroup.length;

        if (inRange(0, join(digits.slice(start, start + 2)), 19))
            this.registrant = digits.slice(start, start + 2);

        if (inRange(200, join(digits.slice(start, start + 3)), 699))
            this.registrant = digits.slice(start, start + 3);

        if (inRange(7000, join(digits.slice(start, start + 4)), 8499))
            this.registrant = digits.slice(start, start + 4);

        if (inRange(85000, join(digits.slice(start, start + 5)), 89999))
            this.registrant = digits.slice(start, start + 5);

        if (inRange(900000, join(digits.slice(start, start + 6)), 949999))
            this.registrant = digits.slice(start, start + 6);

        if (inRange(9500000, join(digits.slice(start, start + 6)), 9999999))
            this.registrant = digits.slice(start, start + 7);

        start += this.registrant.length;

        this.publication = digits.slice(start, digits.length - 1);

        this.check = digits[digits.length - 1];

        if (!this.validate())
            throw new Error("These arguments do not create a valid ISBN.");
    }

    get region ()
    {
        switch (join(this.registrationGroup))
        {
            case 0:
            case 1:
                return IsbnRegion.EnglishLanguage;
            case 2:
                return IsbnRegion.FrenchLanguage;
            case 3:
                return IsbnRegion.GermanLanguage;
            case 4:
                return IsbnRegion.Japan;
            case 5:
                return IsbnRegion.RussianLanguage;
            case 7:
                return IsbnRegion.China;
            case 80:
                return IsbnRegion.Czechoslovakia;
            case 81:
            case 93:
                return IsbnRegion.India;
            case 82:
                return IsbnRegion.Norway;
            case 83:
                return IsbnRegion.Poland;
            case 84:
                return IsbnRegion.Spain;
            case 85:
                return IsbnRegion.Brazil;
            case 86:
                return IsbnRegion.Yugoslavia;
            case 87:
                return IsbnRegion.Denmark;
            case 88:
                return IsbnRegion.Italy;
            case 89:
                return IsbnRegion.RepublicOfKorea;
            case 90:
            case 94:
                return IsbnRegion.Netherlands;
            case 91:
                return IsbnRegion.Sweden;
            case 92: // International NGO Publishers and EC Organizations
                return 0;
            case 964:
            case 600:
                return IsbnRegion.Iran;
            case 9965:
            case 601:
                return IsbnRegion.Kazakhstan;
            case 979:
            case 602:
                return IsbnRegion.Indonesia;
            case 9960:
            case 603:
                return IsbnRegion.SaudiArabia;
            case 604:
                return IsbnRegion.Vietnam;
            case 9944:
            case 975:
            case 605:
                return IsbnRegion.Turkey;
            case 973:
            case 606:
                return IsbnRegion.Romania;
            case 968:
            case 607:
                return IsbnRegion.Mexico;
            case 608:
                return IsbnRegion.Macedonia;
            case 9986:
            case 9955:
            case 609:
                return IsbnRegion.Lithuania;
            case 974:
            case 616:
            case 611:
                return IsbnRegion.Thailand;
            case 9972:
            case 612:
                return IsbnRegion.Peru;
            case 99949:
            case 99903:
            case 620:
            case 613:
                return IsbnRegion.Mauritius;
            case 614:
                return IsbnRegion.Lebanon;
            case 963:
            case 615:
                return IsbnRegion.Hungary;
            case 966:
            case 617:
                return IsbnRegion.Ukraine;
            case 960:
            case 618:
                return IsbnRegion.Greece;
            case 954:
            case 619:
                return IsbnRegion.Bulgaria;
            case 971:
            case 621:
                return IsbnRegion.Philippines;
            case 987:
            case 950:
                return IsbnRegion.Argentina;
            case 951:
            case 952:
                return IsbnRegion.Finland;
            case 953:
                return IsbnRegion.Croatia;
            case 955:
                return IsbnRegion.SriLanka;
            case 956:
                return IsbnRegion.Chile;
            case 986:
            case 957:
                return IsbnRegion.Taiwan;
            case 958:
                return IsbnRegion.Colombia;
            case 959:
                return IsbnRegion.Cuba;
            case 961:
                return IsbnRegion.Slovenia;
            case 988:
            case 962:
                return IsbnRegion.HongKong;
            case 965:
                return IsbnRegion.Israel;
            case 983:
            case 967:
                return IsbnRegion.Malaysia;
            case 989:
            case 972:
                return IsbnRegion.Portugal;
            case 976:
                return IsbnRegion.CARICOM;
            case 977:
                return IsbnRegion.Egypt;
            case 978:
                return IsbnRegion.Nigeria;
            case 980:
                return IsbnRegion.Venezuela;
            case 9971:
            case 981:
                return IsbnRegion.Singapore;
            case 982:
                return IsbnRegion.SouthPacific;
            case 984:
                return IsbnRegion.Bangladesh;
            case 985:
                return IsbnRegion.Belarus;
            case 99963:
            case 99950:
            case 9924:
                return IsbnRegion.Cambodia;
            case 9963:
            case 9925:
                return IsbnRegion.Cyprus;
            case 9958:
            case 9926:
                return IsbnRegion.BosniaHerzegovina;
            case 99921:
            case 9927:
                return IsbnRegion.Qatar;
            case 99956:
            case 99943:
            case 99927:
            case 9928:
                return IsbnRegion.Albania;
            case 99939:
            case 99922:
            case 9929:
                return IsbnRegion.Guatemala;
            case 9977:
            case 9968:
            case 9930:
                return IsbnRegion.CostaRica;
            case 9961:
            case 9947:
            case 9931:
                return IsbnRegion.Algeria;
            case 9932:
                return IsbnRegion.Laos;
            case 9933:
                return IsbnRegion.Syria;
            case 9984:
            case 9934:
                return IsbnRegion.Latvia;
            case 9979:
            case 9935:
                return IsbnRegion.Iceland;
            case 9936:
                return IsbnRegion.Afghanistan;
            case 99946:
            case 9937:
                return IsbnRegion.Nepal;
            case 99941:
            case 99930:
            case 9939:
                return IsbnRegion.Armenia;
            case 9940:
                return IsbnRegion.Montenegro;
            case 99940:
            case 99928:
            case 9941:
                return IsbnRegion.Georgia;
            case 9978:
            case 9942:
                return IsbnRegion.Ecuador;
            case 9943:
                return IsbnRegion.Uzbekistan;
            case 9945:
                return IsbnRegion.DominicanRepublic;
            case 9946:
                return IsbnRegion.NorthKorea;
            case 9948:
                return IsbnRegion.UnitedArabEmirates;
            case 9985:
            case 9949:
                return IsbnRegion.Estonia;
            case 9950:
                return IsbnRegion.Palestine;
            case 9951:
                return IsbnRegion.Kosova;
            case 9952:
                return IsbnRegion.Azerbaijan;
            case 9953:
                return IsbnRegion.Lebanon;
            case 9981:
            case 9954:
                return IsbnRegion.Morocco;
            case 9956:
                return IsbnRegion.Cameroon;
            case 9957:
                return IsbnRegion.Jordan;
            case 9959:
                return IsbnRegion.Libya;
            case 9962:
                return IsbnRegion.Panama;
            case 9988:
            case 9964:
                return IsbnRegion.Ghana;
            case 9966:
                return IsbnRegion.Kenya;
            case 9967:
                return IsbnRegion.Kyrgyzstan;
            case 9970:
                return IsbnRegion.Uganda;
            case 9973:
                return IsbnRegion.Tunisia;
            case 9974:
                return IsbnRegion.Uruguay;
            case 9975:
                return IsbnRegion.Moldova;
            case 9987:
            case 9976:
                return IsbnRegion.Tanzania;
            case 9980:
                return IsbnRegion.PapuaNewGuinea;
            case 9982:
                return IsbnRegion.Zambia;
            case 9983:
                return IsbnRegion.Gambia;
            case 9989:
                return IsbnRegion.Macedonia;
            case 99958:
            case 99901:
                return IsbnRegion.Bahrain;
            case 99902:
                return IsbnRegion.Gabon;
            case 99904:
                return IsbnRegion.Curacao;
            case 99974:
            case 99954:
            case 99905:
                return IsbnRegion.Bolivia;
            case 99966:
            case 99906:
                return IsbnRegion.Kuwait;
            case 99960:
            case 99908:
                return IsbnRegion.Malawi;
            case 99957:
            case 99909:
                return IsbnRegion.Malta;
            case 99910:
                return IsbnRegion.SierraLeone;
            case 99911:
                return IsbnRegion.Lesotho;
            case 99968:
            case 99912:
                return IsbnRegion.Botswana;
            case 99920:
            case 99913:
                return IsbnRegion.Andorra;
            case 99914:
                return IsbnRegion.Suriname;
            case 99915:
                return IsbnRegion.Maldives;
            case 99945:
            case 99916:
                return IsbnRegion.Namibia;
            case 99917:
                return IsbnRegion.BruneiDarussalam;
            case 99972:
            case 99918:
                return IsbnRegion.FaroeIslands;
            case 99919:
                return IsbnRegion.Benin;
            case 99961:
            case 99923:
                return IsbnRegion.ElSalvador;
            case 99964:
            case 99924:
                return IsbnRegion.Nicaragua;
            case 99967:
            case 99953:
            case 99925:
                return IsbnRegion.Paraguay;
            case 99926:
                return IsbnRegion.Honduras;
            case 99973:
            case 99962:
            case 99929:
                return IsbnRegion.Mongolia;
            case 99931:
                return IsbnRegion.Seychelles;
            case 99970:
            case 99935:
                return IsbnRegion.Haiti;
            case 99936:
                return IsbnRegion.Bhutan;
            case 99965:
            case 99937:
                return IsbnRegion.Macau;
            case 99976:
            case 99955:
            case 99938:
                return IsbnRegion.RepublikaSrpska;
            case 99942:
                return IsbnRegion.Sudan;
            case 99944:
                return IsbnRegion.Ethiopia;
            case 99975:
            case 99947:
                return IsbnRegion.Tajikistan;
            case 99948:
                return IsbnRegion.Eritrea;
            case 99951:
                return IsbnRegion.Congo;
            case 99952:
                return IsbnRegion.Mali;
            case 99959:
                return IsbnRegion.Luxembourg;
            case 99969:
                return IsbnRegion.Oman;
            case 99971:
                return IsbnRegion.Myanmar;
            case 99977:
                return IsbnRegion.Rwanda;
            case 10:
                if (this.prefix === [9, 7, 9])
                    return IsbnRegion.France;
                break;
            case 11:
                if (this.prefix === [9, 7, 9])
                    return IsbnRegion.RepublicOfKorea;
                break;
            case 12:
                if (this.prefix === [9, 7, 9])
                    return IsbnRegion.Italy;
                break;
            default:
                throw new Error("Invalid region code.");
        }
    }

    static parse (isbn: string)
    {
        if (!isbn) return null;
        return new Isbn(isbn.replace(/\D/g, "").split("").map(x => parseInt(x)));
    }

    toJSON ()
    {
        return this.toString();
    }

    toString (): string
    {
        return [this.prefix, this.registrationGroup, this.registrant,
                this.publication, [this.check === -1 ? "X" : this.check]]
            .map(a => a.join("")).join("-");
    }

    private validate (): boolean
    {
        // verify that the region code exists
        // calling Region_get() will throw an exception
        // otherwise
        // noinspection JSUnusedLocalSymbols
        const region = this.region;

        const str = this.toString().replace(/-/g, "");

        let sum = 0;

        for (let i = 0; i < str.length; i++)
        {
            const c = str[i];

            const n = c === "X" ? 10 : parseInt(c);

            if (this.prefix == null)
            {
                // ISBN-10 multiplier counts down from 10
                sum += n * (str.length - i);
            }
            else
            {
                // ISBN-13 multiplier alternates between 1 and 3
                sum += n * (i % 2 === 0 ? 1 : 3);
            }
        }

        return this.prefix == null ? sum % 11 === 0 : sum % 10 === 0;
    }
}

export class Person
{
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;

    id: Uuid;
    creations: Uuid[];
    status: Status;

    constructor (firstName: string, lastName: string, status: Status, id?: Uuid)
    {
        this.id = id || new Uuid();
        this.firstName = firstName;
        this.lastName = lastName;
        this.status = status;
        this.creations = [];
    }

    get name ()
    {
        return this.firstName + " " + this.lastName;
    }

    get fullName ()
    {
        return this.prefix + " " +
               this.firstName + " " +
               this.middleName + " " +
               this.lastName + " " +
               this.suffix;
    }

    toJSON ()
    {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            name: this.name,
            fullName: this.fullName,
            creations: this.creations,
            status: this.status
        };
    }

    toString ()
    {
        return this.name;
    }
}

export class User extends Person
{
    permissions: Permissions = 0;
    itemCountLimit: number = 0;
    itemTimeLimit: number = 0;
}

export enum Permissions
{
    CheckIn = 1 << 0,
    CheckOut = 1 << 1,
    AddBook = 1 << 2,
    RemoveBook = 1 << 3,
    AddPerson = 1 << 4,
    RemovePerson = 1 << 5,
    ViewPerson = 1 << 6,
    ChangePermissions = 1 << 7
}

export enum Status
{
    Person = 1 << 0,
    Author = 1 << 1,
    Student = 1 << 2,
    Teacher = 1 << 3,
    Librarian = 1 << 4
}

export abstract class Item
{
    id: Uuid;
    name: string;
    authors: Uuid[];

    protected constructor (name: string, id: Uuid)
    {
        this.id = id || new Uuid();
        this.name = name;
        this.authors = [];
    }
}

export class Uuid
{
    private readonly buffer: Buffer;

    constructor (bytes?: Buffer)
    {
        if (bytes)
        {
            this.buffer = bytes.slice(0, 16);
        }
        else
        {
            this.buffer = Buffer.alloc(16);
            uuid(null, this.buffer);
        }
    }

    static parse (str: string)
    {
        return new Uuid(Buffer.from(str.replace(/-/g, ""), "hex"));
    }

    toArray ()
    {
        return [...this.buffer.values()];
    }

    toBuffer ()
    {
        return this.buffer;
    }

    toJSON ()
    {
        return this.toString();
    }

    toString ()
    {
        return this.buffer.toString("hex", 0, 4) +
               "-" +
               this.buffer.toString("hex", 4, 6) +
               "-" +
               this.buffer.toString("hex", 6, 8) +
               "-" +
               this.buffer.toString("hex", 8, 10) +
               "-" +
               this.buffer.toString("hex", 10, 16);
    }
}

export class Book extends Item
{
    isbn: Isbn;
    year: number;
    rating: number;

    constructor (name: string, isbn: Isbn, id: Uuid)
    {
        super(name, id);
        this.isbn = isbn;
    }

    toString ()
    {
        return `ID: ${this.id.toString()} \n` +
               `Name: ${this.name}\n` +
               `ISBN: ${this.isbn.toString()}`;
    }
}