"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSystem = checkSystem;
const os_1 = __importDefault(require("os"));
async function checkSystem() {
    const cpus = os_1.default.cpus();
    const totalMemory = os_1.default.totalmem();
    const freeMemory = os_1.default.freemem();
    const info = {
        cpu: cpus[0].model,
        cores: cpus.length,
        memoryTotalGB: Math.round(totalMemory / (1024 ** 3)),
        memoryFreeGB: Math.round(freeMemory / (1024 ** 3)),
        platform: process.platform,
        isCompatible: true
    };
    // Basic compatibility check (e.g., Remotion needs at least 8GB RAM recommended)
    if (info.memoryTotalGB < 4) {
        info.isCompatible = false;
    }
    return info;
}
//# sourceMappingURL=system-check.js.map