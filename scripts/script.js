'use strict';

(($) => {
    let requested = 0,
        loadSuccess = 0,
        loadFailed = 0,
        newSections = {},
        versions,
        latestVersion = null,
        hiddenSectionData,
        hiddenKeys,
        currentSection,
        highlightStyle,
        menuList = [];
    
    const loadFilesForPage = (sectionId) => {
        $.ajax({
            'type': 'GET',
            'url': `/ASWSWalkthrough/pages/${sectionId}.html`,
            'data': {
                '_': gitHash
            },
            'dataType': 'html',
            'success': (response) => {
                let newDiv = $('<div>');
                
                newDiv.attr({
                    'id': sectionId,
                    'style': 'display: none;',
                }).html(response).appendTo($('#walkthrough-body'));
                
                loadSuccess++;
                postAjaxEvent();
            },
            'error': (...args) => {
                console.log(`Error loading ${sectionId}`, args);
                loadFailed++;
                postAjaxEvent();
            },
        });
    };
    
    const postAjaxEvent = () => {
        if((loadSuccess + loadFailed) < requested) {
            return;
        }
        
        if(loadFailed > 0) {
            alert('Failed to load critical source. Refer to console for details.');
            return;
        }
        
        init();
    }
    
    const init = () => {
        deriveSectionVersions();
        deriveVersions();
        buildHighlightMenu();
        storeDefaultMenuSort();
        
        fetchHiddenSectionData(() => {
            processHiddenSectionData();
            attachInterfaceEvents();
            setInitialState();
            $('.no-js, .loading').remove();
        });
    };
    
    const deriveSectionVersions = () => {
        $('#menu').find('.wt-link').each(function() {
            let menuLink = $(this),
                sectionId = $(this).data('target'),
                newInSection = $('[class*="new-"]', $('#' + sectionId));
            
            newInSection.each(function() {
                let versionNo = this.className.match(/(?<=new-)\d+\-\d+\-\d+\-\d+/);
                
                if(versionNo === null || typeof versionNo[0] == 'undefined') {
                    console.log('Invalid new class', this);
                    return true;
                }
                
                if(typeof newSections[versionNo] == "undefined") {
                    newSections[versionNo] = [];
                }
                
                if(newSections[versionNo].indexOf(sectionId) == -1) {
                    newSections[versionNo].push(sectionId);
                    menuLink.addClass(`new-${versionNo}`);
                }
            });
        });
    };
    
    const deriveVersions = () => {
        versions = Object.keys(newSections);
        
        if(versions.length > 0) {
            versions.sort((aItem, bItem) => {
                let a = aItem.match(/(\d+)\-(\d+)\-(\d+)\-(\d+)/),
                    b = bItem.match(/(\d+)\-(\d+)\-(\d+)\-(\d+)/);
                    
                for(let i = 1; i <= 4; i++) {
                    if(parseInt(a[i]) > parseInt(b[i])) {
                        return -1;
                    } else if(parseInt(a[i]) < parseInt(b[i])) {
                        return 1;
                    }
                }
                
                return 0;
            });
            
            latestVersion = versions[0];
            $('#latest-version').text(latestVersion.replace(/\-/g, '.'));
        }
    };
    
    const fetchHiddenSectionData = (callback) => {
        hiddenSectionData = localStorage.getItem('hidden-sections');
        
        if(hiddenSectionData !== null) {
            hiddenSectionData = JSON.parse(hiddenSectionData);
            callback();
        } else {
            $.getScript(
                'https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js',
                () => {
                    hiddenSectionData = Cookies.get('wt-hidden');
                    
                    if(typeof hiddenSectionData == 'undefined') {
                        hiddenSectionData = {};
                    } else {
                        hiddenSectionData = JSON.parse(hiddenSectionData);
                    }
                    
                    localStorage.setItem('hidden-sections', JSON.stringify(hiddenSectionData));
                    callback();
                },
            );
        }
    };
    
    const processHiddenSectionData = () => {
        hiddenKeys = Object.keys(hiddenSectionData);
        let i = 0;
        
        hiddenLoop:
        while(i < hiddenKeys.length) {
            let section = hiddenKeys[i],
                hiddenVersion = hiddenSectionData[hiddenKeys[i]],
                hiddenVersionIdx = versions.indexOf(hiddenVersion);
            
            if(hiddenVersionIdx > 0) {
                for(let x = hiddenVersionIdx - 1; x >= 0; x--) {
                    if(newSections[versions[x]].indexOf(section) != -1) {
                        delete hiddenSectionData[section];
                        hiddenKeys.splice(i, 1);
                        continue hiddenLoop;
                    }
                }
            }
            
            i++;
        }
        
        for(i = 0; i < hiddenKeys.length; i++) {
            let menuItem = $(`#menu [data-target="${hiddenKeys[i]}"]`);
            menuItem.parent().hide();
            $('#hidden-section-list').append([
                '<tr>',
                    `<td><span class="wt-link" data-target="${hiddenKeys[i]}">${menuItem.text()}</span></td>`,
                    `<td>${hiddenSectionData[hiddenKeys[i]].replace(/\-/g, '.')}</td>`,
                    `<td><span class="toggle-hidden" data-unhide="${hiddenKeys[i]}">Unhide</span></td>`,
                '</tr>'
            ].join(''));
        }
    };
    
    const buildHighlightMenu = () => {
        highlightStyle = $('<style>');
        highlightStyle.appendTo('head');
        
        for(let i = 0; i < versions.length; i++) {
            $('#highlight-menu ul:first').append(`<li><span class="highlight-link" data-highlight="${versions[i]}">New in ${versions[i].replace(/\-/g, '.')}</span></li>`);
        }
    };
    
    const highlightVerson = (version) => {
        $('#highlight-menu .highlight-link.active').toggleClass('active', false);
        $(`#highlight-menu .highlight-link[data-highlight="${version}"]`).toggleClass('active', true);
        
        if(version == 'none') {
            highlightStyle.text('');
        } else {
            highlightStyle.text(`.new-${version} { color: rgb(100, 255, 150); }`);
        }
    };
    
    const storeDefaultMenuSort = () => {
        let menuIndex = 0;
        
        $('#menu > ul > li').each(function() {
            $(this).data('index', menuIndex++);
            menuList.push($(this));
        });
    };
    
    const jumpToSection = (sectionId) => {
        $('#menu .active').toggleClass('active', false);
        currentSection = sectionId;
        
        if(sectionId == 'hidden-sections') {
            $('#title').text('Manage Hidden Sections');
        } else {
            let menuLink = $(`#menu .wt-link[data-target="${sectionId}"]`);
            menuLink.toggleClass('active', true);
            $('#title').text(menuLink.text());
        }
            
        if(['wt-info', 'hidden-sections'].indexOf(sectionId) == -1) {
            let linkText = hiddenKeys.indexOf(sectionId) == -1 ? 'Hide' : 'Unhide';
            $('#title').append(`<span class="toggle-hidden">${linkText}</span>`);
        }
        
        $('#walkthrough-body > div:visible').hide();
        $(`#${sectionId}`).show();
        $('#walkthrough-body').scrollTop(0);
    };
    
    const toggleHideSection = (sectionId, forceUnhide = false) => {
        let hiddenIdx = hiddenKeys.indexOf(sectionId);
        
        if(hiddenIdx == -1 && forceUnhide !== true) {
            hiddenKeys.push(sectionId);
            hiddenSectionData[sectionId] = latestVersion;
            
            let menuItem = $(`#menu [data-target="${sectionId}"]`);
            menuItem.parent().hide();
            
            $('#hidden-section-list').append([
                '<tr>',
                    `<td><span class="wt-link" data-target="${sectionId}">${menuItem.text()}</span></td>`,
                    `<td>${latestVersion.replace(/\-/g, '.')}</td>`,
                    `<td><span class="toggle-hidden" data-unhide="${sectionId}">Unhide</span></td>`,
                '</tr>'
            ].join(''));
        } else if(hiddenIdx != -1) {
            hiddenKeys.splice(hiddenIdx, 1);
            delete hiddenSectionData[sectionId];
            $(`#menu [data-target="${sectionId}"]`).parent().show();
            $('#hidden-section-list').find(`[data-unhide="${sectionId}"]`).closest('tr').remove();
        }
        
        if(sectionId == currentSection) {
            $('#title > .toggle-hidden').text((hiddenIdx == -1) ? 'Unhide' : 'Hide');
        }
        
        localStorage.setItem('hidden-sections', JSON.stringify(hiddenSectionData));
    };
    
    const sortMenuByDefault = () => {
        let menuElement = $('#menu > ul');
        
        menuList.sort((a, b) => {
            return a.data('index') - b.data('index');
        });
        
        for(let i = 0; i < menuList.length; i++) {
            menuList[i].appendTo(menuElement);
        }
    };
    
    const sortMenuByName = () => {
        let menuElement = $('#menu > ul');
        
        menuList.sort((a, b) => {
            let aDiv = a.children('div'),
                bDiv = b.children('div'),
                aTarget = aDiv.data('target'),
                bTarget = bDiv.data('target');
            
            if(aTarget == 'wt-info') {
                return -1;
            } else if(aTarget == 'wt-tips' && bTarget != 'wt-info') {
                return -1
            } else if(aTarget == 'wt-house' && !['wt-info', 'wt-tips'].includes(bTarget)) {
                return -1
            } else if(aTarget == 'wt-intro' && !['wt-info', 'wt-tips', 'wt-house'].includes(bTarget)) {
                return -1
            }
            
            return aDiv.text() < bDiv.text() ? -1 : 1;
        });
    };
    
    const attachInterfaceEvents = () => {
        $('#main').on('click', '.wt-link:not(.active)', function(event) {
            event.preventDefault();
            jumpToSection($(this).data('target'));
            return false;
        });
        
        $('#title').on('click', '.toggle-hidden', function(event) {
            event.preventDefault();
            toggleHideSection(currentSection);
            return false;
        });
        
        $('#hidden-section-list').on('click', '.toggle-hidden', function(event) {
            event.preventDefault();
            toggleHideSection($(this).data('unhide'), true);
            $(this).closest('tr').remove();
            return false;
        });
        
        $('#highlight-menu').on('click', '.highlight-link:not(.active)', function(event) {
            event.preventDefault();
            highlightVerson($(this).data('highlight'));
            return false;
        });
        
        $('#toggle-sort').on('click', function(event) {
            event.preventDefault();
            
            if($(this).hasClass('active')) {
                sortMenuByDefault();
            } else {
                sortMenuByName();
            }
            
            $(this).toggleClass('active');
            
            return false;
        });
    };
    
    const setInitialState = () => {
        jumpToSection('wt-info');
        highlightVerson((versions.length > 0) ? versions[0] : 'none');
    };
    
    $(() => {
        $('#menu').find('.wt-link').each(function() {
            requested++;
            loadFilesForPage($(this).data('target'));
        });
    });
})(jQuery);