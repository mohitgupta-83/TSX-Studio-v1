"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInTemplates = void 0;
exports.getTemplateById = getTemplateById;
exports.getAllTemplates = getAllTemplates;
const viral_caption_1 = require("./templates/viral-caption");
const startup_story_1 = require("./templates/startup-story");
const motivation_quote_1 = require("./templates/motivation-quote");
exports.builtInTemplates = [
    viral_caption_1.viralCaptionTemplate,
    startup_story_1.startupStoryTemplate,
    motivation_quote_1.motivationQuoteTemplate
];
function getTemplateById(id) {
    return exports.builtInTemplates.find(t => t.id === id);
}
function getAllTemplates() {
    return exports.builtInTemplates;
}
//# sourceMappingURL=registry.js.map