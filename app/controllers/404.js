define(['microcore', 'mst!/404', 'utilities'],
    function (mc, view, utils){
      return function (params){
        document.title = `404 | ${require.config.env.PANEL_TITLE}`;
        return view({

        });
      }
    });