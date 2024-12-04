define(['utilities'], (scripts) => (value) => {
  //scripts.formatDateTime(value)
  let data = new Date(scripts.datetimeToUnixTimestamp(value) * 1000);
  return data.toLocaleDateString() + ' ' + data.toLocaleTimeString();
});
