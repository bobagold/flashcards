window.addEventListener("load", function() {
    (function () {
        var
            use_english_categories = false,
            use_thumbnails = window.screen.width < 400,
            categories = [
                'Category:Mammals of Asia',
                'Category:Mammal families',
                'Category:Member states of the European Union',
                'Category:Plant families',
                'Category:Lichens',
                'Category:Post-Impressionism'
            ],
            isEnglishCategory = function (name) {
                return use_english_categories || name.indexOf('Category:') === 0
            },
            language = (window.navigator.userLanguage || window.navigator.language).substr(0, 2),
            container = document.getElementById('container'),
            createLink = function (name, container, callback, href) {
                var link = document.createElement('a');
                link.href = href || '#';
                link.text = name;
                link.onclick = callback;
                container.appendChild(link);
                return link;
            },
            removeChildren = function (container) {
                while (container.children.length > 0) {
                    container.removeChild(container.children[0]);
                }
            },
            showLanguages = function (cur_lang) {
                var l, i, link,
                    headers = {
                        en: 'Flashcards: associate the name and picture and they will disappear!',
                        de: 'Flashcards: verbinden Sie dem Namen und Bild, damit sie verschwinden!',
                        ru: 'Flashcards: Сопоставь название и картинку, и они исчезнут!'
                    },
                    points_texts = {
                        en: 'Points',
                        de: 'Punkte',
                        ru: 'Очков'
                    },
                    container_langs = document.getElementById('languages'),
                    languages = ['en', 'de', 'ru'];
                document.getElementById('header').innerHTML = headers[cur_lang];
                document.getElementById('points_text').innerHTML = points_texts[cur_lang];
                removeChildren(container_langs);
                for (i in languages) {
                    l = languages[i];
                    link = createLink(l, container_langs, function () {
                        var i,
                            language = this;
                        removeChildren(container);
                        showLanguages(language);
                        translate(categories, language, function (names) {
                            showCategories(names, language);
                        });
                        return false;
                    }.bind(l));
                    if (l === cur_lang) {
                        link.className = 'curLang';
                    }
                }
            },
            showCategories = function (names, language) {
                var i;
                for (i = 0; i < names.length; i++) {
                    createLink(names[i], container, function () {
                        var i = this;
                        generate(5, language, use_english_categories ? categories[i] : names[i]);
                        return false;
                    }.bind(i), 'http://' + (isEnglishCategory(names[i]) ? 'en' : language) + '.wikipedia.org/wiki/' + names[i]);
                }
            },
            uniqid = function () {
                return 'cb' + String(Math.random()).substring(2, 10);
            },
            cached = function (f) {
                var cache = {};
                return function () {
                    var i, arg, key = '', cb;
                    for (i = 0; i < arguments.length; i++) {
                        arg = arguments[i];
                        if (typeof arg === 'function') {
                            cb = arg;
                            arguments[i] = function () {
                                cache[key] = arguments;
                                cb.apply(this, arguments);
                            };
                        } else {
                            key += '/' + arg;
                        }
                    }
                    if (!cache.hasOwnProperty(key)) {
                        f.apply(this, arguments);
                    } else {
                        cb.apply(this, cache[key]);
                    }
                };
            },
            exec = cached(function (src, cb) {
                var
                    cbName = uniqid(),
                    script = document.createElement('script');

                window[cbName] = cb;
                script.src = src.replace('CBNAME', cbName);
                container.appendChild(script);
            }),
            translate = function (slugs, cur_lang, callback) {
                var
                    translate_url = "https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=" + cur_lang + "&format=json&callback=CBNAME&titles=",
                    names = [];
                exec(translate_url + slugs.join('|'), function (data) {
                    var
                        page,
                        idx,
                        i;
                    for (i in data.query.pages) {
                        page = data.query.pages[i];
                        idx = slugs.indexOf(page.title);
                        names[idx] = typeof page.langlinks != 'undefined' ? page.langlinks[0]['*'] : page.title;
                    }
                    callback(names);
                });
            };

        function shuffle(a) {
            var j, x, i;
            for (i = a.length; i; i--) {
                j = Math.floor(Math.random() * i);
                x = a[i - 1];
                a[i - 1] = a[j];
                a[j] = x;
            }
        }
        function generate(number_of_words, cur_lang, category) {
            var
                selected,
                container_points = document.getElementById('points'),
                use_e_c = isEnglishCategory(category),
                imgClick = function () {
                    if (!selected) {
                        selected = this;
                        this.className = 'selected';
                    } else if (selected != this && selected.dataset['word'] == this.dataset['word']) {
                        container.removeChild(selected);
                        container.removeChild(this);
                        selected = null;
                            container_points.innerHTML = 1 + Number(container_points.innerHTML);
                    } else {
                        selected.className = '';
                        selected = null;
                    }
                    return false;
                },
                imgLoaded = function (img) {
                    return function (data) {
                        var img = this;
                        pages = data.query.pages;
                        for (var i in pages) {
                            if (typeof pages[i].thumbnail !== 'undefined') {
                                img.src = pages[i].thumbnail.original || pages[i].thumbnail.source;
                            } else {
                                img.src = "http://placehold.it/" + (use_thumbnails ? '50x30' : '350x150') + "?text=" + img.dataset['word'];
                            }
                        }
                    }.bind(img)
                },
                loadImg = function (img, slug) {
                    var
                        piprop = use_thumbnails ? 'thumbnail' : 'original',
                        cat_lang = use_e_c ? 'en' : cur_lang;
                    exec("https://" + cat_lang + ".wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&callback=CBNAME&piprop=" + piprop + "&titles=" + slug, imgLoaded(img));
                },
                loadPagesFromCategory = function (cat_lang, category, callback) {
                    var
                       words_en = [],
                       category_url = "https://" + cat_lang + ".wikipedia.org/w/api.php?action=query&format=json&callback=CBNAME&list=categorymembers&cmtype=page&cmsort=timestamp&cmlimit=30&cmtitle=" + category;
                    exec(category_url, function (data) {
                        var
                            i,
                            ar = data.query.categorymembers;
                        for (i = 0; i < ar.length; i++) {
                            words_en.push(ar[i].title);
                        }
                        callback(words_en);
                    });
                },
                takeRandom = function (number_of_words, callback) {
                    var
                        i,
                        slugs = [],
                        cat_lang = use_e_c ? 'en' : cur_lang,
                        indexes = [];
                    loadPagesFromCategory(cat_lang, category, function (words_en) {
                        var
                            i;
                        for (i = 0; i < words_en.length; i++) {
                            indexes.push(i);
                        }
                        shuffle(indexes);
                        indexes = indexes.slice(0, number_of_words);
                        for (i = 0; i < indexes.length; i++) {
                            slugs.push(words_en[indexes[i]]);
                        }
                        if (use_e_c) {
                            translate(slugs, cur_lang, function (names) {
                                callback(slugs, names);
                            });
                        } else {
                            callback(slugs, slugs);
                        }
                    });
                },
                showImages = function (slugs, names) {
                    var i, slug, img
                    for (var i = 0; i < slugs.length; i++) {
                        slug = slugs[i];
                        img = document.createElement('img');
                        img.onclick = imgClick;
                        img.dataset['word'] = names[i];
                        container.appendChild(img);
                        loadImg(img, slug);
                    }

                },
                showNames = function (names) {
                    var i, name, link;
                    for (i = 0; i < names.length; i++) {
                        name = names[i];
                        link = createLink(name, container, imgClick, 'http://' + cur_lang + '.wikipedia.org/wiki/' + name);
                        link.dataset['word'] = name;
                    }
                };
            takeRandom(number_of_words, function (slugs, names) {
                showImages(slugs, names);
                shuffle(names);
                showNames(names);
            });
            return false;
        }
        showLanguages(language);
        translate(categories, language, function (names) {
            showCategories(names, language);
        });
    })();
});
