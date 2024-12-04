define(['microcore'], (mc) => {
  return (value) => {
    return (value ? value : '' + '').replace(
      /([^>\r\n]?)(\r\n|\n\r|\r|\n)/g,
      '$1<br />$2'
    );
  };
});
