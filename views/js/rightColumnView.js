const ROW_NO_CHANGE = -1;
const ROW_ADDED = 0;
const ROW_DELETED = 1;
const ROW_MODIFIED = 2;

var Key = (function () {
    var Key = function () {
        this.key = "";
        this.dataType = "";
        this.value = null;
        this.modifiedValue = [];
        this.ttl = -1;
        this.currentRow = null;
        this.rows = [];
        this.targetElement = null;
    }

    Key.prototype.setKey = function (key) {
        this.key = key;
    }

    Key.prototype.getKey = function () {
        return this.key;
    }

    Key.prototype.setDataType = function (dataType) {
        this.dataType = dataType;
    }

    Key.prototype.getDataType = function () {
        return this.dataType;
    }

    Key.prototype.setValue = function (value) {
        this.value = value;
    }

    Key.prototype.getValue = function () {
        return this.value;
    }

    Key.prototype.pushModifiedValue = function (value) {
        if (!this.modifiedValue) {
            this.modifiedValue = [];
        }
        this.modifiedValue.push(value);
    }

    Key.prototype.getModifiedValue = function () {
        return this.modifiedValue;
    }

    Key.prototype.setTtl = function (ttl) {
        this.ttl = ttl;
    }

    Key.prototype.getTtl = function () {
        return this.ttl;
    }

    Key.prototype.setCurrentRow = function (currentRow) {
        this.currentRow = currentRow;
    }

    Key.prototype.getCurrentRow = function () {
        return this.currentRow;
    }

    Key.prototype.setRows = function (rows) {
        this.rows = rows;
    }

    Key.prototype.pushRow = function (row) {
        if (!this.rows) {
            this.rows = [];
        }
        this.rows.push(row);
    }

    Key.prototype.getRows = function () {
        return this.rows;
    }

    Key.prototype.getRow = function (index) {
        return this.rows[index];
    }

    Key.prototype.setTargetElement = function (element) {
        this.targetElement = element;
    }

    Key.prototype.getTargetElement = function () {
        return this.targetElement;
    }

    Key.prototype.init = function () {
        this.key = "";
        this.dataType = "";
        this.value = null;
        this.modifiedValue = [];
        this.ttl = -1;
        this.currentRow = null;
        this.rows = [];
        this.targetElement = null;
    }

    return Key;
})();

var selectedKey = new Key();

var Row = (function () {
    var Row = function () {
        this.index = 0;
        this.value = null;
        this.score = -1;
        this.hashField = null;
        this.hashValue = null;
        this.originalHashField = null;
        this.originalHashValue = null;
        this.targetElement = null;
        this.status = 0;
    }

    Row.prototype.setIndex = function (index) {
        this.index = index;
    }

    Row.prototype.getIndex = function () {
        return this.index;
    }

    Row.prototype.setValue = function (value) {
        this.value = value;
    }

    Row.prototype.getValue = function () {
        return this.value;
    }

    Row.prototype.setScore = function (score) {
        this.score = score;
    }

    Row.prototype.getScore = function () {
        return this.score;
    }

    Row.prototype.setHashField = function (hashField) {
        this.hashField = hashField
    }

    Row.prototype.getHashField = function () {
        return this.hashField;
    }

    Row.prototype.setOriginalHashField = function (originalHashField) {
        this.originalHashField = originalHashField
    }

    Row.prototype.getOriginalHashField = function () {
        return this.originalHashField;
    }

    Row.prototype.setHashValue = function (hashValue) {
        this.hashValue = hashValue
    }

    Row.prototype.getHashValue = function () {
        return this.hashValue;
    }

    Row.prototype.setOriginalHashValue = function (originalHashValue) {
        this.originalHashValue = originalHashValue;
    }

    Row.prototype.getOriginalHashValue = function () {
        return this.originalHashValue;
    }

    Row.prototype.setStatus = function (status) {
        this.status = status;
    }

    Row.prototype.getStatus = function () {
        return this.status;
    }

    Row.prototype.setTargetElement = function (targetElement) {
        this.targetElement = targetElement;
    }

    Row.prototype.getTargetElement = function () {
        return this.targetElement;
    }

    return Row;
})();

var showServerInfo = function () {
    showProgressBar("Loading DB data...");
    fetchServerInfo().done(function (result) {
        dismissProgressBar();
        console.log(result);
        $('#page-main-right-column').empty();
        $('#page-main-right-column').append(templateImport('#server-info-template',
            {
                numConnections: result.connections,
                usedMemory: result.usedMemory,
                dbNum: result.dbNum,
                totalKeys: result.totalKeys,
                expires: result.expires
            }
        ));

    }).fail(function () {
        dismissProgressBar();
        showNotificationMessage(ALERT_FAILURE, "Fail!", "Fail to get server info from the server");
    });
}


var showKeyInfo = function (keyInfo) {
    selectedKey.setKey(keyInfo.key);
    selectedKey.setDataType(keyInfo.dataType);
    selectedKey.setValue(keyInfo.value);
    selectedKey.setTtl(keyInfo.ttl);

    $('#page-main-right-column').removeClass();
    $('#page-main-right-column').addClass("col-sm-9 col-xs-12 " + keyInfo.dataType + "-type");

    var selectedKeyId = "#redisKey-" + keyInfo.key.hexEncode();

    if (selectedKey.getTargetElement()) {
        selectedKey.getTargetElement().attr("selected", null);
    }

    $(selectedKeyId).attr("selected", true);

    // modifies currently selected key element
    selectedKey.setTargetElement($(selectedKeyId));
    selectedKey.setCurrentRow(null);
    selectedKey.setRows(null);

    changeHtmlTemplateAndShowData(keyInfo);

    adjustInputHeight(keyInfo.dataType);
}

var changeHtmlTemplateAndShowData = function (keyInfo) {
    $('#page-main-right-column').empty();
    var templates = ["#key-info-header-template"];
    var contexts = [];
    var headerTemplateContext = {
        key: keyInfo.key,
        dataType: keyInfo.dataType,
        ttl: keyInfo.ttl
    };

    var rowTemplateContext = {};
    var rows = [];

    var valueInputTemplateContexts;

    switch (keyInfo.dataType) {
        case "string":
            headerTemplateContext.dataTypeLabelClass = "label-success";

            templates.push("#simple-value-input-template");
            valueInputTemplateContexts = {
                label: "Value",
                value: keyInfo.value
            };
            break;
        case "list":
            headerTemplateContext.dataTypeLabelClass = "label-primary";

            templates.push("#simple-table-template");
            for (var i = 0; i < keyInfo.value.length; i++) {
                var row = new Row();
                row.setIndex(i);
                row.setStatus(ROW_NO_CHANGE);
                row.setValue(keyInfo.value[i]);
                selectedKey.pushRow(row);

                rows.push({
                    rowNum: i + 1,
                    value: keyInfo.value[i]
                });
            }
            rowTemplateContext.size = "Size: " + keyInfo.value.length;

            templates.push("#simple-value-input-template");
            valueInputTemplateContexts = {
                label: "Value"
            };
            break;
        case "set":
            headerTemplateContext.dataTypeLabelClass = "label-info";

            templates.push("#simple-table-template");
            for (var i = 0; i < keyInfo.value.length; i++) {
                var row = new Row();
                row.setIndex(i);
                row.setStatus(ROW_NO_CHANGE);
                row.setValue(keyInfo.value[i]);
                selectedKey.pushRow(row);

                rows.push({
                    rowNum: i + 1,
                    value: keyInfo.value[i]
                });
            }
            rowTemplateContext.size = "Size: " + keyInfo.value.length;

            templates.push("#simple-value-input-template");
            valueInputTemplateContexts = {
                label: "Value"
            };
            break;
        case "zset":
            headerTemplateContext.dataTypeLabelClass = "label-warning";

            templates.push("#sorted-set-table-template");
            var rowCounter = 0;
            for (var i = 0; i < keyInfo.value.length; i = i + 2) {
                var row = new Row();
                row.setIndex(rowCounter);
                row.setStatus(ROW_NO_CHANGE);
                row.setValue(keyInfo.value[i]);
                row.setScore(keyInfo.value[i + 1]);
                selectedKey.pushRow(row);

                rows.push({
                    rowNum: ++rowCounter,
                    value: keyInfo.value[i],
                    score: keyInfo.value[i + 1]
                });
            }
            rowTemplateContext.size = "Size: " + rowCounter;

            templates.push("#sorted-set-value-input-template");
            valueInputTemplateContexts = {
                label: "Value",
                score: "",
            };
            break;
        case "hash":
            headerTemplateContext.dataTypeLabelClass = "label-danger";

            templates.push("#hash-table-template");
            var rowCounter = 0;
            $.each(keyInfo.value, function (field, value) {
                var row = new Row();
                row.setIndex(rowCounter);
                row.setStatus(ROW_NO_CHANGE);
                row.setHashField(field);
                row.setHashValue(value);
                row.setOriginalHashField(field);
                row.setOriginalHashValue(value);
                selectedKey.pushRow(row);

                rows.push({
                    rowNum: ++rowCounter,
                    field: field,
                    value: value
                });
            });
            rowTemplateContext.size = "Size: " + rowCounter;

            templates.push("#hash-value-input-template");
            break;
    }

    rowTemplateContext.rows = rows;

    contexts.push(headerTemplateContext);
    if (rowTemplateContext.rows.length >= 1) {
        contexts.push(rowTemplateContext);
    }

    contexts.push(valueInputTemplateContexts);

    $('#page-main-right-column').append(
        combineRenderedHtmlStrings(templates, contexts)
    );

    if (keyInfo.dataType === "string") {
        $('#page-main-right-column > .section-value > .margin-top-sm > .form-control.textarea-value').prop('disabled', false);
    }

    // renaming part
    $('.btn-group-key-name').on("click", function (event) {
        enableKeyNameEditor(keyInfo);
    });

    // refresh button part
    $('.btn-refresh-key-info').on("click", function (event) {
        refreshKeyInfo(keyInfo.key);
    });

    // delete button part
    confirmButton($('button.btn-delete-key'), function (done) {
        showProgressBar("Deleting key...");
        deleteKey(selectedKey.getKey()).done(function (result) {
            dismissProgressBar();
            showNotificationMessage(ALERT_SUCCESS, "Success!", "The key [" + selectedKey.getKey() + "] has been deleted successfully.");
            selectedKey.init();
            refreshKeyListView($('#input-search-key').val());
        }).fail(function () {
            dismissProgressBar();
            showNotificationMessage(ALERT_SUCCESS, "Fail!", "Fail to delete the key.");
        });
        done();
    });

    // save button part
    $('button.btn-save-key').on("click", function (event) {
        var modifiedKeyInfo = createModifiedKeyObject();

        console.log(modifiedKeyInfo.getValue());

        if (isKeyInfoModified(modifiedKeyInfo)) {
            showProgressBar("Saving key info...");
            saveKey(modifiedKeyInfo).done(function (result) {
                dismissProgressBar();
                showNotificationMessage(ALERT_SUCCESS, "Success!", "The key [" + selectedKey.getKey() + "]'s info. has been saved successfully.");
                refreshKeyInfo(selectedKey.getKey());
            }).fail(function (jqXHR, textStatus, error) {
                dismissProgressBar();
                console.log(textStatus + ": " + error);
                showNotificationMessage(ALERT_FAILURE, "Fail!", "Fail to save the key's info.");
            });
        } else {
            showNotificationMessage(ALERT_FAILURE, "Fail!", "There is no change.");
        }
    })

    // add row button
    $('#btn-add-row').on("click", function (event) {
        addRow();
    });

    // delete row button
    $('#btn-delete-row').on("click", function (event) {
        deleteRow();
    });

    $('tbody > tr').on("click", function (event) {
        selectRow($(this));
    });

    $('.btn-value-mgmt > span.dropdown > ul.dropdown-menu > li > a').on("click", function (event) {
        applyChangeValueViewFormat($(this));
    });
}

var showProgressBar = function (message) {
    $('#progressbar-indeterminate').remove();

    var backgroundWidth = $('#page-main-right-column').width();
    var loadingTemplateHeight = $(window).height() - ($('#page-main-right-column').height() + $('#page-bottom').height() + 80);

    $('#page-main-right-column').prepend(templateImport('#loading-progress-bar-template',
        {
            templateHeight: loadingTemplateHeight,
            backgroundWidth: backgroundWidth,
            message: message
        }
    ));
}

var dismissProgressBar = function () {
    $('#progressbar-indeterminate').remove();
}

var showLargeErrorMessage = function (message) {
    $('#page-main-right-column').empty();

    var loadingTemplateHeight = $(window).height() - ($('#page-main-right-column').height() + $('#page-bottom').height() + 80);

    $('#page-main-right-column').append(templateImport('#large-error-placeholder-template',
        {
            templateHeight: loadingTemplateHeight,
            message: message
        }
    ));
}

var changeValueViewFormat = function (value, type) {
    var formattedValue = value;

    // check the input text is just a string with digits
    if(/^\d+$/.test(formattedValue)) {
        return formattedValue;
    }

    try {
        var obj = JSON.parse(value);
        switch (type) {
            case "Plain Text":
                formattedValue = JSON.stringify(obj);
                break;
            case "JSON":
                formattedValue = JSON.stringify(obj, null, 4);
                break;
        }
    } catch (e) {
        console.log(e.message);
    }
    return formattedValue;
}

var enableKeyNameEditor = function (keyInfo) {
    $('.btn-group-key-name').empty();
    $('.btn-group-key-name').append(templateImport("#key-name-editor-template", { key: keyInfo.key }));
    $('.btn-group-key-name').unbind("click");

    $('#input-key-name').select();

    $('#input-key-name').on("keyup", function (event) {
        if (event.keyCode === 13) {
            // when "enter" key is typed
            $('#btn-edit-key-name').trigger("click");
        } else if (event.keyCode == 27) {
            // when "esc" key is typed
            disableKeyNameEditor(keyInfo);
        }
    });

    $('#btn-edit-key-name').on("click", function (event) {
        var newKeyName = $('#input-key-name').val();
        showProgressBar("Renaming key...");
        renameKey(selectedKey.getKey(), newKeyName).done(function (result) {
            dismissProgressBar();
            if (result === "OK") {
                console.log(result);
                selectedKey.setKey(newKeyName);
                // initialize text input in search bar 
                $('#input-search-key').val("");
                refreshKeyListView("");
            } else {
                showNotificationMessage(ALERT_FAILURE, "Fail!", "The key with the given name already exists.");
            }
        }).fail(function (jqXHR, textStatus, error) {
            dismissProgressBar();
            console.log(textStatus + ": " + error);
            if (jqXHR.status === 400) {
                showNotificationMessage(ALERT_FAILURE, "Fail!", "The key renamed is the same name as before.")
                refreshKeyInfo(selectedKey.getKey());
            }
        });
    });
}

var disableKeyNameEditor = function (keyInfo) {
    $('.btn-group-key-name').empty();
    $('.btn-group-key-name').append(templateImport("#key-name-template", { key: keyInfo.key }));
    $('.btn-group-key-name').on("click", function (event) {
        enableKeyNameEditor(keyInfo);
    });
}

var refreshKeyInfo = function (key) {
    showProgressBar("Refreshing key info...");
    fetchKey(key).done(function (keyInfo) {
        dismissProgressBar();
        showKeyInfo(keyInfo);
    }).fail(function () {
        dismissProgressBar();
        showNotificationMessage(ALERT_FAILURE, "Fail!", "Fail to get the key.")
    });
}

// row management codes
var selectRow = function (clickedRowElement) {
    var previousRow = selectedKey.getCurrentRow();
    var selectedRow = selectedKey.getRow(clickedRowElement.index());

    // enable disabled textareas
    $('.form-control').prop('disabled', false);

    // if there is a previously selected row, disable the selected state of it
    if (previousRow) {
        previousRow.getTargetElement().attr("selected", null);
        $('textarea.textarea-value').unbind("keyup");
        $('div.input-group-score-mgmt > input.form-control').unbind("keyup");
        $('textarea.textarea-hash-field').unbind("keyup");
        $('textarea.textarea-hash-value').unbind("keyup");
    }

    // enable the current row to be selected state
    clickedRowElement.attr("selected", true);

    selectedRow.setTargetElement(clickedRowElement);

    var dataType = selectedKey.getDataType();

    if (dataType === "zset") {
        $('textarea.textarea-value').val(selectedRow.getValue());
        $('textarea.textarea-value').on("keyup", function (event) {
            var value = $(this).val();
            $(clickedRowElement.children(".redis-value")).text(value);
            // store the modified value inside the selectedRow
            selectedRow.setValue(value);

            toggleRowDataModificationState(selectedRow, clickedRowElement, selectedKey.getValue()[selectedRow.getIndex() * 2], selectedRow.getValue(), selectedKey.getValue()[selectedRow.getIndex() * 2 + 1], selectedRow.getScore());
        });

        $('div.input-group-score-mgmt > input.form-control').val(selectedRow.getScore());
        $('div.input-group-score-mgmt > input.form-control').on("keyup", function (event) {
            var score = $(this).val();
            $(clickedRowElement.children(".redis-score")).text(score);
            // store the modified value inside the selectedRow
            selectedRow.setScore(score);

            toggleRowDataModificationState(selectedRow, clickedRowElement, selectedKey.getValue()[selectedRow.getIndex() * 2], selectedRow.getValue(), selectedKey.getValue()[selectedRow.getIndex() * 2 + 1], selectedRow.getScore());
        });

    } else if (dataType === "hash") {
        $('textarea.textarea-hash-field').val(selectedRow.getHashField());
        $('textarea.textarea-hash-field').on("keyup", function (event) {
            var hashField = $(this).val();
            $(clickedRowElement.children(".redis-hash-field")).text(hashField);
            // store the modified value inside the selectedRow
            selectedRow.setHashField(hashField);

            toggleRowDataModificationState(selectedRow, clickedRowElement, selectedRow.originalHashField, selectedRow.getHashField(), selectedRow.originalHashValue, selectedRow.getHashValue());
        });
        $('textarea.textarea-hash-value').val(selectedRow.getHashValue());
        $('textarea.textarea-hash-value').on("keyup", function (event) {
            var hashValue = $(this).val();
            $(clickedRowElement.children(".redis-hash-value")).text(hashValue);
            // store the modified value inside the selectedRow
            selectedRow.setHashValue(hashValue);

            toggleRowDataModificationState(selectedRow, clickedRowElement, selectedRow.originalHashField, selectedRow.getHashField(), selectedRow.originalHashValue, selectedRow.getHashValue());
        });
    } else {
        // case : list or set
        $('textarea.textarea-value').val(selectedRow.getValue());
        // dynamically applies changed value typed in textarea to value posted on table
        $('textarea.textarea-value').on("keyup", function (event) {
            var value = $(this).val();
            $(clickedRowElement.children(".redis-value")).text(value);
            // store the modified value inside the selectedRow
            selectedRow.setValue(value);

            toggleRowDataModificationState(selectedRow, clickedRowElement, selectedKey.getValue()[selectedRow.getIndex()], selectedRow.getValue());
        });
    }

    // store selected row info into the selectedKey for future usage
    selectedKey.setCurrentRow(selectedRow);
}

var toggleRowDataModificationState = function (selectedRow, clickedRowElement) {
    var rowStatus = selectedRow.getStatus();
    if (rowStatus === ROW_ADDED || rowStatus === ROW_DELETED) {
        return;
    }
    if (arguments.length > 4) {
        if (arguments[2] === arguments[3] && arguments[4] === arguments[5]) {
            selectedRow.setStatus(ROW_NO_CHANGE);
            $(clickedRowElement.children(".redis-value-state").text(""));
        } else {
            selectedRow.setStatus(ROW_MODIFIED);
            $(clickedRowElement.children(".redis-value-state").text("modified"));
        }
    } else {
        if (arguments[2] === arguments[3]) {
            selectedRow.setStatus(ROW_NO_CHANGE);
            $(clickedRowElement.children(".redis-value-state").text(""));
            return false;
        } else {
            selectedRow.setStatus(ROW_MODIFIED);
            $(clickedRowElement.children(".redis-value-state").text("modified"));
            return true;
        }
    }
}

var addRow = function () {
    var tableRowHtmlTag;
    var rowIndex = $('#page-main-right-column > .panel.panel-default > .table-scroll > table > tbody').children().length + 1;
    var row = new Row();

    var deletedCellCounter = 0;

    $('#page-main-right-column > .panel.panel-default > .table-scroll > table > tbody').children().each(function (index, element) {
        if ($(element).hasClass("deleted")) {
            deletedCellCounter++;
        }
    });

    rowIndex = rowIndex - deletedCellCounter;

    row.setIndex(rowIndex - 1);
    console.log(rowIndex - 1);
    row.setStatus(ROW_NO_CHANGE);

    switch (selectedKey.getDataType()) {
        case "list":
        case "set":
            tableRowHtmlTag = templateImport("#common-row-template", { rowIndex: rowIndex });
            row.setValue("");
            break;
        case "zset":
            tableRowHtmlTag = templateImport("#sorted-set-row-template", { rowIndex: rowIndex });
            row.setValue("");
            row.setScore("");
            break;
        case "hash":
            tableRowHtmlTag = templateImport("#hash-row-template", { rowIndex: rowIndex });
            row.setHashField("");
            row.setHashValue("");
            break;
    }
    $('#page-main-right-column > .panel.panel-default > .table-scroll > table > tbody').append(tableRowHtmlTag);

    row.setStatus(ROW_ADDED);
    selectedKey.pushRow(row);

    $('#page-main-right-column > .panel.panel-default > .panel-footer').text("Size: " + rowIndex);

    var $newRowJQueryObject = $('#page-main-right-column > .panel.panel-default > .table-scroll > table > tbody').children().last();

    selectRow($newRowJQueryObject);

    $newRowJQueryObject.on("click", function (event) {
        selectRow($(this));
    });

    scrollTableToBottom();
}

var scrollTableToBottom = function () {
    $('.table-scroll').scrollTop($('.table-scroll').prop("scrollHeight"));
}

var deleteRow = function () {
    var $tableBodyJQueryObject = $('#page-main-right-column > .panel.panel-default > .table-scroll > table > tbody');
    var $tableFooterJQueryObject = $('#page-main-right-column > .panel.panel-default > .panel-footer');

    // check if there is one row remaining
    // if it is true then notify that there must be at leat one row left thus the row cannot be deleted
    if (selectedKey.getRows().length - $tableBodyJQueryObject.children(".deleted").length === 1) {
        showNotificationMessage(ALERT_FAILURE, "WARNING!", "There must be at least one row left.");
        return;
    }
    // get currently selected row and its element JQueryObject
    var selectedRow = selectedKey.getCurrentRow();
    var selectedRowIndex = selectedRow.getIndex();
    var currentRowJqueryObject = selectedRow.getTargetElement();

    // get previous row JqueryObject to automatically select it after deletion of current row
    var previousRowElement = currentRowJqueryObject.prev();

    // remove row object from selectedKey object
    selectedKey.setCurrentRow(null);

    // remove row object from the rows array
    var row = selectedKey.getRow(selectedRowIndex);
    console.log(selectedRow);
    if (row.getStatus() == ROW_ADDED) {
        selectedKey.getRows().splice(selectedRowIndex, 1);
        currentRowJqueryObject.remove();

        for (var i = selectedRowIndex; i < selectedKey.getRows().length; i++) {
            selectedKey.getRow(i).setIndex(i);
        }
    } else {
        if (selectedKey.getDataType() === "zset") {
            row.setValue(selectedKey.getValue()[selectedRowIndex * 2]);
        } else {
            row.setValue(selectedKey.getValue()[selectedRowIndex]);
        }
        row.setStatus(ROW_DELETED);

        // remove row element from the table
        currentRowJqueryObject.addClass("deleted");
        currentRowJqueryObject.attr("selected", null);;
        currentRowJqueryObject.unbind("click");
    }

    // clear inputs
    switch (selectedKey.getDataType()) {
        case "list":
        case "set":
            $('textarea.textarea-value').unbind("keyup");
            $('textarea.textarea-value').val("");
            $('textarea.textarea-value').prop('disabled', true);
            break;
        case "zset":
            $('textarea.textarea-value').unbind("keyup");
            $('textarea.textarea-value').val("");
            $('textarea.textarea-value').prop('disabled', true);
            $('div.input-group-score-mgmt > input.form-control').val("");
            $('div.input-group-score-mgmt > input.form-control').unbind("keyup");
            $('div.input-group-score-mgmt > input.form-control').prop('disabled', true);
            break;
        case "hash":
            $('textarea.textarea-hash-field').unbind("keyup");
            $('textarea.textarea-hash-field').val("");
            $('textarea.textarea-hash-field').prop('disabled', true);
            $('textarea.textarea-hash-value').unbind("keyup");
            $('textarea.textarea-hash-value').val("");
            $('textarea.textarea-hash-value').prop('disabled', true);
            break;
    }

    // update row numbers of the table
    var rowCounter = 0;
    $tableBodyJQueryObject.children().each(function (index, element) {
        if (!$(element).hasClass("deleted")) {
            rowCounter++;
            $(element).children().first().text(rowCounter);
        }
    });

    $tableFooterJQueryObject.text("Size: " + rowCounter);

    selectRow(previousRowElement);
}

var createModifiedKeyObject = function () {
    var modifiedKeyInfo = new Key();
    modifiedKeyInfo.setKey(selectedKey.getKey());
    // get ttl from the input tags and store it into modifiedKeyInfo
    modifiedKeyInfo.setTtl($('.input-group-ttl-mgmt > .form-control').val());

    // store data type into modifiedKeyInfo
    modifiedKeyInfo.setDataType(selectedKey.getDataType());

    // get value from the textarea tags and store it into modifiedKeyInfo
    switch (selectedKey.getDataType()) {
        case "string":
            modifiedKeyInfo.setValue(changeValueViewFormat($('textarea.textarea-value').val(), "Plain Text"));
            break;
        case "list":
            var valueSet = [];
            var rows = selectedKey.getRows();
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                console.log(row);
                switch (row.getStatus()) {
                    case ROW_NO_CHANGE:
                        continue;
                    case ROW_ADDED:
                    case ROW_DELETED:
                        valueSet.push([row.getStatus(), changeValueViewFormat(row.getValue(), "Plain Text")]);
                        break;
                    case ROW_MODIFIED:
                        var numberOfRowsTobeDeleted = 0;
                        var modifiedRowIndex = row.getIndex();
                        if (rows.length > 1) {
                            // Checks if there is any row to be deleted. This
                            // for loop is to help redis' LSET command to work properly on right index
                            // There is possibility of LSET command setting a value at a wrong index
                            // due to deletion of values preceding the value to be set(modified)
                            for (var j = 0; j < valueSet.length; j++) {
                                var temp = valueSet[j];
                                if (temp[0] === ROW_DELETED && temp[1] < row.getIndex()) {
                                    numberOfRowsTobeDeleted++;
                                }
                            }
                            modifiedRowIndex = row.getIndex() - numberOfRowsTobeDeleted;
                        }
                        valueSet.push([row.getStatus(), modifiedRowIndex, changeValueViewFormat(row.getValue(), "Plain Text")]);
                        break;
                }
            }
            modifiedKeyInfo.setValue(valueSet);
            break;
        case "set":
            var valueSet = [];
            var rows = selectedKey.getRows();
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                switch (row.getStatus()) {
                    case ROW_NO_CHANGE:
                        continue;
                    case ROW_ADDED:
                    case ROW_DELETED:
                        valueSet.push([row.getStatus(), changeValueViewFormat(row.getValue(), "Plain Text")]);
                        break;
                    case ROW_MODIFIED:
                        valueSet.push([row.getStatus(), selectedKey.getValue()[i], changeValueViewFormat(row.getValue(), "Plain Text")]);
                        break;
                }
            }
            modifiedKeyInfo.setValue(valueSet);
            break;
        case "zset":
            var valueSet = [];
            rows = selectedKey.getRows();
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                switch (row.getStatus()) {
                    case ROW_NO_CHANGE:
                        continue;
                    case ROW_ADDED:
                        valueSet.push([row.getStatus(), row.getScore(), changeValueViewFormat(row.getValue(), "Plain Text")]);
                        break;
                    case ROW_DELETED:
                        valueSet.push([row.getStatus(), changeValueViewFormat(row.getValue(), "Plain Text")]);
                        break;
                    case ROW_MODIFIED:
                        valueSet.push([row.getStatus(), selectedKey.getValue()[i * 2], row.getScore(), changeValueViewFormat(row.getValue(), "Plain Text")]);
                        break;
                }
            }

            modifiedKeyInfo.setValue(valueSet);
            break;
        case "hash":
            var valueSet = [];
            var rows = selectedKey.getRows();
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                switch (row.getStatus()) {
                    case ROW_NO_CHANGE:
                        continue;
                    case ROW_ADDED:
                        valueSet.push([row.getStatus(), changeValueViewFormat(row.getHashField(), "Plain Text"), changeValueViewFormat(row.getHashValue(), "Plain Text")]);
                        break;
                    case ROW_DELETED:
                        valueSet.push([row.getStatus(), changeValueViewFormat(row.getHashField(), "Plain Text")]);
                    case ROW_MODIFIED:
                        valueSet.push([row.getStatus(), row.originalHashField, changeValueViewFormat(row.getHashField(), "Plain Text"), changeValueViewFormat(row.getHashValue(), "Plain Text")]);
                        break;
                }
            }
            modifiedKeyInfo.setValue(valueSet);
            break;
    }

    return modifiedKeyInfo;
}

var isKeyInfoModified = function (modifiedKeyInfo) {
    if (modifiedKeyInfo.getDataType() === "string") {
        return (modifiedKeyInfo.getValue() !== selectedKey.getValue()) || (parseInt(modifiedKeyInfo.getTtl()) !== selectedKey.getTtl());
    } else {
        return (modifiedKeyInfo.getValue().length > 0) || (parseInt(modifiedKeyInfo.getTtl()) !== selectedKey.getTtl());
    }
}

var adjustInputHeight = function (dataType) {
    var rightColumnDefaultHeight = $('#page-main-left-column').height();

    var rightColumnHeaderHeight = $('.section-header').height();

    var valueInputLabelHeight = $('.section-value > div.label-input-value').height();

    var tableHeight;

    if (dataType !== "string") {
        tableHeight = $('.section-table').height();
    }

    // the hard coded numbers shown below are margin values
    switch (dataType) {
        case "string":
            $('.section-value > div > .form-control.textarea-value').height(rightColumnDefaultHeight - rightColumnHeaderHeight - valueInputLabelHeight - 33);
            break;
        case "list":
        case "set":
            $('.section-value > div > .form-control.textarea-value').height(rightColumnDefaultHeight - rightColumnHeaderHeight - tableHeight - valueInputLabelHeight - 65);
            break;
        case "zset":
            var scoreInputHeight = $('.input-group-score-mgmt').height();
            $('.section-value > div > .form-control.textarea-value').height(rightColumnDefaultHeight - rightColumnHeaderHeight - tableHeight - valueInputLabelHeight - scoreInputHeight - 75);
            break;
        case "hash":
            var fieldInputLabelHeight = $('.section-value > div.label-input-field').height();
            var fieldInputHeight = $('.section-value > div.label-input-field').next().height();
            $('textarea.form-control.textarea-hash-value').height(rightColumnDefaultHeight - rightColumnHeaderHeight - tableHeight - fieldInputLabelHeight - fieldInputHeight - valueInputLabelHeight - 85);
            break;
    }
}