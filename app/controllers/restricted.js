define(['microcore', 'mst!/404', 'utilities'],
    function (mc, view, utils){
      return function (params){
        document.title = `Restricted | ${require.config.env.PANEL_TITLE}`;
        return view({

        });
      }
    });