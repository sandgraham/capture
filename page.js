var originalOverflowStyle, originalX, originalY;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'createArrangements') createArrangements(sendResponse);
    if (message.action === 'scrollPage') scrollPage(message.x, message.y, sendResponse);
    if (message.action === 'cleanUp') cleanUp();
});

function scrollPage(x, y, sendResponse) {
    window.scrollTo(x, y);
    sendResponse();
}

function cleanUp() {
    document.documentElement.style.overflow = originalOverflowStyle;
    window.scrollTo(originalX, originalY);
}

function max(nums) {
    return Math.max.apply(Math, nums.filter(function(x) { return x; }));
}

// return page data and arrangements to popup.js
function createArrangements(sendResponse) {
    var body = document.body,
        widths = [
            document.documentElement.clientWidth,
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.offsetWidth
        ],
        heights = [
            document.documentElement.clientHeight,
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
        ],
        fullWidth = max(widths),
        fullHeight = max(heights),
        windowWidth = window.innerWidth,
        windowHeight = window.innerHeight,
        arrangements = [],
        // pad the vertical scrolling to try to deal with
        // sticky headers, 250 is an arbitrary size
        scrollPad = 250,
        yDelta = windowHeight - (windowHeight > scrollPad ? scrollPad : 0),
        xDelta = windowWidth,
        yPos = fullHeight - windowHeight,
        xPos;

    // During zooming, there can be weird off-by-1 types of things...
    if (fullWidth <= xDelta + 1) {
        fullWidth = xDelta;
    }

    originalX = window.scrollX;
    originalY = window.scrollY;
    originalOverflowStyle = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    while (yPos > -yDelta) {
        xPos = 0;
        while (xPos < fullWidth) {
            arrangements.push([xPos, yPos]);
            xPos += xDelta;
        }
        yPos -= yDelta;
    }

    sendResponse({
        arrangements: arrangements,
        pageData: {
            totalWidth: fullWidth,
            totalHeight: fullHeight,
            devicePixelRatio: window.devicePixelRatio
        }
    });
}
