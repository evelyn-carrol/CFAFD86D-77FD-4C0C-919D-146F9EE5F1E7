define(['microcore'], (mc) => {
  return (value) => {
    return mc.storage.get(value) || require.config[value] || window[value];
  };
});
