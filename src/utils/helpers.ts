import * as crypto from "crypto";
import * as q from "q";
import * as faker from "faker";
import * as bcrypt from "bcryptjs";
import * as moment from "moment";
import * as _ from "underscore";
import * as fs from "fs";
import * as path from "path";

function crawlDirectories(dir) {
  let directories = [dir];
  var files = fs.readdirSync(dir);
  for (var x in files) {
    var next = path.join(dir, files[x]);
    if (fs.lstatSync(next).isDirectory() == true) {
      const subFolders = crawlDirectories(next);
      for (let j = 0; j < subFolders.length; j++) {
        directories.push(subFolders[j]);
      }
    }
  }

  return directories;
}

const helpers = {
  assignObjectValueFromOtherObject: (desObj: any, srcObj: object): void => {
    Object.keys(srcObj).map((key) => {
      desObj[key] = srcObj[key];
    });
  },

  // Ge a random code, used for reset password
  getRandomCode: (): Promise<string> => {
    const defer = q.defer();

    crypto.randomBytes(20, (err, buf) => {
      if (err) {
        defer.reject(err);
      } else {
        defer.resolve(buf.toString("hex"));
      }
    });

    return defer.promise;
  },

  // Ge a random code, used for reset password
  getRandomCouponCode: (): Promise<string> => {
    const defer = q.defer();

    crypto.randomBytes(20, (err, buf) => {
      if (err) {
        defer.reject(err);
      } else {
        defer.resolve(buf.toString("hex"));
      }
    });

    return defer.promise;
  },

  // Generate url for setup password or reset password
  getPasswordUrl: async (
    code: string,
    type: string,
    role: string,
    tenantCode?: string
  ): Promise<string> => {
    const webBaseUrl = global.env.webBaseUrl;
    const webBaseUrlUser = global.env.webBaseUrlUser;

    if (role === "customer") {
      return `${webBaseUrlUser}auth/${type}?code=${code}`;
    }

    return `${webBaseUrl}${type}?code=${code}`;
  },

  getImageUrl: (images: any, isMultiple?: boolean): any => {
    // const host = `${global.env.protocol}://${global.env.basePath}`;
    const host = `${global.env.protocol}://${global.env.basePath}`;
    let resData;
    if (isMultiple) {
      resData = [];

      for (let i = 0; i < images.length; i++) {
        // resData.push(images[i].path);
        resData.push(host + images[i].path);
      }
    } else {
      resData = host + images.path;
    }

    return resData;
  },

  getDateMilliSecs: (date?: Date): number => {
    return date ? new Date(date).getTime() : new Date().getTime();
  },

  minuteToMilliSecs: (minute: number): number => {
    return minute * 60000;
  },

  // Generate OTP code
  generateVerifyCode: (): number => {
    return faker.random.number({ min: 100000, max: 999999, precision: 6 });
  },

  // Generate hash password
  generateHashPassword: async (password: string): Promise<string> => {
    // Generate a salt for hash string
    const salt = await bcrypt.genSaltSync(parseInt(global.env.hashSalt));

    return await bcrypt.hashSync(password, salt);
  },

  // Stripe '0' number at the first string, used for phone number
  stripeZeroOut: (string: string): string => {
    return string.replace(/^0+/, "");
  },

  // Get random integer number
  getRandomInt(max: number): number {
    return Math.floor(Math.random() * Math.floor(max)) + 1;
  },

  // Get random integer number including zero
  getRandomIntWithZero(max: number): number {
    return Math.floor(Math.random() * Math.floor(max));
  },

  // Calculate years from current datetime
  calculateDate(date: string): number {
    return moment().diff(moment(date, "MM/DD/YYYY"), "years");
  },

  // Convert array of objects to array of strings
  returnPlatArray(arr: object[], key: string) {
    return arr.map((item) => {
      return item[key];
    });
  },

  // Replace string item from nested array by null value
  removeItemFromNestArray(arr: string[][], string: string): any {
    return arr.map((nestedArr: string[]) => {
      return nestedArr.map((item) => {
        if (item && item.toString() === string.toString()) {
          return null;
        } else {
          return item;
        }
      });
    });
  },

  // Merge nested array without null value inside
  mergeNestedArrayWithoutNullValue(arr: string[][]): any {
    return [].concat.apply([], arr).filter((item) => {
      return item !== null;
    });
  },

  // Insert value from an value array to 2d Id array
  insertValueIntoCorrespondingArrById(valueArr: any[], idArr: any[][]): void {
    idArr.map((nestedArr, index) => {
      nestedArr.map((id, index2) => {
        valueArr.map((value, index3) => {
          if (id && value._id.toString() === id.toString()) {
            idArr[index][index2] = value;
          }
        });
      });
    });
  },

  // Get number of not null element in 2d array
  getCountOfNotNullItemFromNestArray(arr: string[][]): number {
    let count = 0;
    arr.map((nestedArr: string[]) => {
      nestedArr.map((item) => {
        if (item) {
          count++;
        }
      });
    });
    return count;
  },

  // Assign value to the nearest empty slot in 2d array
  assignValueToNestArray(arr: string[][], value: string): void {
    arr.every((nestedArr) => {
      return nestedArr.every((item, index) => {
        if (item === null) {
          nestedArr[index] = value;
          return false; // Stop
        } else {
          return true; // Keep browser array
        }
      });
    });
  },

  // Convert value array to regex array
  convertToRegexArray(arr: string[]): RegExp[] {
    return arr.map((item) => {
      // Remove special characters
      item = item
        .replace(/^0+(?=\d)/, "")
        .replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, "");
      return new RegExp(item, "i");
    });
  },

  // Sort array by object field
  sortArrayByFieldLength(
    arr: object[],
    sortType: number,
    field: string
  ): object[] {
    arr.sort((a, b) => {
      let sortField = field.split("."),
        aLength,
        bLength;

      for (let i = 0; i < sortField.length; i++) {
        if (!a[sortField[i]] && b[sortField[i]]) {
          return -sortType;
        }

        if (!b[sortField[i]] && a[sortField[i]]) {
          return sortType;
        }

        if (!a[sortField[i]] && !b[sortField[i]]) {
          return 0;
        }

        if (i === sortField.length - 1) {
          if (a[sortField[i]].length === 0 && b[sortField[i]].length > 0) {
            return -sortType;
          }

          if (b[sortField[i]].length === 0 && a[sortField[i]].length > 0) {
            return sortType;
          }

          if (a[sortField[i]].length === 0 && b[sortField[i]].length === 0) {
            return 0;
          }

          aLength = a[sortField[i]].length;
          bLength = b[sortField[i]].length;
        }

        a = a[sortField[i]];
        b = b[sortField[i]];
      }

      return sortType > 0
        ? aLength < bLength
          ? -1
          : aLength > bLength
          ? 1
          : 0
        : aLength < bLength
        ? 1
        : aLength > bLength
        ? -1
        : 0;
    });

    return arr;
  },

  // Sort array by object field
  sortArrayByField(arr: object[], sortType: number, field: string): object[] {
    arr.sort((a, b) => {
      let sortField = field.split(".");

      for (let i = 0; i < sortField.length; i++) {
        if (!a[sortField[i]] && b[sortField[i]]) {
          return -sortType;
        }

        if (!b[sortField[i]] && a[sortField[i]]) {
          return sortType;
        }

        if (!a[sortField[i]] && !b[sortField[i]]) {
          return 0;
        }

        a = a[sortField[i]];
        b = b[sortField[i]];
      }

      return sortType > 0
        ? a < b
          ? -1
          : a > b
          ? 1
          : 0
        : a < b
        ? 1
        : a > b
        ? -1
        : 0;
    });

    return arr;
  },

  // Get array by object field
  getArrayByField(arr: object[], field: string): string[] {
    return _.pluck(arr, field);
  },

  // Get element matched from arr
  getElementNotMatchedRegex(regexArr: RegExp[], targetArr: string[]): RegExp[] {
    return regexArr.filter((regex) => {
      let rs = targetArr.filter((item) => {
        return item.match(regex); // Get item match with regex
      });

      return rs.length === 0; // Item is not matched is that one we want to find
    });
  },

  // Convert RegExp arr to string
  convertRegExpToString(arr: RegExp[]): object[] {
    return arr.map((regex) => {
      return {
        fullPhoneNumber: regex.source,
        availableInGame: false,
        isFriend: false,
        smsContent: "Download your app at: www.google.com",
        isSentFriendRequest: false,
      };
    });
  },

  // Merge 2 arrays and eliminate duplicated element
  mergeAndEliminateDupItem(arr1: string[], arr2: string[]): string[] {
    return _.union(arr1, arr2);
  },

  paginateAnArray(arr: object[], size: number, page: number): object {
    let skip = 0,
      limit = 0,
      data = null,
      totalRow = 0;

    // Limit item
    if (size && +size > 0) {
      // Limit page with size
      if (page && +page > 0) {
        skip = +page * +size;
        limit = +size;
      } else {
        // Limit page with default
        limit = +size;
      }
    } else {
      if (page && +page > 0) {
        return {
          currentPage: +page,
          totalPage: 1,
          data: [],
        };
      }
    }

    if (+size > 0) {
      totalRow = arr.length;
    }

    // Calculate total page
    let totalPage = +size > 0 ? Math.ceil(arr.length / +size) : 1;

    if (skip === 0 && limit === 0) {
      data = arr;
    } else {
      data = arr.slice(skip, (skip + 1) * limit);
    }

    return {
      currentPage: +page ? +page : 0,
      totalRow,
      totalPage,
      data,
    };
  },

  // Check if value that user choose contained in supported region
  checkValueValidBaseOnRegion(region: string, value: string): boolean {
    const supportedCountry = [
      "anz",
      "cn",
      "id",
      "my",
      "nz",
      "ph",
      "sg",
      "gb",
      "us",
    ];
    const supportedContinent = ["asia", "northAmerica", "europe", "australia"];

    switch (region) {
      case "country": {
        return supportedCountry.includes(value);
      }
      case "continent": {
        return supportedContinent.includes(value);
      }
      default:
        return false;
    }
  },

  // Search a value in 2d array
  searchValueIn2DArray(arr: string[][], value: string): string {
    let itemFound: string = null;

    arr.every((nestedArr) => {
      return nestedArr.every((item, index) => {
        if (item && item.toString() === value) {
          itemFound = item;
          return false; // Stop
        } else {
          return true; // Keep browser array
        }
      });
    });

    return itemFound;
  },

  // Get nol null item from 2d Arr
  getNotNullItemFrom2dArr(arr: string[]): string[] {
    return arr.filter((item) => item !== null);
  },

  // Get full original url from request
  getOriginalUrl(req: any, path?: string): string {
    if (path) {
      return `${req.protocol}://${req.get("host")}${path}`;
    }

    return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  },

  // Check expired time
  checkExpiredTime(expiredAt: string): boolean {
    if (moment(expiredAt) < moment(new Date())) {
      return true;
    }
    return false;
  },

  roundNumber(number: number, fractionDigits): number {
    return parseFloat(number.toFixed(fractionDigits));
  },

  // Support promise for old api library which don't support async/await
  promise(resources: any, action: string, params: any): any {
    return new Promise((resolve, reject) => {
      resources[action](params, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  },

  getDirectories(path: string): any {
    return crawlDirectories(path);
  },
  sortObject(o: object): object {
    var sorted = {},
      key,
      a = [];

    for (key in o) {
      if (o.hasOwnProperty(key)) {
        a.push(key);
      }
    }

    a.sort();

    for (key = 0; key < a.length; key++) {
      sorted[a[key]] = o[a[key]];
    }
    return sorted;
  },

  // escape regexp
  escapeRegexp(keyword: any): any {
    if (!keyword) {
      return keyword;
    }

    keyword = keyword.toString();

    return keyword.replace(/([.*+?=^!:${}()|[\]\/\\])/g, "\\$1");
  },

  // change time zone
  changeTimeZone(data: object): object {
    const fieldName = Object.keys(data);

    for (let i = 0; i < fieldName.length; i++) {
      if (_.isArray(data[fieldName[i]])) {
        data[fieldName[i]] = data[fieldName[i]].map((db) =>
          this.changeTimeZone(db)
        );
      } else {
        if (moment.isDate(data[fieldName[i]])) {
          data[fieldName[i]] = moment
            .utc(data[fieldName[i]])
            .local()
            .format();
        }
      }
    }

    return data;
  },
};

export default helpers;
