define(() => {
  return async (params, value, prev_ctx) => {
    let titles = JSON.parse(await value());
    let cases = [2, 0, 1, 1, 1, 2];
    return titles[
      params[0] % 100 > 4 && params[0] % 100 < 20
        ? 2
        : cases[params[0] % 10 < 5 ? params[0] % 10 : 5]
    ];
  };
});
