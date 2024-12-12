"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromatData = exports.isEmptyValue = exports.removeEmptyValue = exports.buildQueryString = exports.createRequest = void 0;
const sync_request_1 = __importDefault(require("sync-request"));
const createRequest = (config) => {
    const { baseURL, method, url, headers } = config;
    return sync_request_1.default(method, `${baseURL}${url}`, { headers });
};
exports.createRequest = createRequest;
const stringifyKeyValuePair = ([key, value]) => {
    return `${key}=${encodeURIComponent(value)}`;
};
const removeEmptyValue = (obj) => {
    if (!(obj instanceof Object))
        return {};
    Object.keys(obj).forEach(key => isEmptyValue(obj[key]) && delete obj[key]);
    return obj;
};
exports.removeEmptyValue = removeEmptyValue;
const isEmptyValue = (input) => {
    /**
     * input is considered empty value: falsy value (like null, undefined, '', except false and 0),
     * string with white space characters only, empty array, empty object
     */
    return (!input && input !== false && input !== 0) ||
        ((input instanceof String || typeof input === 'string') && !input.trim()) ||
        (Array.isArray(input) && !input.length) ||
        (input instanceof Object && !Object.keys(input).length);
};
exports.isEmptyValue = isEmptyValue;
const buildQueryString = (params) => {
    if (!params)
        return '';
    return Object.entries(params)
        .map(stringifyKeyValuePair)
        .join('&');
};
exports.buildQueryString = buildQueryString;
const fromatData = (datas) => {
    if (Array.isArray(datas)) {
        return datas.map((data) => {
            return fromatData(data);
        });
    }
    else if (typeof datas === "object" && datas !== null) {
        const newObj = {};
        Object.entries(datas).map(([key, value]) => newObj[key] = fromatData(value));
        return newObj;
    }
    else {
        return (datas === undefined || datas === null) ? "" : datas;
    }
};
exports.fromatData = fromatData;
