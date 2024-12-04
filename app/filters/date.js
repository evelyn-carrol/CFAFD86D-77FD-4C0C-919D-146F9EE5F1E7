define(['microcore'], (mc) => {
    return (value) => {
        let data = new Date(value * 1000);
        return data.toLocaleDateString();
    };
});
