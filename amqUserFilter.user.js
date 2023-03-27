// ==UserScript==
// @name         AMQ user filter
// @namespace    http://tampermonkey.net/
// @version      0.1.3
// @description  Adds an input field that allows you to filter friends and all users
// @author       IAmAsianNoob
// @match        https://animemusicquiz.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animemusicquiz.com
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @updateURL    https://github.com/IAmAsianNoob/AMQ-scripts/raw/main/amqUserFilter.user.js
// @downloadURL  https://github.com/IAmAsianNoob/AMQ-scripts/raw/main/amqUserFilter.user.js
// ==/UserScript==

'use strict';

if (document.getElementById('startPage')) return;

const ORIGINAL_NAMES = JSON.parse(localStorage.getItem('AMQOriginalPlayerNames')) ?? {};
let matchCase = false;

function onInput(e) {
	if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward' ||
		e.inputType === 'insertFromPaste' || e.inputType === 'deleteByCut') {
		const input = e.target.value;
		const filters = (matchCase ? input : input.toLowerCase()).split(/[,/ ]/g).filter(f => f.trim());
		if (filters.length) {
			applyFilter(filters);
		} else {
			showAllUsers();
		}
	}
}

function showAllUsers() {
	document.getElementById('clear-user-filter-input').classList.add('hide');
	const allPlayers = [...Object.values(socialTab.onlineFriends), ...Object.values(socialTab.offlineFriends), ...Object.values(socialTab.allPlayerList._playerEntries)];
	for (const player of allPlayers) {
		player.show?.() || player.$html.show();
	}
}

function applyFilter(filters) {
	document.getElementById('clear-user-filter-input').classList.remove('hide');
	const allPlayers = [...Object.entries(socialTab.onlineFriends), ...Object.entries(socialTab.offlineFriends), ...Object.entries(socialTab.allPlayerList._playerEntries)];
	for (const [playerName, player] of allPlayers) {
		const originalName = ORIGINAL_NAMES[playerName] ?? '';
		if (filters.some(f => (matchCase ? playerName : playerName.toLowerCase()).indexOf(f) !== -1) ||
			filters.some(f => (matchCase ? originalName : originalName.toLowerCase()).indexOf(f) !== -1)) {
			player.show?.() || player.$html.show();
		} else {
			player.hide?.() || player.$html.hide();
		}
	}
}

function addUserFilter() {
	const socialTab = document.getElementById('socialTab');

	const filterContainer = document.createElement('div');
	filterContainer.id = 'user-filter';

	const input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.setAttribute('placeholder', 'Filter users');
	input.id = 'user-filter-input';

	input.addEventListener('input', onInput);
	input.addEventListener('keydown', e => {
		switch (e.key) {
			case 'Escape': {
				e.target.value = '';
				showAllUsers();
				break;
			}
			case 'c': {
				if (e.altKey) {
					matchCase = !matchCase;
					document.getElementById('user-filter-input').dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
				}
				break;
			}
		}
	});

	const matchCaseToggle = document.createElement('span');
	matchCaseToggle.id = 'match-case-toggle';
	matchCaseToggle.title = 'Match Case (Alt+C)'; // Note: capturing alt did not work for me on Firefox, this might be due to me setting privacy.resistFingerprinting to true
	if (matchCase) {
		matchCaseToggle.classList.add('selected');
	}
	matchCaseToggle.textContent = 'Aa';
	matchCaseToggle.addEventListener('click', () => {
		matchCase = !matchCase;
		if (matchCase) {
			matchCaseToggle.classList.add('selected');
		} else {
			matchCaseToggle.classList.remove('selected');
		}
		document.getElementById('user-filter-input').dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
	});

	const clearBtn = document.createElement('span');
	clearBtn.id = 'clear-user-filter-input';
	clearBtn.textContent = '✖';
	clearBtn.classList.add('hide');
	clearBtn.addEventListener('click', () => {
		const input = document.getElementById('user-filter-input');
		input.value = '';
		input.focus();
		showAllUsers();
	});

	filterContainer.append(input, matchCaseToggle);
	filterContainer.append(input, clearBtn);
	socialTab.insertBefore(filterContainer, socialTab.children[0]);
}

function addListeners() {
	new Listener('online user change', user => {
		setTimeout(() => {
			const filter = document.getElementById('user-filter-input').value;
			if (user.online && socialTab.allPlayerList._playerEntries[user.name] && filter) {
				if (user.name.toLowerCase().indexOf(filter) === -1) {
					socialTab.allPlayerList._playerEntries[user.name].hide();
				}
			}
		}, 0);
	}).bindListener();

	// This only triggers when a player profile is opened.
	// The original player name is only stored when it's not the name as the current player name 
	// I.e. it has been changed
	new Listener('player profile', profile => {
		const { name, originalName } = profile;
		if (name !== originalName && !ORIGINAL_NAMES[name]) {
			ORIGINAL_NAMES[name] = originalName;
			localStorage.setItem('AMQOriginalPlayerNames', JSON.stringify(ORIGINAL_NAMES));
		}
	}).bindListener();
}

function setup() {
	addUserFilter();
	addListeners();
}

// Yoinked the style from the input on the Expand Library page
AMQ_addStyle(`
#user-filter {
	background-color: #424242;
	padding-top: 2px;
}
#user-filter-input {
	width: 80%;
	border: none;
	padding: 2px 12px;
	border-radius: 2px;
	background-color: inherit;
}
#user-filter-input:focus {
	outline: none;
}
#clear-user-filter-input {
	position: relative;
	float: right;
	width: 10%;
	text-align: center;
}
#clear-user-filter-input:hover {
	cursor: pointer;
}
#match-case-toggle {
	position: relative;
	float: right;
	width: 10%;
	text-align: center;
	border-radius: 4px;
	font-size: 0.8em;
	line-height: 2em;
}
#match-case-toggle:hover {
	background-color: rgba(255, 255, 255, 0.1);
	cursor: pointer;
}
#match-case-toggle.selected {
	background-color: rgba(255, 255, 255, 0.2);
}
`);

setup();