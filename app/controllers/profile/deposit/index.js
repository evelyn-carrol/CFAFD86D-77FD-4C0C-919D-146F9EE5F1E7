define(['microcore', 'mst!/profile/deposit/index', 'qrcode', 'app/modules/notify'],
    function (mc, view, QRCode, notify) {
        function generateQrCode(qrContent) {
            return new QRCode("qr-code", {
                text: qrContent,
                width: 128,
                height: 128,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H,
            });
        }

        mc.events.on('deposit.address.show', async (btn) => {
            btn.classList.add('hide');
            document.querySelector("#address-container").classList.remove('hide');

            let address = await mc.api.call("users.deposit");
            if (address) {
                generateQrCode(address);
                document.querySelector("#btc-address").innerHTML = address;
            } else {
                document.querySelector("#btc-address").innerHTML = "";
                notify("error", mc.i18n('notify.error'), mc.i18n('notify.operation_error'));
            }
        });

        mc.events.on('deposit.address.copy', async () => {
            navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
                if (result.state === "granted" || result.state === "prompt") {
                    navigator.clipboard.writeText(document.querySelector("#btc-address").innerHTML)
                    .then(
                        () => {
                            notify("success", mc.i18n('notify.success'), mc.i18n('notify.clipboard_success'));
                        },
                        () => {
                            notify("error", mc.i18n('notify.error'), mc.i18n('notify.clipboard_error'));
                        }
                    );
                }
            });
        });

        return async function (params) {
            document.title = `${mc.i18n('deposit.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('profile.title'),
                    breadcrumbs: [{url: "/", name: mc.i18n('deposit.title')}],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    });