define('miq', function() {
//(function () {
    let miq = function (arg, doc) {
        doc = doc && doc.first || doc || document;

        if (typeof arg == 'function') {
            if (doc.readyState == 'loading') {
                doc.addEventListener('DOMContentLoaded', arg);
            } else {
                arg();
            }
        } else {
            let ret = Object.create(miq.fn);
            let i;

            if (typeof arg == 'object') {
                if ('length' in arg) {
                    ret.length = arg.length;

                    for (i = 0; i < arg.length; i++) {
                        ret[i] = arg[i];
                    }
                } else {
                    ret[0] = arg;
                    ret.length = 1;
                }
            } else if (!arg) {
                ret[0] = doc.createDocumentFragment();
                ret.length = 1;
            } else if (arg.match(/<[^>]+>/)) {
                let temp = document.createElement('template');
                temp.innerHTML = arg;
                ret[0] = temp.content;
                ret.length = 1;
            } else {
                let els = doc.querySelectorAll(arg);
                ret.length = els.length;
                for (i = 0; i < els.length; i++) {
                    ret[i] = els[i];
                }
            }

            return ret;
        }
    };

    miq.fn = Object.create(Array.prototype, {
        first: {
            get: function () {
                return this[0];
            }
        },

        eq: {
            value: function (i) {
                return miq(this[i || 0]);
            }
        },

        on: {
            value: function (evt, fn) {
                for (let i = 0; i < this.length; i++) {
                    this[i].addEventListener(evt, fn);
                }
                return this;
            }
        },

        off: {
            value: function (evt, fn) {
                for (let i = 0; i < this.length; i++) {
                    this[i].removeEventListener(evt, fn);
                }
                return this;
            }
        },

        addClass: {
            value: function (cls) {
                for (let i = 0; i < this.length; i++) {
                    if (!miq.fn.hasClass.call({first: this[i]}, cls)) {
                        let className = this[i].className.split(' ')
                            .filter((i) => i.length > 0);
                        className.push(cls);
                        this[i].className = className.join(' ')
                    }
                }
                return this;
            }
        },

        removeClass: {
            value: function (...cls) {
                for (let i = 0; i < this.length; i++) {
                    this[i].classList.remove(...cls) //= this [i].className.replace(cls, '');
                }
                return this;
            }
        },
        toggleClass: {
            value: function (cls) {
                for (let i = 0; i < this.length; i++) {
                    this[i].classList.toggle(cls)
                }
                return this;
            }
        },

        hasClass: {
            value: function (cls) {
                return this.first.className != '' && new RegExp('\\b' + cls + '\\b').test(this.first.className);
            }
        },

        prop: {
            value: function (property, value) {
                if (typeof value == 'undefined') {
                    return this.first[property];
                } else {
                    for (let i = 0; i < this.length; i++) {
                        this[i][property] = value;
                    }
                    return this;
                }
            }
        },

        attr: {
            value: function (property, value) {
                if (typeof value == 'undefined') {
                    return this.first.getAttribute(property);
                } else {
                    for (let i = 0; i < this.length; i++) {
                        this[i].setAttribute(property, value);
                    }
                    return this;
                }
            }
        },

        removeAttr: {
            value: function (property) {
                for (let i = 0; i < this.length; i++) {
                    this[i].removeAttribute(property);
                }
                return this;
            }
        },

        val: {
            value: function (value) {
                let el = this.first;
                let prop = 'value';

                switch (el.tagName) {
                    case 'SELECT':
                        prop = 'selectedIndex';
                        break;
                    case 'OPTION':
                        prop = 'selected';
                        break;
                    case 'INPUT':
                        if (el.type == 'checkbox' || el.type == 'radio') {
                            prop = 'checked';
                        }
                        break;
                }

                return this.prop(prop, value);
            }
        },

        each: {
            value: function (cb) {
                let t = this;
                for (let i in t) {
                    if (!(t[0] && isNaN(i))) {
                        cb(i, t[i]);
                    }

                }
                return this;
            }
        },

        append: {
            value: function (value) {
                let t = this, v = miq(value), len = v.length;
                for (let i = 0; i < len; i++) {
                    t.first.appendChild(v[i])
                }
                return this;
            }
        },
        prepend: {
            value: function (value) {
                let t = this, v = miq(value), len = v.length;
                for (let i = 0; i < len; i++) {
                    t.first.prepend(v[i])
                }
                return this;
            }
        },
        before: {
            value: function (value) {
                this.first.parentElement.insertBefore(miq().append(value).first, this.first);
                return this;
            }
        },
        after: {
            value: function (value) {
                if (this.first.nextElementSibling)
                    miq(this.first.nextElementSibling).before(value)
                else
                    miq(this.first.parentElement).append(value)
                return this;
            }
        },

        parent: {
            value: function () {
                return miq(this.first.parentNode);
            }
        },

        clone: {
            value: function () {
                return miq(this.first.cloneNode(true));
            }
        },

        remove: {
            value: function () {
                for (let i = 0; i < this.length; i++) {
                    this[i].parentNode.removeChild(this[i]);
                }
                return this;
            }
        },

        find: {
            value: function (value) {
                return miq(value, this.first);
            }
        },

        closest: {
            value: function (selector) {
                let el = this.first;
                do {
                    if (el[miq.matches](selector)) {
                        return miq(el);
                    }
                } while (el = el.parentElement);
                return null;
            }
        },

        is: {
            value: function (selector) {
                return miq(this.filter(function (el) {
                    return el[miq.matches](selector);
                }));
            }
        },

        css: {
            value: function (property, value) {
                if (typeof value == 'undefined') {
                    return this.first.style[property];
                } else {
                    for (let i = 0; i < this.length; i++) {
                        this[i].style[property] = value;
                    }
                    return this;
                }
            }
        },

        html: {
            value: function (value) {
                return this.prop('innerHTML', value);
            }
        },

        text: {
            value: function (value) {
                return this.prop('textContent', value);
            }
        }
    });

    miq.matches = ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector'].filter(function (sel) {
        return sel in document.documentElement;
    })[0];

    return miq;
});
    /*
        // Support MD and CommonJS module loading
        if (typeof define === 'function' && define.amd) {
            define(function () {
                return miq;
            });
        } else if (typeof module === 'object' && module.exports) {
            module.exports = miq;
        } else if (typeof $ == 'undefined') {
            $ = miq;
        }
    })();
     */