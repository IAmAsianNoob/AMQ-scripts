// ==UserScript==
// @name         AMQ user filter
// @namespace    http://tampermonkey.net/
// @version      0.1.2
// @description  Adds an input field that allows you to filter friends and all users
// @author       IAmAsianNoob
// @match        https://animemusicquiz.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animemusicquiz.com
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

if (document.getElementById('startPage')) return;

const ORIGINAL_NAMES = JSON.parse(localStorage.getItem('AMQOriginalPlayerNames')) ?? {};

function onInput(e) {
	if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
		const filters = e.target.value.toLowerCase().split(',').map(f => f.trim()).filter(s => s);
		if (filters.length) {
			applyFilter(filters);
		} else {
			showAllUsers();
		}
	}
}

function showAllUsers() {
	const allPlayers = [...Object.values(socialTab.onlineFriends), ...Object.values(socialTab.offlineFriends), ...Object.values(socialTab.allPlayerList._playerEntries)];
	for (const player of allPlayers) {
		player.show?.() || player.$html.show();
	}
}

function applyFilter(filters) {
	const allPlayers = [...Object.entries(socialTab.onlineFriends), ...Object.entries(socialTab.offlineFriends), ...Object.entries(socialTab.allPlayerList._playerEntries)];
	for (const [playerName, player] of allPlayers) {
		const originalName = ORIGINAL_NAMES[playerName] ?? '';
		if (filters.some(f => playerName.toLowerCase().indexOf(f) !== -1) || filters.some(f => originalName.toLowerCase().indexOf(f) !== -1)) {
			player.show?.() || player.$html.show();
		} else {
			player.hide?.() || player.$html.hide();
		}
	}
}

function addUserFilter() {
	const socialTab = document.getElementById('socialTab');

	const filterContainer = document.createElement('div');
	filterContainer.classList.add('ps', 'ps--theme_default', 'ps--active-y');

	const input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.setAttribute('placeholder', 'Filter users');
	input.id = 'userFilterInput';

	input.addEventListener('input', onInput);

	socialTab.insertBefore(input, socialTab.children[0]);
}

function addListeners() {
	new Listener('online user change', user => {
		setTimeout(() => {
			const filter = document.getElementById('userFilterInput').value;
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
	#userFilterInput {
		width: 100%;
		background-color: #424242;
		border: none;
		padding: 2px 12px;
		border-radius: 2px;
	}
`);


setup();