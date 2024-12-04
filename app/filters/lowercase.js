define(['microcore'], (mc) => {
  return (value) => {
    return (value ? value : '' + '').toLowerCase();
  };
});
