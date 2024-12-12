"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserData = void 0;
const common_1 = require("./common");
const util_1 = require("../util");
class UserData extends common_1.Common {
    /**
     * Account Information
     *
     * @returns
     */
    accountInfo() {
        const res = this.signRequest('GET', '/account');
        const rawData = JSON.parse(res.getBody());
        const formatDatas = util_1.fromatData(rawData);
        return formatDatas;
    }
    /**
     * Account Trade List
     *
     * @param symbol
     * @param options
     * ```
     * [options.orderId] - This can only be used in combination with symbol.
     * [options.startTime]
     * [options.endTime]
     * [options.fromId] - TradeId to fetch from. Default gets most recent trades.
     * [options.limit] - default: 500, Max: 1000
     * ```
     * @returns
     */
    accountTradeList(symbol, options = { limit: 500 }) {
        const res = this.signRequest('GET', '/myTrades', Object.assign(options, {
            symbol: symbol.toUpperCase()
        }));
        const rawData = JSON.parse(res.getBody());
        const formatDatas = util_1.fromatData(rawData);
        return formatDatas;
    }
}
exports.UserData = UserData;
