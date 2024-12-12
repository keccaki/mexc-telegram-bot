"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Common = void 0;
const market_1 = require("./market");
class Common extends market_1.Market {
    /**
     * Test Connectivity
     */
    ping() {
        const res = this.publicRequest('GET', '/ping');
        return JSON.parse(res.getBody());
    }
    /**
     * Check Server Time
     */
    time() {
        const res = this.publicRequest('GET', '/time');
        return JSON.parse(res.getBody());
    }
}
exports.Common = Common;
