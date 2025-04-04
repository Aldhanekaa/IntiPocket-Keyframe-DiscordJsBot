const fs = require('fs');

/**
 *
 * @param {Record<string, Array>} obj
 * @param {string} key
 * @param {string|Array<any>} value
 * @returns {Record<string, Array>}
 */
function ObjKeyArrayValueUpdate(obj, key, value) {
    if (key in obj == false) {
        obj[key] = [];
    }

    // console.log(obj[key]);
    if (typeof value == 'string') {
        let indexOf = obj[key].indexOf(value);
        if (indexOf == -1) {
            obj[key].push(value);
        }
    } else {
        obj[key].push(...value);
    }
    // console.log(obj[key]);

    return obj;
}

/**
 *
 * @param {Record<string, Array>} obj
 * @param {string} key
 * @param {string|Array<any>} value
 * @returns {Record<string, Array>}
 */
function ObjKeyArrayValueReplace(obj, key, value) {
    if (!(key in obj)) {
        obj[key] = [];
    }

    // console.log(obj[key]);
    if (typeof value == 'string') obj[key] = [value];
    else {
        obj[key] = value;
    }
    // console.log(obj[key]);

    return obj;
}

/**
 *
 * @param {Record<string,Array>} obj
 * @param {string} key
 * @param {string|Array<string>} value
 */
function ObjKeyArrayValueDelete(obj, key, value) {
    if (!(key in obj)) {
        obj[key] = [];
    }

    if (key in obj) {
        let arrOld = [...obj[key]];
        let newArr = arrOld;

        if (typeof value == 'string') {
            const index = arrOld.indexOf(value);
            if (index != -1) {
                newArr = [...arrOld.slice(0, index), ...arrOld.slice(index + 1)];
            }
        } else {
            for (let i = 0; i < value.length; i++) {
                const scopeVal = value[i];
                const index = arrOld.indexOf(scopeVal);

                if (index != -1) {
                    newArr = [...arrOld.slice(0, index), ...arrOld.slice(index + 1)];
                    arrOld = newArr;
                }
            }
        }
        obj[key] = newArr;

        return obj;
    }

    return obj;
}

function updateJSON(filePath, newData) {
    // 1. get the json data
    // This is string data
    // console.log(filePath);
    const fileData = fs.readFileSync(filePath, 'utf8');
    // Use JSON.parse to convert string to JSON Object
    let jsonData = JSON.parse(fileData);

    // 2. update the value of one key
    jsonData = newData;

    // 3. write it back to your json file
    fs.writeFileSync(filePath, JSON.stringify(jsonData));
}

module.exports = {
    updateJSON,
    ObjKeyArrayValueUpdate,
    ObjKeyArrayValueDelete,
    ObjKeyArrayValueReplace,
};