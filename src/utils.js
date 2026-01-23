export const convertDateDMYtoMDY = (str) => {
    const [day, month, year] = str.split('/');
    return `${month}/${day}/${year}`;
};

export const convertDateMDYtoDMY = (str) => {
    const [month, day, year] = str.split('/');
    return `${day}/${month}/${year}`;
};

export const clearArea = (area) => {
    const dom = area.root;
    while (dom.children.length > 0) {
        dom.removeChild(dom.children[0]);
    }
};

export function getDateNDaysAgo(n = 30) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

export function getTodayStringDate() {
    const date = new Date();
    const day = `${date.getDate()}`;
    const month = `${date.getMonth() + 1}`;
    const year = `${date.getFullYear()}`;
    return `${'0'.repeat(2 - day.length)}${day}_${'0'.repeat(2 - month.length)}${month}_${year}`;
};

export function getWeekNumber(dateString) {
    const date = new Date(dateString);
    const d = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    ));

    const day = d.getUTCDay() || 7; // lunes = 1, domingo = 7
    d.setUTCDate(d.getUTCDate() + 4 - day);

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

export const toggleButtonDisabled = (button, force) => {
    button.root.querySelector('button').toggleAttribute('disabled', force);
};

export function addUtilityButton(p, name, icon, title, callback, disabled) {
    return p.addButton( null, name, callback, {
        buttonClass: 'lg outline',
        icon,
        title,
        disabled,
        tooltip: title?.length > 0
    } );
}

export const request = (request) => {
    var dataType = request.dataType || 'text';
    if (dataType == 'json') { // parse it locally
        dataType = 'text';
    }
    else if (dataType == 'xml') { // parse it locally
        dataType = 'text';
    }
    else if (dataType == 'binary') {
        // request.mimeType = "text/plain; charset=x-user-defined";
        dataType = 'arraybuffer';
        request.mimeType = 'application/octet-stream';
    }

    // regular case, use AJAX call
    var xhr = new XMLHttpRequest();
    xhr.open(request.data ? 'POST' : 'GET', request.url, true);
    if (dataType) {
        xhr.responseType = dataType;
    }
    if (request.mimeType) {
        xhr.overrideMimeType(request.mimeType);
    }
    if (request.nocache) {
        xhr.setRequestHeader('Cache-Control', 'no-cache');
    }
    if (request.headers) {
        for (var i in request.headers) {
            xhr.setRequestHeader(i, request.headers[i]);
        }
    }

    xhr.onload = function (load) {
        var response = this.response;
        if (this.status != 200) {
            var err = 'Error ' + this.status;
            if (request.error) {
                request.error(err);
            }
            return;
        }

        if (request.dataType == 'json') { // chrome doesnt support json format
            try {
                response = JSON.parse(response);
            }
            catch (err) {
                if (request.error) {
                    request.error(err);
                }
                else {
                    throw err;
                }
            }
        }
        else if (request.dataType == 'xml') {
            try {
                var xmlparser = new DOMParser();
                response = xmlparser.parseFromString(response, 'text/xml');
            }
            catch (err) {
                if (request.error) {
                    request.error(err);
                }
                else {
                    throw err;
                }
            }
        }
        if (request.success) {
            request.success.call(this, response, this);
        }
    };
    xhr.onerror = function (err) {
        if (request.error) {
            request.error(err);
        }
    };

    var data = new FormData();
    if (request.data) {
        for (var i in request.data) {
            data.append(i, request.data[i]);
        }
    }

    xhr.send(data);
    return xhr;
};

export const makeLoadingDialog = (title) => {
    return new LX.Dialog(title ?? 'Acción en curso, espere...', (p) => {
        const spinner = new LX.Spinner({ size: '2xl', icon: 'LoaderCircle', iconClass: 'p-2' });
        p.attach(spinner.root);
    }, { modal: true, position: ['calc(50% - 150px)', '250px'], size: ['300px', null], closable: false, draggable: false });
};