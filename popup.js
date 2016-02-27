var screenshot,
    contentUrl = '',
    arrangements,
    pageData,
    tab;

function downloadImage() {
    var dataURI = screenshot.canvas.toDataURL();
    var byteString = atob(dataURI.split(',')[1]);
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    var blob = new Blob([ab], {type: mimeString});
    var size = blob.size + (1024/2);
    var name = contentUrl.split('?')[0].split('#')[0];
    if (name) {
        name = name
            .replace(/^https?:\/\//, '')
            .replace(/[^A-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^[_\-]+/, '')
            .replace(/[_\-]+$/, '');
        name = '-' + name;
    } else {
        name = '';
    }
    name = 'screencapture' + name + '-' + Date.now() + '.png';

    function onwriteend() {
        chrome.downloads.download({url: 'filesystem:chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/temporary/' + name})
    }

    function errorHandler() {
        console.log('error creating image for download')
    }

    window.webkitRequestFileSystem(window.TEMPORARY, size, function(fs){
        fs.root.getFile(name, {create: true}, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = onwriteend;
                fileWriter.write(blob);
            }, errorHandler);
        }, errorHandler);
    }, errorHandler);
}

function processArrangements() {
    if (!arrangements.length) {
        downloadImage();
        chrome.tabs.sendMessage(tab.id, {action: 'cleanUp'});
        return;
    }

    var next = arrangements.shift();

    chrome.tabs.sendMessage(tab.id, {action: 'scrollPage', x:next[0], y:next[1]}, null, function(response) {
        setTimeout(function(){
            captureArrangement(next[0], next[1]);
        }, 250);
    });
}

function captureArrangement(x, y) {
    var scale = pageData.devicePixelRatio && pageData.devicePixelRatio !== 1 ? 1 / pageData.devicePixelRatio : 1;

    if (scale !== 1) {
        x = x / scale;
        y = y / scale;
        pageData.totalWidth = pageData.totalWidth / scale;
        pageData.totalHeight = pageData.totalHeight / scale;
    }

    if (!screenshot.canvas) {
        var canvas = document.createElement('canvas');
        canvas.width = pageData.totalWidth;
        canvas.height = pageData.totalHeight;
        screenshot.canvas = canvas;
        screenshot.ctx = canvas.getContext('2d');
    }

    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
        if (dataUrl) {
            var image = new Image();
            image.onload = function() {
                screenshot.ctx.drawImage(image, x, y);
                processArrangements();
            };
            image.src = dataUrl;
        }
    });
}

document.getElementById('start').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        tab = tabs[0];

        chrome.tabs.executeScript(null, {file: 'page.js'}, function(result) {
            screenshot = {};
            contentUrl = tab.url;

            chrome.tabs.sendMessage(tab.id, {action: 'createArrangements'}, null, function(response) {
                arrangements = response.arrangements;
                pageData = response.pageData;

                processArrangements();
            });
        });
    });
});
