var searchKey = function (pattern) {
    return $.ajax({
        method: 'GET',
        url: '/keys',
        data: { "pattern": pattern }
    });
}

var addKey = function (newKeyInfo) {
    return $.ajax({
        method: "POST",
        url: "/keys",
        data: newKeyInfo
    });
}
///////////////////////////////////
var onKeyAdded = function (result) {
    if (result === "OK") {
        refreshKeyListView();
        $('#modal-add-key').modal('hide');
        showNotificationMessage(ALERT_SUCCESS, "Success!", "The key has been added successfully.");
    } else {
        $('.text-error-message').text("The key with the given name already exists.").show();
    }
    $('.modal-footer > .glyphicon-refresh.small-progress').hide();
}

var onKeyNotAdded = function (jqXHR, textStatus, error) {
    $('.text-error-message').text(error).show();
    $('.modal-footer > .glyphicon-refresh.small-progress').hide();
}

///////////////////////////////////

var fetchKey = function (key) {
    return $.ajax({
        method: "GET",
        url: "/keys/" + key,
        dataType: "json"
    })
}


/////////////////////////////////
//TODO later
var onKeyFetched = function (keyInfo) {
    selectedKey.setKey(keyPageData.key);
    selectedKey.setDataType(keyPageData.dataType);
    selectedKey.setValue(keyPageData.value);
    selectedKey.setTtl(keyPageData.ttl);
}

var onKeyNotFetched = function () {
    showNotificationMessage(ALERT_FAILURE, "Fail!", "Fail to get the keys.")
}
/////////////////////////////////

var saveKey = function (modifiedKeyInfo) {
    return $.ajax({
        method: "PUT",
        url: "/keys/" + modifiedKeyInfo.getKey(),
        data: {
            key: modifiedKeyInfo.getKey(),
            dataType: modifiedKeyInfo.getDataType(),
            value: modifiedKeyInfo.getValue(),
            ttl: modifiedKeyInfo.getTtl()
        },
        success: function (result) {

        },
        error: function (jqXHR, textStatus, error) {

        }
    });
}

////////////////////////////////////////
var onKeySaved = function (result) {
    console.log(result);
    showNotificationMessage(ALERT_SUCCESS, "Success!", "The key's info. has been saved successfully.");
}

var onKeyNotSaved = function () {
    console.log(textStatus + ": " + error);
    showNotificationMessage(ALERT_SUCCESS, "Failure!", "Fail to save the key's info.");
}
////////////////////////////////////////

var deleteKey = function (key) {
    return $.ajax({
        method: "DELETE",
        url: "/keys/" + key,
    });
}
///////////////////////////////////////
var onKeyDeleted = function (result) {
    console.log(result);
    showNotificationMessage(ALERT_SUCCESS, "Success!", "The key has been deleted successfully.");
}

var onKeyNotDeleted = function (jqXHR, textStatus, error) {
    console.log(textStatus + ": " + error);
    showNotificationMessage(ALERT_SUCCESS, "Failure!", "Fail to delete the key.");
}

////////////////////////////////////////

var renameKey = function (keyName, newKeyName) {
    return $.ajax({
        method: "PUT",
        url: "/keys/" + keyName + "/name",
        data: { newKey: newKeyName }
    });
}

///////////////////////////////////////////
var onKeyRenamed = function (result) {
    console.log(result);
    selectedKey.setKey(newKeyName);
    refreshKeyListView();
    refreshKeyInfo();
}

var onKeyNotRenamed = function (jqXHR, textStatus, error) {
    console.log(textStatus + ": " + error);
}
///////////////////////////////////////////

var fetchDBInfo = function () {
    return $.ajax({
        method: 'GET',
        url: '/dbinfo',
    });
}