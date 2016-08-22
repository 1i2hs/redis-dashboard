var templateImport = function (templateId, context) {
    var source = $(templateId).html();
    var template = Handlebars.compile(source);

    if (context) {
        return template(context);
    } else {
        return source;
    }
}

var confirmButton = function (selector, callback) {
    $(selector).css('transition', 'opacity 0.2s');
    $(selector).on('click', function () {
        var that = this;

        this.timer = null;

        if (this.isConfirm) {
            this.isConfirm = false;
            if (callback) {
                //$('<span class="glyphicon glyphicon-refresh small-progress" style="display: inline-block;"></span>').insertBefore(this);
                $(this).hide();
                callback.call(this, function () {
                    that.isConfirm = false;
                    $(that).text(that.origin).val(that.origin);

                    $(that).prev().remove();
                    $(that).show();
                });
            }
        }
        else {
            this.origin = $(this).text() ? $(this).text() : $(this).val();
            $(this).css('opacity', '0');
            setTimeout(function () {
                that.isConfirm = true;
                $(that).css('opacity', '1').text('Confirm');

                setTimeout(function () {
                    that.isConfirm = false;
                    $(that).text(that.origin).val(that.origin);
                }, 3000);
            }, 300);
        }
    });
}

const ALERT_SUCCESS = 1;
const ALERT_FAILURE = 0;

var showNotificationMessage = function (alertType, alertStatus, alertMessage) {
    if (alertType === ALERT_SUCCESS) {
        $('#alert-key-event').removeClass('alert-danger').addClass('alert-success');
    } else {
        $('#alert-key-event').removeClass('alert-success').addClass('alert-danger');
    }

    $('#alert-status').text(alertStatus);
    $('#alert-message').text(alertMessage);
    $('#alert-key-event').fadeIn(500);

    setTimeout(function () {
        $('#alert-key-event').fadeOut(500);
    }, 3000);
}

var combineRenderedHtmlStrings = function (templateIds, contexts) {
    var RenderedHtmlString = "";
    for (var i = 0; i < templateIds.length; i++) {
        RenderedHtmlString += templateImport(templateIds[i], contexts[i]);
    }
    return RenderedHtmlString;
}

var applyChangeValueViewFormat = function (selectedDropdownJqueryObject) {
    var selectedViewType = selectedDropdownJqueryObject.text();
    selectedDropdownJqueryObject.parents(".dropdown-menu").siblings("button").html(selectedViewType + "<span class=\"caret\"></span>");
    //$('button.btn.btn-change-value-view').html(selectedViewType + "<span class=\"caret\"></span>");
    var $valueTextareaJqueryObject;
    if (selectedKey.getDataType() === "hash") {
        if (selectedDropdownJqueryObject.parents().hasClass("dropdown-hash-field")) {
            $valueTextareaJqueryObject = $('.section-value > div > textarea.form-control.textarea-hash-field');
        } else {
            $valueTextareaJqueryObject = $('.section-value > div > textarea.form-control.textarea-hash-value');
        }
    } else {
        $valueTextareaJqueryObject = $('.section-value > div > textarea.form-control.textarea-value');
    }
    var value = $valueTextareaJqueryObject.val();
    $valueTextareaJqueryObject.val(changeValueViewFormat(value, selectedViewType));
}