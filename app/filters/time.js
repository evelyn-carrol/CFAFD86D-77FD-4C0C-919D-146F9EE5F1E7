define(['microcore'], (mc) => {
  return (value) => {
    return (
      Math.floor(+value / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      Math.ceil(+value % 60)
        .toString()
        .padStart(2, '0')
    );
  };
});
