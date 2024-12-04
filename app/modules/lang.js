define(['microcore', 'mst!layouts/components/lang'], function (mc, dropdown) {
  return async ($scope, $params) => {
    let language = localStorage.getItem('lang');

    return await dropdown({ lang: language });
  };
});
