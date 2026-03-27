(function($) {
	$(function() {
		// Load all pages
		let wtBody = $('#wt-body'),
			requested = 0,
			loadSuccess = 0,
			loadFailed = 0;
			
		function postAjaxEvent() {
			if((loadSuccess + loadFailed) < requested) {
				return;
			}
			
			if(loadFailed > 0) {
				alert('Failed to load critical source. Refer to console for details.');
				return;
			}
			
			init();
		}
			
		$('#menu').find('.wt-link').each(function() {
			requested++;
			let sectionId = $(this).data('target');
			
			$.ajax({
				'type': 'GET',
				'url': '/ASWSWalkthrough/pages/' + sectionId + '.html',
				'data': {
					'_': gitHash
				},
				'dataType': 'html',
				'success': function(response) {
					let newDiv = $('<div>');
					
					newDiv.attr({
						'id': sectionId,
						'style': sectionId != 'wt-info' ? 'display: none;' : ''
					}).html(response).appendTo(wtBody);
					
					loadSuccess++;
					postAjaxEvent();
				},
				'error': function() {
					console.log('Error loading ' + sectionId, arguments);
					loadFailed++;
					postAjaxEvent();
				}
			});
		});
	});
	
	function init() {
		// Get sections with new content
		let newSections = {};
		$('#menu').find('.wt-link').each(function() {
			let menuLink = $(this),
				sectionId = $(this).data('target'),
				newInSection = $('[class*="new-"]', $('#' + sectionId));
			
			newInSection.each(function() {
				versionNo = this.className.match(/(?<=new-)\d+\-\d+\-\d+\-\d+/);
				if(versionNo === null || typeof versionNo[0] == 'undefined') {
					console.log('Invalid new class', this);
					return true;
				}
				
				if(typeof newSections[versionNo] == "undefined") {
					newSections[versionNo] = [];
				}
				
				if(newSections[versionNo].indexOf(sectionId) == -1) {
					newSections[versionNo].push(sectionId);
					
					menuLink.addClass('new-' + versionNo);
				}
			});
		});
		
		// Derive latest version
		let versions = Object.keys(newSections),
			latestVersion = null;
			
		if(versions.length > 0) {
			versions.sort(function(aItem, bItem) {
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
		
		// Process hidden sections cookie (if set)
		let hidden = Cookies.get('wt-hidden');
		if(typeof hidden == 'undefined') {
			hidden = {};
		} else {
			hidden = JSON.parse(hidden);
		}
		
		let hiddenKeys = Object.keys(hidden),
			i = 0;
		
		hiddenLoop:
		while(i < hiddenKeys.length) {
			let section = hiddenKeys[i],
				hiddenVersion = hidden[hiddenKeys[i]];
				
			hiddenVersionIdx = versions.indexOf(hiddenVersion);
			
			if(hiddenVersionIdx > 0) {
				for(let x = hiddenVersionIdx - 1; x >= 0; x--) {
					if(newSections[versions[x]].indexOf(section) != -1) {
						delete hidden[section];
						hiddenKeys.splice(i, 1);
						continue hiddenLoop;
					}
				}
			}
			
			i++;
		}
		
		for(i = 0; i < hiddenKeys.length; i++) {
			let menuItem = $('#menu [data-target="' + hiddenKeys[i] + '"]');
			menuItem.parent().hide();
			$('#hidden-section-list').append([
				'<tr>',
					'<td><span class="wt-link" data-target="' + hiddenKeys[i] + '">' + menuItem.text() + '</span></td>',
					'<td>' + hidden[hiddenKeys[i]].replace(/\-/g, '.') + '</td>',
					'<td><span class="toggle-hidden" data-unhide="' + hiddenKeys[i] + '">Unhide</span></td>',
				'</tr>'
			].join(''));
		}
		
		// Progress / bookmark tracking
		let progress = {};
		let savedProgress = Cookies.get('wt-progress');
		if(typeof savedProgress != 'undefined') {
			progress = JSON.parse(savedProgress);
		}

		// Add progress markers to all ordered list items in all sections
		$('#wt-body > div').each(function() {
			let idx = 0;
			$(this).find('ol > li').each(function() {
				$(this).attr('data-progress-idx', idx++);
				$(this).prepend('<span class="progress-marker" title="Mark as current point"></span>');
			});
		});

		// Apply saved progress state visually
		function applyProgress() {
			Object.keys(progress).forEach(function(sectionId) {
				let idx = progress[sectionId];
				let li = $('#' + sectionId + ' ol > li[data-progress-idx="' + idx + '"]');
				if(li.length) {
					li.addClass('progress-current');
					li.children('.progress-marker').addClass('active');
					$('#menu .wt-link[data-target="' + sectionId + '"]').addClass('has-progress');
				}
			});
		}
		applyProgress();

		// Click handler for progress markers
		$('#wt-body').on('click', '.progress-marker', function(event) {
			event.preventDefault();
			event.stopPropagation();

			let li = $(this).closest('li');
			let sectionId = li.closest('#wt-body > div').attr('id');
			let idx = parseInt(li.attr('data-progress-idx'));

			// Clear previous marker in this section
			let prev = $('#' + sectionId + ' .progress-current');
			prev.removeClass('progress-current');
			prev.children('.progress-marker').removeClass('active');

			if(progress[sectionId] === idx) {
				// Clicking same item — remove the mark
				delete progress[sectionId];
				$('#menu .wt-link[data-target="' + sectionId + '"]').removeClass('has-progress');
			} else {
				// Set new mark
				progress[sectionId] = idx;
				li.addClass('progress-current');
				$(this).addClass('active');
				$('#menu .wt-link[data-target="' + sectionId + '"]').addClass('has-progress');
			}

			Cookies.set('wt-progress', JSON.stringify(progress), {expires: 365});
			return false;
		});

		// Jump between sections
		let currentSection = null;
		$('#main').on('click', '.wt-link', function(event) {
			event.preventDefault();
			
			let target = $(this).data('target');
			$('#menu .active').toggleClass('active', false);
			currentSection = target;
			
			if(target == 'hidden-sections') {
				$('#title').text('Manage Hidden Sections');
			} else {
				let menuLink = $('#menu .wt-link[data-target="' + target + '"]');
				menuLink.toggleClass('active', true);
				$('#title').text(menuLink.text());
			}
				
			if(['wt-info', 'hidden-sections'].indexOf(target) == -1) {
				$('#title').append('<span class="toggle-hidden">' + (hiddenKeys.indexOf(target) == -1 ? 'Hide' : 'Unhide') + '</span>');
			}
			
			$('#wt-body > div:visible').hide();
			let shownSection = $('#' + target);
			shownSection.show();
			let wtBody = $('#wt-body');
			wtBody.scrollTop(0);
			if(typeof progress[target] !== 'undefined') {
				let markedLi = shownSection.find('ol > li[data-progress-idx="' + progress[target] + '"]');
				if(markedLi.length) {
					wtBody.scrollTop(markedLi.offset().top - wtBody.offset().top);
				}
			}
			
			return false;
		});
		$('#menu').find('.wt-link:first').trigger('click');
		
		// Hide section functionality
		$('#title').on('click', '.toggle-hidden', function(event) {
			event.preventDefault();
			
			hiddenIdx = hiddenKeys.indexOf(currentSection);
			if(hiddenIdx == -1) {
				hiddenKeys.push(currentSection);
				hidden[currentSection] = latestVersion;
				$(this).text('Unhide');
				
				let menuItem = $('#menu [data-target="' + currentSection + '"]');
				menuItem.parent().hide();
				$('#hidden-section-list').append([
					'<tr>',
						'<td><span class="wt-link" data-target="' + hiddenKeys[i] + '">' + menuItem.text() + '</span></td>',
						'<td>' + latestVersion.replace(/\-/g, '.') + '</td>',
						'<td><span class="toggle-hidden" data-unhide="' + hiddenKeys[i] + '">Unhide</span></td>',
					'</tr>'
				].join(''));
			} else {
				hiddenKeys.splice(hiddenIdx, 1);
				delete hidden[currentSection];
				$(this).text('Hide');
				$('#menu [data-target="' + currentSection + '"]').parent().show();
				$('#hidden-section-list').find('[data-unhide="' + currentSection + '"]').closest('tr').remove();
			}
			
			Cookies.set('wt-hidden', JSON.stringify(hidden), {expires: 365});
			
			return false;
		});
		
		// Unhide via Manage Hidden Sections
		$('#hidden-section-list').on('click', '.toggle-hidden', function(event) {
			event.preventDefault();
		
			let section = $(this).data('unhide'),
				hiddenIdx = hiddenKeys.indexOf(section);
			
			if(hiddenIdx != -1) {
				hiddenKeys.splice(hiddenIdx, 1);
				delete hidden[section];
				Cookies.set('wt-hidden', JSON.stringify(hidden), {expires: 365});
			}
			
			$('#menu [data-target="' + section + '"]').parent().show();
			$(this).closest('tr').remove();
		
			return false;
		});
		
		// Highlight section functionality
		let highlightStyle = $('<style>');
		highlightStyle.appendTo('head');
		
		$('#highlight-menu').on('click', '.highlight-link', function(event) {
			event.preventDefault();
			
			if($(this).hasClass('active')) {
				return false;
			}
			
			$('#highlight-menu .active').toggleClass('active', false);
			$(this).toggleClass('active', true);
			
			if($(this).data('highlight') == 'none') {
				highlightStyle.text('');
			} else {
				highlightStyle.text('.new-' + $(this).data('highlight') + ' { color: rgb(100, 255, 150); }');
			}
			
			return false;
		});
		
		// Build highlight section
		for(let i = 0; i < versions.length; i++) {
			$('#highlight-menu ul:first').append('<li><span class="highlight-link" data-highlight="' + versions[i] + '">New in ' + versions[i].replace(/\-/g, '.') + '</span></li>');
		}
		
		if(versions.length == 0) {
			$('#highlight-menu .highlight-link:first').trigger('click');
		} else {
			$('#highlight-menu .highlight-link[data-highlight="' + versions[0] + '"]').trigger('click');
		}
		
		// Toggle menu sort order
		let menuIndex = 0,
			menuList = [],
			menuElement = $('#menu > ul');
			
		$('> li', menuElement).each(function() {
			$(this).data('index', menuIndex++);
			menuList.push($(this));
		});
		
		$('#toggle-sort').on('click', function(event) {
			event.preventDefault();
			
			if($(this).hasClass('active')) {
				menuList.sort(function(a, b) {
					return a.data('index') - b.data('index');
				});
				
				$(this).toggleClass('active', false);
			} else {
				menuList.sort(function(a, b) {
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
				
				$(this).toggleClass('active', true);
			}
				
			for(let i = 0; i < menuList.length; i++) {
				menuList[i].appendTo(menuElement);
			}
			
			return false;
		});
	}
})(jQuery);