var fetchDBList = function() {
    return $.ajax({
        method: 'GET',
        url: '/dbList'
    });
}

var selectDB = function(dbNum) {
    return $.ajax({
        method: 'GET',
        url: '/dblist/' + dbNum
    });
}

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

var fetchKey = function (key) {
    return $.ajax({
        method: "GET",
        url: "/keys/" + encodeURIComponent(key),
        dataType: "json"
    })
}

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

var deleteKey = function (key) {
    return $.ajax({
        method: "DELETE",
        url: "/keys/" + key,
    });
}

var renameKey = function (keyName, newKeyName) {
    return $.ajax({
        method: "PUT",
        url: "/keys/" + keyName + "/name",
        data: { newKey: newKeyName }
    });
}

var fetchServerInfo = function () {
    return $.ajax({
        method: 'GET',
        url: '/serverinfo',
        dataType: "json"
    });
}