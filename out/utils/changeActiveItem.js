"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var gapTimeout = null;
function changeActiveItem(quickPick, index, bottomGap = 6, timeout = 10) {
    index++;
    if (gapTimeout !== null) {
        clearTimeout(gapTimeout);
    }
    if (quickPick.items.length <= 0) {
        return null;
    }
    if (index < 0) {
        return null;
    }
    if (index >= quickPick.items.length) {
        quickPick.activeItems = [quickPick.items[quickPick.items.length - 1]];
        return null;
    }
    var gap = bottomGap;
    if ((index + gap) > quickPick.items.length - 1) {
        gap = quickPick.items.length - (index + 1);
    }
    quickPick.activeItems = [quickPick.items[index + gap]];
    if (gap && gap > 0 && timeout) {
        gapTimeout = setTimeout(function () {
            quickPick.activeItems = [quickPick.items[index]];
        }, timeout);
    }
}
;
exports.default = changeActiveItem;
//# sourceMappingURL=changeActiveItem.js.map