'use strict';

(($) => {
    let languages = {},
        pages = {},
        highestVersion = '0-0-0-0',
        highlightStyle,
        hiddenPages,
        currentPage;
        
    const getLanguage = (key = null) => {
        if(key === null) {
            key = selectedLanguage;
        }
        
        return languages[key];
    };
    
    const getPage = (key, language = null, allowFallback = true) => {
        if(language === null) {
            language = selectedLanguage;
        }
        
        if(typeof pages[language][key] != 'undefined') {
            return pages[language][key];
        }
        
        if(allowFallback) {
            if(language != 'en') {
                return getPage(key, 'en');
            }
            
            console.trace(`Called getPage on non-existent key "${key}"`);
        }
    };
    
    //---
    
    const showPage = (key) => {
        $('.wt-link.active').toggleClass('active', false);
        
        const page = getPage(key);
        
        if(typeof page.menuLink != 'undefined') {
            page.menuLink.toggleClass('active', true);
        }
        
        $('#walkthrough-body > div:visible').hide();
        page.div.show();
        $('#walkthrough-body').scrollTop(0);
        $('#title-text').text(page.name);
        
        $('#toggle-hidden')[['wt-info', 'hidden-pages'].includes(key) ? 'hide' : 'show']()
            .text(getTString((typeof hiddenPages[key] == 'undefined') ? 'hide-page-link' : 'unhide-page-link'));
        
        localStorage.setItem('last-viewed-page', key);
        currentPage = key;
    };
    
    const applyMenuSort = (menuSort) => {
        let pageListSorted;
        
        if(menuSort === null) {
            pageListSorted = pageList;
        } else {
            pageListSorted = $.extend([], pageList);
            
            let forceToTop = ['wt-info', 'wt-tips', 'wt-house', 'wt-intro'],
                language = getLanguage();
            
            pageListSorted.sort((pageKeyA, pageKeyB) => {
                let aToTop = forceToTop.includes(pageKeyA);
                let bToTop = forceToTop.includes(pageKeyB);
                
                if(aToTop && bToTop) {
                    return pageList.indexOf(pageKeyA) - pageList.indexOf(pageKeyB);
                } else if(aToTop) {
                    return -1;
                } else if(bToTop) {
                    return 1;
                }
                
                let pageA = getPage(pageKeyA);
                let pageB = getPage(pageKeyB);
                
                return pageA.name.localeCompare(pageB.name, language.bcp47);
            });
        }
        
        for(let pageKey of pageListSorted) {
            let page = getPage(pageKey);
            page.menuLink.parent().appendTo($('#menu-links'));
        }
    };
    
    const applyHighlight = (version) => {
        $('#highlight-menu .highlight-link.active').toggleClass('active', false);
        $(`#highlight-menu .highlight-link[data-highlight="${version}"]`).toggleClass('active', true);
        
        if(version == 'none') {
            highlightStyle.text('');
        } else {
            highlightStyle.text(`.new-${version} { color: rgb(100, 255, 150); }`);
        }
        
        localStorage.setItem('highlight-version', version);
    };
    
    const toggleHidePage = (pageKey = null) => {
        if(pageKey === null) {
            pageKey = currentPage;
        }
        
        let page = getPage(pageKey),
            action = (typeof hiddenPages[pageKey] == 'undefined') ? 'hide' : 'show';
        
        page.menuLink.parent()[action]();
        
        if(action == 'show') {
            delete hiddenPages[pageKey];
            $('#hidden-pages-list').find(`.toggle-hidden[data-unhide="${pageKey}"]`).closest('tr').remove();
            
            if(Object.keys(hiddenPages).length == 0) {
                $('#hidden-pages-list').closest('table').hide();
            }
        } else {
            hiddenPages[pageKey] = highestVersion;
            addUnhidePageLink(pageKey);
            $('#hidden-pages-list').closest('table').show();
        }
        
        if(currentPage && pageKey == currentPage) {
            $('#toggle-hidden').text(getTString((action == 'show') ? 'hide-page-link' : 'unhide-page-link'));
        }
        
        localStorage.setItem('hidden-sections', JSON.stringify(hiddenPages));
    };
    
    const addUnhidePageLink = (pageKey) => {
        let page = getPage(pageKey);
        
        $('#hidden-pages-list').append([
            '<tr>',
                `<td><span class="wt-link" data-target="${pageKey}" data-translation="menu.${pageKey}">${page.name}</span></td>`,
                `<td>${hiddenPages[pageKey].replace(/\-/g, '.')}</td>`,
                `<td><span class="toggle-hidden" data-unhide="${pageKey}" data-translation="unhide-page-link">${getTString('unhide-page-link')}</span></td>`,
            '</tr>',
        ].join(''));
    };
    
    const contrastVersions = (versionA, versionB) => {
        let a = versionA.match(/(\d+)\-(\d+)\-(\d+)\-(\d+)/),
            b = versionB.match(/(\d+)\-(\d+)\-(\d+)\-(\d+)/);
            
        for(let i = 1; i <= 4; i++) {
            if(parseInt(a[i]) > parseInt(b[i])) {
                return 1;
            } else if(parseInt(a[i]) < parseInt(b[i])) {
                return -1;
            }
        }
        
        return 0;
    };
    
    //---
    
    const init = () => {
        loadPageFiles(() => {
            for(let languageKey of languageList) {
                pages[languageKey]['hidden-pages'] = {
                    'name': getTString('hide-link'),
                    'div': $('#hidden-pages'),
                    'menuLink': $('#manage-hidden-pages-link'),
                };
            }
            
            highlightStyle = $('<style>');
            highlightStyle.appendTo('head');
            
            postPageLoad();
        });
    };
    
    const loadPageFiles = (callback) => {
        let doneCriticalFailAlert = false,
            requestsMade = 0,
            requestsCalledBack = 0,
            menuLinks = {};
        
        for(let pageKey of pageList) {
            menuLinks[pageKey] = $('<div>')
                .toggleClass('wt-link', true)
                .attr({
                    'data-target': pageKey,
                }).append(
                    $('<span>').attr({
                        'data-translation': `menu.${pageKey}`,
                    }).text(getTString(`menu.${pageKey}`))
                );
            
            $('#menu > ul').append($('<li>').append(menuLinks[pageKey]));
            
            requestsMade += languageList.length;
        }
        
        for(let languageKey of languageList) {
            pages[languageKey] = {};
            
            for(let pageKey of pageList) {
                $.ajax({
                    'type': 'GET',
                    'url': `/ASWSWalkthrough/translations/${languageKey}/pages/${pageKey}.html`,
                    'data': {
                        '_': gitHash,
                    },
                    'dataType': 'html',
                    'success': (content) => {
                        pages[languageKey][pageKey] = {
                            'versions': [],
                            'name': getTString(`menu.${pageKey}`, languageKey),
                            'div': $('<div>').hide().html(content),
                            'menuLink': menuLinks[pageKey],
                        };
                        
                        pages[languageKey][pageKey].div.find('img').each(function() {
                            $(this).attr('src', $(this).attr('src') + `?_=${gitHash}`);
                        });
                        
                        pages[languageKey][pageKey].div.appendTo($('#walkthrough-body'));
                    },
                    'error': (...args) => {
                        console.log(`Failed to load page "${pageKey}" for language "${languageKey}"`, args);
                        
                        if(languageKey == 'en' && !doneCriticalFailAlert) {
                            doneCriticalFailAlert = true;
                            $('#loading').text(getTString('critical-fail'));
                            alert(getTString('critical-fail'));
                        }
                    },
                    'complete': () => {
                        if(!doneCriticalFailAlert) {
                            requestsCalledBack++;
                            
                            if(requestsCalledBack == requestsMade) {
                                callback();
                            }
                        }
                    },
                });
            }
        }
    };
    
    const postPageLoad = () => {
        derivePageVersions();
        setupLanguageSwatch();
        setupHighlightMenu();
        fetchHiddenPages(finaliseSetup);
    };
    
    const derivePageVersions = () => {
        for(let languageKey of languageList) {
            let language = {
                'key': languageKey,
                'bcp47': getTString('bcp-47', languageKey, null, false) ?? languageKey,
                'versions': [],
            };
            
            languages[languageKey] = language;
            
            for(let pageKey of pageList) {
                let page = getPage(pageKey, language.key, false);
                
                if(typeof page == 'undefined') {
                    continue;
                }
                
                page.div.find('[class*="new-"]').each(function() {
                    let version = this.className.match(/(?<=new-)\d+\-\d+\-\d+\-\d+/);
                    
                    if(version === null || typeof version[0] == 'undefined') {
                        console.log('Invalid new class', this, page);
                        return true;
                    }
                    
                    if(!page.versions.includes(version[0])) {
                        page.versions.push(version[0]);
                    }
                    
                    page.versions.sort(contrastVersions).reverse();
                });
            }
        }
        
        for(let languageKey of languageList) {
            let language = getLanguage(languageKey);
            
            for(let pageKey of pageList) {
                let page = getPage(pageKey, language.key);
                
                for(let version of page.versions) {
                    if(!language.versions.includes(version)) {
                        language.versions.push(version);
                    }
                }
            }
            
            language.versions.sort(contrastVersions).reverse();
            
            language.latestVersion = language.versions[0];
            getPage('wt-info', language.key).div.find('.latest-version:first').text(language.latestVersion.replace(/\-/g, '.'));
            
            if(contrastVersions(language.latestVersion, highestVersion) == 1) {
                highestVersion = language.latestVersion
            }
        }
        
        for(let pageKey of pageList) {
            let page = getPage(pageKey);
            
            for(let version of page.versions) {
                page.menuLink.toggleClass(`new-${version}`, true);
            }
        }
    };
    
    const setupLanguageSwatch = () => {
        for(let languageKey of languageList) {
            let language = getLanguage(languageKey);
            
            $('#language-swatch .dropdown').append([
                `<div class="choice set-language" data-language="${language.key}">`,
                    `<img src="/ASWSWalkthrough/translations/${language.key}/flag.png">`,
                    `<span>${getTString('language-name', language.key)}</span>`,
                    `<span class="latest-version">(${language.latestVersion.replace(/\-/g, '.')})</span>`,
                '</div>',
            ].join(''));
        }
    };
    
    const setupHighlightMenu = () => {
        let topLevel = $('#highlight-menu ul:first'),
            prefix = getTString('highlight-link-prefix'),
            suffix = getTString('highlight-link-suffix');
            
        topLevel.find('.highlight-link:not([data-highlight="none"])').parent().remove();
        
        for(let version of getLanguage().versions) {
            topLevel.append(`<li><span class="highlight-link" data-highlight="${version}">${prefix}${version.replace(/\-/g, '.')}${suffix}</span></li>`);
        }
    };

    const fetchHiddenPages = (callback) => {
        hiddenPages = localStorage.getItem('hidden-sections');
        
        if(hiddenPages !== null) {
            processHiddenPageData(callback);
            return;
        }
        
        $.getScript(
            'https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js',
            () => {
                hiddenPages = Cookies.get('wt-hidden');
                
                if(typeof hiddenPages == 'undefined') {
                    hiddenPages = '{}';
                }
                
                processHiddenPageData(callback);
            },
        );
    };
    
    const processHiddenPageData = (callback) => {
        hiddenPages = JSON.parse(hiddenPages);
        
        let hiddenPageKeys = Object.keys(hiddenPages);
            
        for(let pageKey of hiddenPageKeys) {
            let page = getPage(pageKey, 'en');
            
            if(page.versions.length > 0 && contrastVersions(hiddenPages[pageKey], page.versions[0]) == -1) {
                delete hiddenPages[pageKey];
            }
        }
        
        localStorage.setItem('hidden-sections', JSON.stringify(hiddenPages));
        
        hiddenPageKeys = Object.keys(hiddenPages);
        
        for(let pageKey of hiddenPageKeys) {
            let page = getPage(pageKey);
            
            page.menuLink.parent().hide();
            addUnhidePageLink(pageKey);
        }
        
        if(hiddenPageKeys.length > 0) {
            $('#hidden-pages-list').closest('table').show();
        }
        
        callback();
    };
    
    const attachEvents = () => {
        $('#main').on('click', '.wt-link:not(.active)', function(event) {
            event.preventDefault();
            showPage($(this).data('target'));
        }).on('click', '.toggle-hidden', function(event) {
            event.preventDefault();
            toggleHidePage($(this).data('unhide'));
        });
        
        $('#toggle-hidden').on('click', function() {
            event.preventDefault();
            toggleHidePage();
        });
        
        $('#toggle-sort').on('click', function(event) {
            event.preventDefault();
            
            let menuSort = localStorage.getItem('menu-sort');
            menuSort = menuSort === null ? 'name' : null;
            
            if(menuSort === null) {
                localStorage.removeItem('menu-sort');
            } else {
                localStorage.setItem('menu-sort', menuSort);
            }
            
            applyMenuSort(menuSort);
            $(this).toggleClass('active');
        });
        
        $('#title-holder').on('click', '.set-language', function(event) {
            event.preventDefault();
            
            selectedLanguage = $(this).data('language');
            
            let language = getLanguage(),
                highlight = localStorage.getItem('highlight-version') ?? language.latestVersion;
            
            if(highlight != 'none') {
                highlight = language.versions.includes(highlight) ? highlight : language.latestVersion;
            }
            
            applyLanguage(selectedLanguage);
            setupHighlightMenu();
            showPage(currentPage);
            applyMenuSort(localStorage.getItem('menu-sort'));
            applyHighlight(highlight);
        });
        
        $('#highlight-list').on('click', '.highlight-link', function(event) {
            event.preventDefault();
            applyHighlight($(this).data('highlight'));
        });
    };
    
    const finaliseSetup = () => {
        let language = getLanguage(),
            highlight = localStorage.getItem('highlight-version') ?? language.latestVersion,
            menuSort = localStorage.getItem('menu-sort');
        
        let latestSeenVersion = localStorage.getItem('latest-seen-version');
        if(latestSeenVersion === null || latestSeenVersion != highestVersion) {
            localStorage.setItem('latest-seen-version', highestVersion);
            
            if(highlight != 'none') {
                highlight = highestVersion;
            }
        }
        
        if(highlight != 'none') {
            highlight = language.versions.includes(highlight) ? highlight : language.latestVersion;
        }
        
        attachEvents();
        showPage(localStorage.getItem('last-viewed-page') ?? 'wt-info');
        applyHighlight(highlight);
        
        if(menuSort !== null) {
            applyMenuSort(menuSort);
            $('#toggle-sort').toggleClass('active', true);
        }
        
        $('body').toggleClass('loaded', true);
    };
    
    $(init);
})(jQuery);