define('microcore', function () {
  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      atob(str.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  }

  String.prototype.hashCode = function () {
    let hash = 0;
    if (this.length === 0) {
      return hash;
    }
    for (let i = 0; i < this.length; i++) {
      let char = this.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  window.___mc = {
    events: (() => {
      let observer = {};
      let events = [];

      setInterval(function () {
        let event = events.shift();

        while (event) {
          if (observer[event.name] && observer[event.name].length) {
            observer[event.name].forEach(function (item) {
              event.resolve(item(event.data, event.name));
            });
          }
          event = events.shift();
        }
      }, 10);

      return {
        on: function (events, cb) {
          if (typeof events === 'string') {
            events = [events];
          }
          let ids = [];
          events.forEach((event) => {
            observer[event] = observer[event] || [];
            ids.push(observer[event].push(cb));
          });
          return ids;
        },
        push: function (name, data) {
          return new Promise((resolve, reject) => {
            events.push({ name: name, data: data, resolve: resolve });
          });
        },
        off: function (events, id) {
          if (id) {
            delete observer[events][id];
          } else {
            if (typeof events === 'string') {
              events = [events];
            }
            events.forEach((event) => {
              delete observer[event];
            });
          }
        },
        handlers: function () {},
      };
    })(),
    storage: (() => {
      let storage = {};
      return {
        set: function (key, value) {
          storage[key] = value;
        },
        unset: function (key) {
          delete storage[key];
        },
        get: function (key) {
          return storage[key];
        },
        clear: function () {
          storage = {};
        }
      };
    })(),
    router: (() => {
      let routes = {};
      let current = location.pathname;

      window.onpopstate = function (e) {
        e.preventDefault();
        let returnLocation = history.location || document.location;
        router.go(returnLocation.pathname, true);
      };

      let router = {
        add: (route, cb, dp) => {
          routes[
            route.replace(/^\//, '').replace(/:([^\/]+)/g, '(?<$1>[^\\/]+)')
          ] = [cb, dp || {}];
        },
        go: (uri, onpopstate) => {
          if (!onpopstate) {
            history.pushState(null, '', uri);
          }
          if (uri[0] === '#') {
            uri = location.pathname + uri;
          }
          current = uri;
          router.dispatch(current);
        },
        dispatch: (uri) => {
          let rendered = false;
          uri = uri.split('#')[0];
          for (let route in routes) {
            let matched = uri.replace(/^\//, '').match(route);
            if (matched && matched[0] === matched.input) {
              let params = routes[route][1];
              if (matched.groups) {
                for (let param in matched.groups) {
                  params[param] = matched.groups[param];
                }
              }
              router.route = routes[route][0];
              router.route(params);
              rendered = true;
              break;
            }
          }
          if (!rendered) {
            ___mc.router.go(`/404`);
          }
        },
        hash: (data) => {
          if (data) {
            let params = '#';
            for (let param in data) {
              let value = data[param];
              if (typeof value === 'object' && !value.length) {
                value = null;
              }
              if (value && value !== 'undefined') {
                value = JSON.stringify(value);
                params += param + '=' + value + '&';
              }
            }

            return params.substr(0, params.length - 1) || '#';
          } else {
            let params = {};
            if (location.hash.length) {
              let data = location.hash
                .substr(1)
                .split('&')
                .map((value) => {
                  return value.split('=');
                });

              for (let param in data) {
                let value = data[param][1];
                if (value) {
                  param = data[param][0];
                  let v = JSON.parse(decodeURIComponent(value));
                  if (typeof v === 'object' && !v.length) {
                    v = null;
                  }
                  if (v) {
                    params[param] = v;
                  }
                }
              }
            }
            return params;
          }
        },
      };

      return router;
    })(),
    auth: (() => {
      return {
        token: () => {
          let cookies = {};
          if (document.cookie.split(';')[0] !== '') {
            document.cookie.split(';').forEach((item) => {
              cookies[item.split('=')[0].trim()] = item.split('=')[1].trim();
            });
          }
          return cookies['__token'];
        },
        get: function () {
          let c = document.cookie.split(' ');
          let cookies = {};
          if (c.length) {
            c.forEach((item) => {
              cookies[item.split('=')[0]] = item.split('=')[1];
            });
          }

          let token = cookies['__token'];
          token = (token &&
            JSON.parse(b64DecodeUnicode(token.split('.')[1]))) || {
            role: 'public',
          };

          if (token.exp <= new Date().getTime() / 1000) {
            document.cookie =
              '__token=;domain=' +
              window.location.hostname +
              ';expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
            setTimeout(() => {
              location.reload();
            }, 100);
            return false;
          }
          return token;
        },
        logout: function () {
          document.cookie =
            '__token=;domain=' +
            window.location.hostname +
            ';expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
          sessionStorage.removeItem('switch');
          location.href = '/login';
        },
        back: function () {
          try {
            let profile = sessionStorage.getItem('switch');
            if (profile !== null) {
              profile = JSON.parse(profile);
              if (profile.token && profile.token.length && profile.exp) {
                document.cookie = `__token=${profile.token};domain=${window.location.hostname};expires=${profile.exp}; path=/`;
                sessionStorage.removeItem('switch');
                location.href = '/';
              }
            }
          } catch (ex) {}
        },
      };
    })(),
    api: (() => {
      let cache = {};
      setInterval(() => {
        cache = {};
      }, 1000);

      async function request(data) {
        let response = [];
        let body = [];

        if (data.constructor === [].constructor) {
          for (let i in data) {
            let cache_id = JSON.stringify(data[i]).hashCode();
            data[i].id = i;
            if (cache[cache_id]) {
              response[i] = await cache[cache_id];
            } else {
              response[i] = cache_id;
              cache[cache_id] = new Promise((resolve) => {
                let waiter = setInterval(() => {
                  if (response[i] !== cache_id) {
                    clearInterval(waiter);
                    resolve(response[i]);
                  }
                });
              }, 10);
              body.push(data[i]);
            }
          }

          if (body.length === 0) {
            return response;
          }
        } else {
          let cache_id = JSON.stringify(data).hashCode();

          if (cache[cache_id]) {
            return await cache[cache_id];
          } else {
            response = cache_id;
            cache[cache_id] = new Promise((resolve) => {
              let waiter = setInterval(() => {
                if (response !== cache_id) {
                  clearInterval(waiter);
                  resolve(response);
                }
              }, 10);
            }).finally(() => {
              setTimeout(() => {
                delete cache[cache_id];
              }, 5000);
            });
          }
          body = data;
        }

        let cookies = {};
        if (document.cookie.split(';')[0] !== '') {
          document.cookie.split(';').forEach((item) => {
            cookies[item.split('=')[0].trim()] = item.split('=')[1].trim();
          });
        }

        let token = cookies['__token'];

        let res = await fetch(require.config.env.API_URL, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Token: token,
          },
          body: JSON.stringify(body),
          method: 'POST',
        });

        let result = await res;
        if (res.headers.get('content-type').match('json')) {
          result = await res.json();
        } else {
          return res;
        }

        if (res.headers.get('token') !== null) {
          token = res.headers.get('token') || token;
          let t = (token &&
            JSON.parse(b64DecodeUnicode(token.split('.')[1]))) || {
            role: 'public',
          };
          let exp = new Date(t.exp * 1000);
          document.cookie = `__token=${token}; domain=${window.location.hostname}; expires=${exp.toUTCString()}; path=/`;
        }

        if (res.headers.get('switch') !== null) {
          try {
            let profile = ___mc.auth.get();
            sessionStorage.setItem(
              'switch',
              JSON.stringify({
                token: token,
                name: profile.name || profile.role || '',
                exp: profile.exp || 0,
              })
            );
            let switched = res.headers.get('switch');
            let s = (switched &&
              JSON.parse(b64DecodeUnicode(switched.split('.')[1]))) || {
              role: 'public',
            };
            document.cookie = `__token=${switched}; domain=${window.location.hostname}; expires=${s.exp}; path=/`;
          } catch (ex) {}
        }

        if (result.constructor === [].constructor) {
          result.forEach((resp) => {
            if (resp.error) {
              console.error(resp.error);
              ___mc.events.push('sys:api.error', result.error);
            }

            response[resp.id] = resp.result;
          });
        } else {
          if (result.error) {
            console.error(result.error);
            ___mc.events.push('sys:api.error', result.error);
          }

          response = result.result;
        }

        return response;
      }

      return {
        call: function (method, params) {
          return request({ method: method, params: params });
        },
        batch: function (...requests) {
          return request(requests);
        },
      };
    })(),
    i18n: (str) => {
      let locale = ___mc.storage.get('locale');
      try {
        return eval('locale.' + str) ? eval('locale.' + str) : str;
      } catch (e) {
        return str;
      }
    },
    ws: (() => {
      let server = {
        user_id: null,
        timer: null,
        socket: null,
        url: 'wss://' + location.host + '/ws/',
        protocol: 'client',
        connect: function () {
          if (___mc.auth.get().id) {
            this.user_id = ___mc.auth.get().id.toString();
          }

          this.socket = new WebSocket(this.url, this.protocol);
          this.socket.onopen = this.onopen;
          this.socket.onmessage = this.onmessage;
          this.socket.onclose = this.onclose;
        },
        onopen: function () {
          clearInterval(server.timer);
          if (server.user_id) {
            server.socket.send(
              JSON.stringify({
                id: server.user_id,
                mess_id: ___mc.storage.get('ws.message.id') || 0,
                type: 'init',
              })
            );
          }
        },
        onmessage: function (event, cb) {
          let data = JSON.parse(event.data);
          if (data.type === 'event') {
            ___mc.storage.set('ws.message.id', data.mess_id);
            ___mc.events.push('ws:' + data.action, data.data);
          } else if (data.type === 'ping') {
            server.socket.send(
              JSON.stringify({
                id: server.user_id,
                last_message_id: ___mc.storage.get('ws.message.id'),
                type: 'pong',
              })
            );
            ___mc.storage.set('ws.last_ping', new Date().getTime());
          }
        },
        onclose: function (event) {
          clearInterval(server.timer);
          server.timer = setInterval(function () {
            server.connect();
          }, 1000);
        },
      };
      return server;
    })(),
  };

  return window.___mc;
});
