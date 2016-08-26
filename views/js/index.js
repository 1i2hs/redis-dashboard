String.prototype.hexEncode = function () {
    var hex, i;

    var result = "";
    for (i = 0; i < this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += hex.slice(-4);
    }

    return result;
}

String.prototype.hexDecode = function () {
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for (j = 0; j < hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

/* gets parameter from url */
var getParameterByName = function (name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/* shows log message in the System Log panel at the bottom of the window */
var showLog = function (logMessage) {
    if ($('#well-system-log').children() > 100) {
        $('#well-system-log').first().remove();
    }
    $('#well-system-log').append("<div>" + logMessage + "</div>");
    $('#well-system-log').scrollTop($('#well-system-log').prop("scrollHeight"));
}

/* changes value input template when the user tries to add a new key of certain data type */
var changeValueInputTemplate = function (dataType) {
    var templates = [];
    var contexts = [];

    if ($('.modal-body').children().length > 2) {
        $('.modal-body').children(".section-value").remove();
    }

    switch (dataType) {
        case "Sorted set":
            templates.push("#sorted-set-value-input-template");
            contexts.push({
                label: "Value"
            });
            break;
        case "Hash":
            templates.push("#hash-value-input-template");
            contexts.push({});
            break;
        default:
            templates.push("#simple-value-input-template");
            contexts.push({
                label: "Value"
            });
            break;
    }

    $('.modal-body').append(combineRenderedHtmlStrings(templates, contexts));
    $('#modal-add-key .form-control').prop('disabled', false);
    $('#modal-add-key .btn-value-mgmt > span.dropdown > ul.dropdown-menu > li > a').on("click", function (event) {
        applyChangeValueViewFormat($(this));
    });
}

var initDashBoardView = function () {
    showProgressBar("Fetching DB list...");
    fetchDBList().done(function (result) {
        console.log(result);
        showProgressBar("Changing DB...");
        $('.btn-change-db > .dropdown > ul.dropdown-menu').empty();
        // 16 is the default number of DBs inside redis server
        for (var i = 0; i < result.totalDBNum; i++) {
            $('.btn-change-db > .dropdown > ul.dropdown-menu').append(
                templateImport('#db-dropdown-list-template', {
                    dbNum: i
                })
            );
        }

        /* dropdown list to change current DB */
        $('#btn-home + .btn-change-db > .dropdown > .dropdown-menu > li > a').on("click", function (event) {
            _currentDBNum = $(this).text().substring(2);

            showProgressBar("Changing DB...");
            selectDB(_currentDBNum).done(function (result) {
                $('#btn-home + .btn-change-db > .dropdown > .btn-default').html("db" + _currentDBNum + "<span class=\"caret\"></span>");
                dismissProgressBar();
                if (result === "OK") {
                    /* get new key list from newly selected DB */
                    initDashBoardView();
                }
            }).fail(function (err) {
                dismissProgressBar();
                showNotificationMessage(ALERT_FAILURE, "Failure!", "Server error. Fail to select the DB");
            });
        });

        /* shows db info page */
        selectDB(_currentDBNum).done(function (result) {
            showServerInfo();

            /* list all keys */
            showProgressBar("Fetching keys...");
            searchKey('*').then(function (keys) {
                dismissProgressBar();
                configureMainLeftColumnKeyListView(keys);
            }).fail(function () {
                dismissProgressBar();
                showNotificationMessage(ALERT_FAILURE, "Failure!", "Fail to get keys from the server");
            });
        }).fail(function (err) {
            dismissProgressBar();
            showNotificationMessage(ALERT_FAILURE, "Failure!", "Fail to select db0");
        });
    }).fail(function (err) {
        dismissProgressBar();
        showNotificationMessage(ALERT_FAILURE, "Failure!", "Server error. Fail to fetch the DB list");
    });
}

/* temporary global variable */
var _token;
var _currentDBNum = "0";

$(document).ready(function () {
    /* constants */
    const PAGE_TITLE_HEIGHT = $('#page-title').height();
    const FILTER_INPUT_HEIGHT = $('#page-main-left-column > .input-group').height();
    const ADD_KEY_BUTTON_HEIGHT = $('#page-main-left-column > button.btn.btn-primary').height();
    const KEY_LIST_FOOTER_HEIGHT = $('#page-main-left-column > .panel > .panel-footer').height();
    const MIN_KEY_LIST_PANEL_HEIGHT = $(window).height() - (PAGE_TITLE_HEIGHT
        + FILTER_INPUT_HEIGHT + ADD_KEY_BUTTON_HEIGHT + KEY_LIST_FOOTER_HEIGHT + 140); // total margins used in left column === 140

    $('#alert-key-event').css("right", $(".container").css("margin-right"));

    /* clicking title("Redis Dashboard") at the top of the page */
    $('#btn-home > a').on("click", function (event) {
        window.location.replace(window.location.protocol + "//" + window.location.host + "/?token="
            + _token);
    });

    $('#modal-add-key > .modal-dialog > .modal-content > .modal-footer > button.btn.btn-primary').on("click", function (event) {
        var newKeyInfo = {};

        newKeyInfo.key = $('#modal-add-key > .modal-dialog > .modal-content > .modal-body > .section-key > div > .textarea-key').val();
        newKeyInfo.dataType = $('#modal-add-key > .modal-dialog > .modal-content > .modal-body > .section-data-type > .btn-data-type-mgmt > span.dropdown > button').text().trim();

        switch (newKeyInfo.dataType) {
            case "Sorted set":
                newKeyInfo.score = $('#modal-add-key .input-group-score-mgmt > input').val();
                newKeyInfo.value = changeValueViewFormat($('#modal-add-key .section-value > div > .textarea-value').val(), "Plain Text");
                break;
            case "Hash":
                newKeyInfo.hashField = changeValueViewFormat($('#modal-add-key > .modal-dialog > .modal-content > .modal-body > .section-value > div > .textarea-hash-field').val(), "Plain Text");
                newKeyInfo.hashValue = changeValueViewFormat($('#modal-add-key > .modal-dialog > .modal-content > .modal-body > .section-value > div > .textarea-hash-value').val(), "Plain Text");
                break;
            default:
                newKeyInfo.value = changeValueViewFormat($('#modal-add-key > .modal-dialog > .modal-content > .modal-body > .section-value > div > .textarea-value').val(), "Plain Text");
                break;
        }

        $('.modal-footer > .glyphicon-refresh.small-progress').show();
        addKey(newKeyInfo).done(function (result) {
            if (result === "OK") {
                refreshKeyListView($('#input-search-key').val());
                $('#modal-add-key').modal('hide');
                showNotificationMessage(ALERT_SUCCESS, "Success!", "The key has been added successfully.");
            } else {
                $('.text-error-message').text("The key with the given name already exists.").show();
            }
            $('.modal-footer > .glyphicon-refresh.small-progress').hide();
        }).fail(function (jqXHR, textStatus, error) {
            $('.text-error-message').text(error).show();
            $('.modal-footer > .glyphicon-refresh.small-progress').hide();
        });
    });

    // add key button
    $('#modal-add-key').on('show.bs.modal', function (event) {
        var clickedElementId = event.relatedTarget.id;
        $('#modal-add-key > .modal-dialog > .modal-content > .modal-body > .section-key > div > textarea.textarea-key').val("");
        $('#modal-add-key > .modal-dialog > .modal-content > .modal-body > .section-data-type > div > span.dropdown > button').html("String <span class=\"caret\"></span>");
        $('.modal-footer > .glyphicon-refresh.small-progress').hide();
        $('.text-error-message').hide();

        changeValueInputTemplate("String");
    });

    $('.btn-data-type-mgmt > .dropdown > .dropdown-menu > li > a').on("click", function (event) {
        var clickedElement = $(this);
        $('.btn-data-type-mgmt > .dropdown > button').html($(this).text() + "<span class=\"caret\"></span>");
        console.log($(this).text());
        changeValueInputTemplate($(this).text());
    });


    var socket = io();

    socket.on('redis_server_log_message', function (logMessage) {
        showLog(logMessage);
    });

    socket.on('socketKey', function (socketKey) {
        console.log("GOT key: " + socketKey.key);
        $.ajaxSetup({
            headers: { 'x-socket-io-key': socketKey.key }
        });


        _token = getParameterByName('token');

        socket.emit('create_redis_client', _token);
    });

    socket.on('redis_client_created', function (result) {
        if (result.statusCode === 200) {
            /* initialize db list */
            initDashBoardView();

        } else {
            showLargeErrorMessage("Invalid Token : unauthorized access");
        }
    });

    $('#page-main-left-column > .panel > .panel-body').height(MIN_KEY_LIST_PANEL_HEIGHT);

});