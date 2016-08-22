var configureMainLeftColumnKeyListView = function (keys) {
    if ($('#page-main-left-column > .panel.panel-default > .panel-body > ul').children()) {
        $('#page-main-left-column > .panel.panel-default > .panel-body > ul').empty();
    }

    if (keys.length > 0) {
        for (var i = 0; i < keys.length; i++) {
            var id = "redisKey-" + keys[i].hexEncode();
            $('#page-main-left-column > .panel.panel-default > .panel-body > ul').append(templateImport('#key-selection-template', { id: id, key: keys[i] }));

            // selection of key
            $("#" + id).on("click", function () {
                var key = $(this).text();

                showProgressBar("Key info. loading...");
                fetchKey(key).done(function (keyInfo) {
                    showKeyInfo(keyInfo);
                }).fail(function () {
                    showNotificationMessage(ALERT_FAILURE, "Fail!", "Fail to get the key.")
                });
            });

            configureNumberOfKeysView(keys.length);
        }
    } else {
        configureNumberOfKeysView(0);
    }
}

var configureNumberOfKeysView = function (numKeys) {
    $('#page-main-left-column > div.panel.panel-default > div.panel-footer').text(numKeys + "keys");
}

var refreshKeyListView = function () {
    var userInputKeyPattern = $('#input-search-key').val();
    var currentKeyPattern = "*" + userInputKeyPattern + "*";

    showProgressBar("Refreshing keys...");

    searchKey(currentKeyPattern).done(function (keys) {
        configureMainLeftColumnKeyListView(keys);
        if (selectedKey.getKey()) {
            var selectedKeyId = "#redisKey-" + selectedKey.getKey().hexEncode();
            $(selectedKeyId).trigger("click");
        } else {
            // todo modify the function
            showDBInfo();
        }
        $('#progressbar-indeterminate').remove();
    }).fail(function () {
        showNotificationMessage(ALERT_FAILURE, "Failure!", "Fail to get the keys with the " + userInputKeyPattern);
        $('#progressbar-indeterminate').remove();
    });
}

$(document).ready(function () {
    $('#btn-search-key').on("click", function () {
        var userInputKeyPattern = $('#input-search-key').val();
        showProgressBar("Searching for " + userInputKeyPattern + "...");
        searchKey("*" + userInputKeyPattern + "*").done(function (keys) {
            configureMainLeftColumnKeyListView(keys);
            if (keys.length === 0) {
                console.log("no keys found");
                showNoResultMessage(userInputKeyPattern);
                return;
            }

            if (selectedKey.getKey()) {
                var selectedKeyId = "#redisKey-" + selectedKey.getKey().hexEncode();
                $(selectedKeyId).trigger("click");
            } else {
                /////////////////////
                showDBInfo();
            }
        }).fail(function () {
            showNotificationMessage(ALERT_FAILURE, "Failure!", "Fail to get the keys with the [" + userInputKeyPattern + "]");
        })
    });

    // if user presses enter key, when the cursor is on the input text
    // for searching key, it will search keys related to the text typed in the input text 
    $('#input-search-key').on("keyup", function (event) {
        if (event.keyCode === 13) {
            $('#btn-search-key').trigger("click");
        }
    });

    // refresh key list button
    $('#page-main-left-column > #btn-refresh-key-list').on("click", function (event) {
        refreshKeyListView();
    });
});