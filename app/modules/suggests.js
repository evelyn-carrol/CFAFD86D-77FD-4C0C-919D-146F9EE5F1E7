define(['microcore'], function (mc) {
  async function suggest(method, params, cb) {
    let data = await mc.api.call(method, params);

    let items = [];

    if (data && data.items && data.items.length) {
      for (let i in data.items) {
        let item = data.items[i];
        if (typeof cb == 'function') {
          items.push(cb(item));
        } else {
          items.push({
            option: `${item.name} ${item.surname ? item.surname : ''} ${
              item.id ? ` [${item.id}]` : ''
            }`,
            value: item.id,
          });
        }
      }
    }

    return items;
  }

  async function suggest_array(method, params, cb) {
    let data = await mc.api.call(method, params);

    let items = [];

    if (data && data.length) {
      for (let i in data) {
        let item = data[i];
        if (typeof cb == 'function') {
          items.push(cb(item));
        } else {
          items.push({
            option: item,
            value: item,
          });
        }
      }
    }

    return items;
  }

  async function shop_cards_suggest(value, field){
    return await suggest_array('shop.cards.suggests', { q: value, field: field }, function(item) {
      return {
        option: item,
        value: item,
      };
    });
  }

  mc.events.on('admins.suggest', async (value) => {
    return await suggest(
      'users.suggest',
      { q: value, role: 'admin' },
      function (item) {
        return {
          option: item.name + ' ' + item.surname + ' [' + item.id + '] - ' + item.status,
          value: item.id,
        };
      }
    );
  });

  mc.events.on('shop.brands.suggest', async (value) => {
    return await shop_cards_suggest(value, "brand")
  });

  mc.events.on('shop.types.suggest', async (value) => {
    return await shop_cards_suggest(value, "type")
  });

  mc.events.on('shop.categories.suggest', async (value) => {
    return await shop_cards_suggest(value, "category")
  });

  mc.events.on('shop.countries.suggest', async (value) => {
    return await shop_cards_suggest(value, "country")
  });

  mc.events.on('shop.bases.suggest', async (value) => {
    return await suggest_array('shop.cards.suggests', { q: value, field: "base" }, function(item) {
      return {
        option: item.name,
        value: item.id,
      };
    });
  });

  mc.events.on('upload.bases.suggest', async (value) => {
    return await suggest('shop.bases.search', { q: value }, function (item) {
      return {
        option: item.name,
        value: item.id,
      };
    });
  });

  mc.events.on('sellers.suggest', async (value) => {
    return await suggest('shop.sellers.suggests', { q: value}, function (item) {
      return {
        option: item.nickname,
        value: item.id,
      };
    });
  });

  mc.events.on('clients_sellers.suggest', async (value) => {
    return await suggest('users.suggests', { q: value, role: ['client', 'seller'] }, function (item) {
      return {
        option: item.nickname + ' [' + item.id + '] ',
        value: item.id,
      };
    });
  });
});
