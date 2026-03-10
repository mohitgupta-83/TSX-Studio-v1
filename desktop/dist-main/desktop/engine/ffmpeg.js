"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFFmpegPath = getFFmpegPath;
exports.getFFprobePath = getFFprobePath;
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const ffprobe_static_1 = __importDefault(require("ffprobe-static"));
const electron_1 = require("electron");
function getFFmpegPath() {
    const isDev = !electron_1.app.isPackaged && process.env.NODE_ENV === 'development';
    if (isDev) {
        return ffmpeg_static_1.default;
    }
    // In production, Electron moves unpacked binaries to app.asar.unpacked
    // We must point to that location or the binary won't execute
    return ffmpeg_static_1.default.replace('app.asar', 'app.asar.unpacked');
}
function getFFprobePath() {
    const isDev = !electron_1.app.isPackaged && process.env.NODE_ENV === 'development';
    const binaryPath = ffprobe_static_1.default.path;
    if (isDev) {
        return binaryPath;
    }
    // Fix for production unpacked ASAR
    return binaryPath.replace('app.asar', 'app.asar.unpacked');
}
//# sourceMappingURL=ffmpeg.js.map