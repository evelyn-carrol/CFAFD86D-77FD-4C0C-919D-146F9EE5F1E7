define(['microcore'], (mc) => {
  return (value) => mc.i18n(`reason.${value}`) || value;
});
