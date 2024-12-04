define(['microcore', 'mst!/dashboard/blocks/cards', 'app/modules/notify'],
    function (mc, view, notify){
        return async ($scope, $params) => {
            let data  = await mc.api.call("shop.stats.cards");

            data.chart = {
                items: [],
                style: `background: conic-gradient(rgba(11, 241, 255, 0.25) 0% 100%);`
            }
            let idx = []

            if (data.current && data.current.items && data.current.items.length){
                for (let i in data.current.items) {
                    let item = data.current.items[i];
                    if (item.brand === "VISA"){
                        item.class = "blue"
                    } else if (item.brand === "MASTERCARD"){
                        item.class = "red"
                    } else if (item.brand === "DISCOVER"){
                        item.class = "yellow"
                    } else if (item.brand === "AMERICAN EXPRESS" || item.brand === "AMEX"){
                        item.class = "green"
                    }
                    idx[i] = {
                        color: "var(--color__"+item.class+"_100)",
                        from: 0,
                        to: Math.round(item.count*100/data.current.total)
                    }
                }

                for (let i in idx) {
                    if (i > 0){
                        idx[i].from = idx[i-1].to;
                        idx[i].to = idx[i].to +  idx[i].from;
                    }
                    data.chart.items.push(`${idx[i].color} ${idx[i].from}% ${idx[i].to}%`);
                }

                data.chart.style = `background: conic-gradient(${data.chart.items.toString()});`;
            }

            $($scope).html(await view(data))
        }
    });