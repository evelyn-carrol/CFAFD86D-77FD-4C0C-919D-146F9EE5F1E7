define(['microcore'], (mc) => {
  return (value) => {
    const lookup = [
      { value: 1, symbol: '', divider: 1, prefix: '', digits: 0 },
      { value: 1e4, symbol: 'K', divider: 1e3, prefix: '~', digits: 1 },
      { value: 1e6, symbol: 'M', divider: 1e6, prefix: '~', digits: 2 },
      { value: 1e9, symbol: 'B', divider: 1e9, prefix: '~', digits: 2 },
    ];
    let item = lookup
      .slice()
      .reverse()
      .find(function (item) {
        return +value >= item.value;
      });

    return item
      ? `${item.prefix}${
          (+value / item.divider)
            .toFixed(item.digits)
            .replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + item.symbol
        }`
      : value;
  };
});
