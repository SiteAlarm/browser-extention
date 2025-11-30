function init(xpathList, widjetHtml) {
    var sprintf = (str, ...argv) => !argv.length ? str : sprintf(str = str.replace("%s", argv.shift()), ...argv);
    // Search by expath
    const search = (xpath) => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    
    var xpathElement = null;
    var messagePartitialy = null;
    var messageNotFound = null;
    var messageCount = null;
    
    var index = 0;
    function clearHighlught() {
        var nodes = document.querySelectorAll('.sa-356a19.sa-2b791');
        for(var i = 0; i < nodes.length; ++i)
            nodes[i].classList.remove('sa-356a19', 'sa-2b791');
    }
    function isVisible(elem) {
            if (!(typeof elem.getBoundingClientRect === "function")) {
                return false;
            }
            // Проверяем позиционирование
            var position = elem.getBoundingClientRect();
            if (position.left+elem.offsetWidth < 0) return 1;
            if (position.left > document.documentElement.scrollWidth) return 2;
            if (position.top + elem.offsetHeight < 0) return 3;
            if (position.top > document.documentElement.scrollHeight) return 4;
            // Проверяем CSS свойства
            var curElem = elem;
            var opacity = 1;
            do {
                const style = getComputedStyle(curElem);
                if (style.display === 'none') return 5;
                if (style.visibility !== 'visible') return 6;
                opacity *= style.opacity;
                curElem = curElem.parentNode;
            } while (!(curElem instanceof HTMLDocument));
            if (opacity < 0.1) return 7;
            if (elem.offsetWidth + elem.offsetHeight + position.height + position.width === 0)
                return 8;
            return true;
        }
    function initWidjet() {
        var widjetElement = document.querySelector('#sa-hl-widjet');
        if(widjetElement === null) {
            document.body.insertAdjacentHTML('beforeend', widjetHtml);
        }
        // Почему-то при каждом вызове init старые переменные и обработчики удаляются
        xpathElement = document.querySelector('#sa-hl-widjet .sa-hl-xpath');
        messagePartitialy = document.querySelector('#sa-hl-widjet .sa-hl-message.sa-hl-paritialy');
        messageNotFound = document.querySelector('#sa-hl-widjet .sa-hl-message.sa-hl-not-found');
        messageInvisible = document.querySelector('#sa-hl-widjet .sa-hl-message.sa-hl-invisible');
        
        messageCount = document.querySelector('#sa-hl-widjet .sa-hl-count');
        var text = messageCount.getAttribute('message-count');
        messageCount.innerHTML = sprintf(text, 1, xpathList.length);
        
        document.querySelector('#sa-hl-widjet .sa-hl-close').addEventListener("click", function() {
            document.querySelector('#sa-hl-widjet').remove();
            clearHighlught();
        });
        document.querySelector('#sa-hl-widjet .sa-hl-prev').addEventListener("click", function() {
            --index;
            if(index < 0)
                index = xpathList.length - 1;
            hightlight(index);
        });
        document.querySelector('#sa-hl-widjet .sa-hl-next').addEventListener("click", function() {
            ++index;
            if(index >= xpathList.length)
                index = 0;
            hightlight(index);
        });
        hightlight(index);
    }
    function hightlight(index) {
        var searchXpath = xpathList[index].xpath;
        if(/[<>&]/.test(searchXpath)) return;
        xpathElement.innerHTML = searchXpath;
        messagePartitialy.style.display = "none";
        messageNotFound.style.display = "none";
        messageInvisible.style.display = "none";
        clearHighlught();
        var prevSearch = null;
        for(var i = 0; searchXpath !== prevSearch; ++i) {
            var e = search(searchXpath);
            prevSearch = searchXpath;
            searchXpath = searchXpath.replace(/([^\/])\/[^\/]+$/g, "$1");
            if(e === null) continue;
            e.scrollIntoView({block: "center"});
            e.classList.add('sa-356a19', 'sa-2b791');
            break;
        }
        var text = messageCount.getAttribute('message-count');
        messageCount.innerHTML = sprintf(text, index+1, xpathList.length);
        if(e === null) {
            xpathElement.innerHTML = '<div class="sa-hl-not-found-part">'+searchXpath+'</div>';
            messageNotFound.style.display = "block";
        } else {
            console.log(isVisible(e) );
            if(isVisible(e) !== true)
                messageInvisible.style.display = "block";
            if(i) {
                xpathElement.innerHTML = searchXpath+'<div class="sa-hl-not-found-part">'+xpathList[index].xpath.substr(searchXpath.length)+'</div>';
                messagePartitialy.style.display = "block";
            }
        }
    }
    if(document.readyState === 'complete')
        initWidjet();
    else
        window.onload = initWidjet;
}

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    function runTab(tab) {
        var widjetHtml = `<div id="sa-hl-widjet">
    <div class="sa-hl-close"></div>
    <div class="sa-hl-xpath"></div>
    <div class="sa-hl-message sa-hl-invisible">`+chrome.i18n.getMessage("xpathInvisible")+`</div>
    <div class="sa-hl-message sa-hl-paritialy">`+chrome.i18n.getMessage("xpathRartitialy")+`</div>
    <div class="sa-hl-message sa-hl-not-found">`+chrome.i18n.getMessage("xpathNotFound")+`</div>
    <div class="sa-hl-control">
        <div class="sa-hl-prev"></div>
        <div class="sa-hl-count" message-count="`+chrome.i18n.getMessage("elementCount", ['%s', '%s'])+`"></div>
        <div class="sa-hl-next"></div>
    </div>
</div>`;
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: init,
            args: [request.list, widjetHtml]// Crome 92+
        });
    }
    var [tab] = await chrome.tabs.query({url: request.url});
    if(typeof tab === 'undefined') {
        chrome.tabs.create({url: request.url}, tab => {
            chrome.tabs.onUpdated.addListener(function _(tabId, info, tab) {
                if (tabId === tab.id && info.url) {
                    chrome.tabs.onUpdated.removeListener(_);
                    runTab(tab);
                }
            });
        });
    } else {
        chrome.tabs.update(tab.id, {active: true});
        runTab(tab);
    }
});