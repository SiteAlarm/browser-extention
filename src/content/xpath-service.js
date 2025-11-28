document.querySelector('body').setAttribute('sa-extention', true);

document.addEventListener('click', async function(event) {
    console.log(event.target);
    if (event.target.id === 'sa-extention-show-btn') {
        var data = event.target.getAttribute('data-xpath');
        data = JSON.parse(data);
        data['action'] = "highlight";
        chrome.runtime.sendMessage(data)
            .then(function() {})
            .catch(function(error) {
                console.log(error);
            });
    }
});