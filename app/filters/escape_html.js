define(['microcore'], (mc) => {
    return (value) => {
        /*
        return value.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
            return '&#'+i.charCodeAt(0)+';';
        });
         */
        return encodeURIComponent(value).replace(/'/g, "%27");
    };
});
