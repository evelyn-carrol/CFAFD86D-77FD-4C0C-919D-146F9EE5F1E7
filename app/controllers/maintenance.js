define(['microcore', 'mst!/maintenance', 'utilities'],
    function (mc, view, utils){
        return function (params){
            document.title = `Maintenance | ${require.config.env.PANEL_TITLE}`;
            return view({

            });
        }
    });