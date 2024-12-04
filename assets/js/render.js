define("render", ["microcore"], function (mc) {
    function deepCopy(obj, remove_recursive) {
        if (typeof obj === 'object' && !Array.isArray(obj)) {
            let clone = Object.assign({}, obj);
            for (let i in clone) {
                if (i != '__r' && i != '__p') {
                    clone[i] = deepCopy(clone[i], remove_recursive)
                }

                if (remove_recursive && (i == '__r' || i == '__p')) {
                    delete clone[i]
                }
            }
            return clone;
        } else if (Array.isArray(obj)) {
            let clone = [];
            for (let i in obj) {
                if (i != '__r' && i != '__p') {
                    clone.push(deepCopy(obj[i], remove_recursive))
                }
            }
            return clone;
        }

        return obj;
    }

    let filters = async (filter, value) => {
        let path = require.config.render.filters + '/' || '/'
        if (!filters.__cache[filter]) {
            filters.__cache[filter] = await require([path + filter], filter => filter)
        }

        return await filters.__cache[filter](value)
    };

    filters.__proto__.__cache = []

    let helpers = async (helper, args, ctx, prev_ctx) => {
        let path = require.config.render.helpers + '/' || '/'
        if (!helpers.__cache[helper]) {
            helpers.__cache[helper] = await require([path + helper], helper => helper)
        }

        return helpers.__cache[helper](args, ctx, prev_ctx)
    };

    helpers.__proto__.__cache = []
    helpers.__proto__.include = async (src, ctx, params) => {
        if (params) {
            params = params.split(' ').reduce((params, param) => {
                let [key, value] = param.split('=');
                if (value.match(/^['"]/)) {
                    value = value.replace(/^['"]/, '').replace(/['"]$/, '')
                } else {
                    value = helpers.__gv(value)
                }
                params[key] = value;
                return params;
            }, {})
            for (let i in params) {
                ctx[i] = params[i]
            }
        }

        return require(["mst!" + src], async (view) => {
            return view(ctx);
        });
    }
    helpers.__proto__.__gv = async (variable, ctx) => {
        let value = ctx;
        let escape = true;
        let filter = null;
        if (variable) {
            if (variable[0] === "{") {
                escape = false;
                variable = variable.replace(/({|})/g, '');
            }

            [variable, filter] = variable.split("|")

            if (variable != '.') {
                variable.replace(/^\.\.\//, "__p.")
                  .replace(/^\.\//, "__r.")
                  .split(".").forEach((part) => {
                    if (value && value[part] != undefined) {
                        value = value[part];
                        return value
                    } else {
                        return value = undefined;
                    }
                });
            }

            if (filter) {
                if (!variable.match(/^['"]/)) {
                    value = await filters(filter, deepCopy(value, true))
                } else {
                    value = await filters(filter, variable
                      .replace(/^['"]/, '')
                      .replace(/['"]$/, '')
                    )
                }
            }

            if (value && typeof value == 'string' && escape) {
                value = value.replace(/&/g, '&amp;')
                  .replace(/'/g, '&apos;')
                  .replace(/"/g, '&quot;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
            }
        }

        return value;
    }

    function compileCommand(command) {
        command = command.match(/{{\s*(.*)\s*}}/)[1].trim()
        let params = []
        switch (command[0]) {
            case "#":
                params = command.substr(1).split(
                  /\s+(?=(?:'(?:\\'|[^'])+'|[^'])+$)/g)
                let bh = params.shift();

                let is_object = false
                for (let param in params) {
                    let value = params[param]
                    if (value.match(/.*?=.*?/)) {
                        let data = value.split('=')
                        if (data[1][0] != '"' && data[1][0] != "'" && parseInt(data[1][0]) != data[1][0]) {
                            data[1] = "await h.__gv('" + data[1].replace(/'/g, "\\'") + "', ctx)";
                        }
                        params[param] = data[0] + ': ' + data[1]
                        is_object = true
                    } else {
                        if (value[0] != '"' && value[0] != "'" && parseInt(value[0]) != value[0]) {
                            params[param] = "await h.__gv('" + value.replace(/'/g, "\\'") + "', ctx)";
                        }
                    }
                }

                return "r.push(await h('" + bh
                  + "'," +
                  (is_object ? "{" : "[")
                  + params.join(",")
                  + (is_object ? "}" : "]")
                  + ", (async (ctx, prev_ctx) => {let r = [];";
            case "/":
                return "return r.join('');}), ctx));";
            case ">":
                params = command.substring(2).split(' ')
                if (params.length == 1) {
                    return "r.push(await h.include('" + params[0].replace(/'/g, "\\'") + "', ctx));";
                } else {
                    return "r.push(await h.include('" + params[0].replace(/'/g, "\\'") + "', ctx, '" + params.slice(1).map((item) => {
                        return item.replace(/'/g, "\\'")
                    }).join(' ') + "'));";
                }

            case "@":
                return "r.push(await h.__gv('.', ctx).__k);";
            default:
                return "r.push(await h.__gv('" + command.replace(/'/g, "\\'") + "', ctx));";
        }
    }

    function prepareCtx(ctx, parent, root) {
        if (!ctx) return ctx;
        if (ctx.__r) return ctx;

        if (!root) {
            root = ctx
        }

        if (typeof ctx == "object") {
            for (let item in ctx) {
                if (item != '__r' || item != '__p') {
                    item = ctx[item];
                    item = prepareCtx(item, ctx, root)
                }
            }
        }

        if (root) {
            if (typeof ctx == 'string') {
                ctx = String(ctx)
            }
            ctx.__r = root;
        }

        return ctx;
    }

    let render = {
        compile: (template) => {
            let parts = template.split(/{?{{[^}]+}}}?/);
            let commands = template.match(/{?{{([^}]+)}}}?/g);

            let compiled = ["async (ctx, h) => {let r = [];"];
            let boc = 0;
            let lb = "";

            parts.forEach(function (part, index) {
                if (part.length > 0) {
                    compiled.push("r.push(\"" + part.replace(/"/g, '\\"')
                        .replace(/\n+/g, " ")
                        .replace(/\s+/g, " ")
                      + "\");")
                }
                if (commands && commands[index]) {
                    commands[index].charAt(2) == '#' ? (boc++, lb = commands[index]) : '';
                    commands[index].charAt(2) == '/' && boc--;
                    compiled.push(compileCommand(commands[index], index))
                }
            });

            if (boc > 0) {
                console.error("Close opened  block " + lb);
                return undefined;
            }

            compiled.push("return r.join('')}");
            return eval(compiled.join("\r"));
        },

        render: async (template, data) => {
            let ctx = deepCopy(data);
            ctx = prepareCtx(ctx);
            let view = typeof template == 'string' ? render.compile(template) : template;
            return await view(ctx, helpers);
        },

        helpers: {
            add: (helper, cb) => {
                helpers.__cache[helper] = cb
            }
        },

        filters: {
            add: (filter, cb) => {
                filters.__cache[filter] = cb
            }
        }
    };

    return render;
});