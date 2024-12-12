"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spot = void 0;
const trade_1 = require("./trade");
class Spot extends trade_1.Trade {
    constructor(apiKey = '', apiSecret = '') {
        super(apiKey, apiSecret);
    }
}
exports.Spot = Spot;
