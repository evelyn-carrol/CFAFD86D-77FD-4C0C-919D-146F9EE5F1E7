(function() {
  let modules = window.bundled || {}
  let config = {
    baseUrl: '/',
    paths: {}
  }

  let loaders = {
    js: async (src, name) => {
      if (typeof app_cache !== 'undefined' && app_cache[src]) {
        return new Promise(async (resolve) => {
          await app_cache[src](name)
          return await resolve(modules[name])
        })
      } else {
        let script = document.createElement('script')
        script.async = true
        script.src = src + (require.config.version ? ('?v=' + require.config.version) : '?v=' + (new Date()).getTime())
        script.dataset.name = name
        document.head.append(script)

        return new Promise((resolve) => {
          script.onload = () => {
            let timer = setInterval(function () {
              if (!(modules[name] instanceof Promise)) {
                clearInterval(timer)
                return resolve(modules[name])
              }
            }, 0)
          }
        })
      }
    },
    json: async (src, name) => {
      return fetch(src).then((resp) => resp.json())
    },

    text: async (src, name) => {
      return fetch(src).then(resp => resp.text())
    },

    css: (src, name) => {
      let css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = src + (require.config.version ? ('?v=' + require.config.version) : '?v=' + (new Date()).getTime())
      document.head.append(css)
      return new Promise((resolve) => {
        css.onload = () => {
          resolve(true)
        }
      })
    },

    mst: async (src, name) => {
      return require(['assets/js/render'], async (render) => {
        let template = ""
        if (typeof views_cache !== 'undefined' && views_cache[src]) {
          template = views_cache[src]
        } else {
          let path = (require.config.render && require.config.render.path) ? require.config.render.path : '/'
          src = path + src + (require.config.version ? ('?v=' + require.config.version) : '?v=' + (new Date()).getTime())
          template = render.compile(await fetch(src).then(resp => resp.text()))
        }
        return (data) => {
          return render.render(template, data)
        }
      })
    }
  }

  function load(depend) {
    if (!require.config.baseUrl) {
      require.config.baseUrl = '/'
    }
    depend = depend.split('!')
    let plugin = depend.length > 1 && depend[0] || 'js'
    let name = depend[1] || depend[0]

    let src = ((name.match(/^\//) || name.match(/^https?:\/\//)) && name + '.' + plugin
      || require.config.baseUrl + (require.config.paths[name] || name) + '.' + plugin)
      .replace(/[\/]{2,}/g, '/').replace(/(https?:\/)([^\/])/g, '$1/$2')

    src = src.match(/\/https?/) && src.substring(1) || src
    return loaders[plugin](src, name)
  }

  this.require = async function(depends, cb) {
    let resolved_depends = []
    for (let depend of depends) {
      let name = depend.split('!').pop()
      modules[name] = modules[name] || load(depend)
    }

    let i = 0
    for (let depend of depends) {
      let name = depend.split('!').pop()
      modules[name] = await modules[name]

      resolved_depends[i++] = modules[name]
    }

    return typeof cb == 'function' && cb(...resolved_depends) || resolved_depends
  }

  this.require.config = (conf) => {
    for (let param in conf) {
      this.require.config[param] = conf[param]
    }
  }

  this.require.addLoader = function(ext, cb) {
    !loaders[ext] && (loaders[ext] = cb)
  }

  this.define = async function(n, d, f, cn) {
    let cache_name = cn || f || d
    if (typeof cache_name == 'function') {
      cache_name = undefined
    }
    let module = typeof f == 'function' && f || typeof d == 'function' && d || typeof n == 'function' && n;
    let depends = typeof d == 'object' && d || typeof n == 'object' && n || []
    let alias = typeof n == 'string' && n || null
    let name = cache_name || document.currentScript.dataset.name
    modules[name] = await this.require(depends, module)
    alias && (modules[alias] = modules[name])
  }

  this.define.amd = true
  document.currentScript.dataset.version && (this.require.config.version = document.currentScript.dataset.version)
  document.currentScript.dataset.main && require([document.currentScript.dataset.main])
})()
