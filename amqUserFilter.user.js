// ==UserScript==
// @name         AMQ user filter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add an input field that allows you to filter friends and all users
// @author       IAmAsianNoob
// @match        https://animemusicquiz.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animemusicquiz.com
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

if (document.getElementById('startPage')) return;

function onInput(e) {
	if (e.inputType === 'insertText' || e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
		const filter = e.target.value.toLowerCase();
		if (filter) {
			applyFilter(filter);
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

function applyFilter(filter) {
	const allPlayers = [...Object.entries(socialTab.onlineFriends), ...Object.entries(socialTab.offlineFriends), ...Object.entries(socialTab.allPlayerList._playerEntries)];
	for (const [playerName, player] of allPlayers) {
		if (playerName.toLowerCase().indexOf(filter) !== -1) {
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