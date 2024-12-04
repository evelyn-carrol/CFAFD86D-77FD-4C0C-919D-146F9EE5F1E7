define(['microcore', 'mst!layouts/components/pagination'], function (
  mc,
  pagination_view
) {
  mc.events.on('system:pagination.update', async (data) => {
    let hash = mc.router.hash();
    data.current = data.current || 1;
    data.total_pages = Math.ceil(data.total / data.limit);
    data.pages = [];
    data.limits = [
      { option: '10', value: 10 },
      { option: '25', value: 25 },
      { option: '50', value: 50 },
      { option: '100', value: 100 },
    ];
    if (data.stats && data.stats.length) {
      data.stats = [
        {
          value: data.total,
          name: mc.i18n('filter.found'),
        },
        ...data.stats,
      ];
    } else {
      data.stats = [
        {
          value: data.total,
          name: mc.i18n('filter.found'),
        },
      ];
    }

    data.limit_change = function (selected) {
      let hash = mc.router.hash();
      hash.limit = selected.value;
      hash.page = 1;

      mc.router.go(mc.router.hash(hash));
    };

    // if (data.total_pages > 1) {
    if (data.current > 1) {
      hash.page = data.current - 1;
      data.prev = mc.router.hash(hash);
    }

    if (data.total_pages > 10) {
      if (data.current < 7) {
        for (let i = 1; i <= 7; i++) {
          if (i != data.current) {
            hash.page = i;
            data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
          } else {
            data.pages.push({ page: i });
          }
        }

        data.pages.push({ page: '...' });
        hash.page = data.total_pages;
        data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
      } else if (data.current >= 7 && data.current < data.total_pages - 3) {
        hash.page = 1;
        data.pages.push({ page: 1, uri: mc.router.hash(hash) });
        data.pages.push({ page: '...' });
        for (let i = data.current - 2; i <= data.current + 2; i++) {
          if (i != data.current) {
            hash.page = i;
            data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
          } else {
            data.pages.push({ page: i });
          }
        }

        data.pages.push({ page: '...' });
        hash.page = data.total_pages;
        data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
      } else if (data.current >= 7 && data.current >= data.total_pages - 3) {
        hash.page = 1;
        data.pages.push({ page: 1, uri: mc.router.hash(hash) });
        data.pages.push({ page: '...' });
        for (let i = data.total_pages - 7; i <= data.total_pages; i++) {
          if (i != data.current) {
            hash.page = i;
            data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
          } else {
            data.pages.push({ page: i });
          }
        }
      }
    } else {
      for (let i = 1; i <= data.total_pages; i++) {
        if (i != data.current) {
          hash.page = i;
          data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
        } else {
          data.pages.push({ page: i });
        }
      }
    }

    if (data.current < data.total_pages) {
      hash.page = data.current + 1;
      data.next = mc.router.hash(hash);
    }
    // }

    $('.pagination-wrapper').each(async (index, pagination) => {
      if (pagination instanceof HTMLElement) {
        pagination.outerHTML = await pagination_view(data);
      }
    });
  });

  return async function () {
    return await pagination_view();
  };
});
