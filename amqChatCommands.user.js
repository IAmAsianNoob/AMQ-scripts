// ==UserScript==
// @name         AMQ Chat Commands
// @namespace    http://tampermonkey.net/
// @version      0.3.1
// @description  Yet another AMQ chat commands script
// @author       IAmAsianNoob
// @match        https://animemusicquiz.com/
// @icon         https://www.google.com/s2/favicons?domain=animemusicquiz.com
// @downloadURL  https://raw.githubusercontent.com/IAmAsianNoob/AMQ-scripts//main/amqChatCommands.user.js
// @updateURL    https://raw.githubusercontent.com/IAmAsianNoob/AMQ-scripts//main/amqChatCommands.user.js
// @grant        none
// ==/UserScript==

'use strict';

if (document.getElementById('startPage')) return;

const COMMANDS = {};
const DEFAULT_CONFIG = {
	COMMAND_PREFIX: '/',
	autoKey: false,
	autoSkip: false,
	autoReady: true,
	autoStart: false,
	dropdownToggle: false
};
const persistentSettings = JSON.parse(localStorage.getItem('amqChatCommandsConfig')) || {};
const settings = { ...DEFAULT_CONFIG, ...persistentSettings };
const LISTENERS = new Map();

const COMMAND_TYPES = {};
{
	['skip vote', 'quiz answer', 'song feedback', 'video ready', 'get all song names', 'quiz pause', 'return lobby vote'].forEach(c => COMMAND_TYPES[c] = 'quiz');
	['start game', 'game chat message', 'change to player', 'set ready'].forEach(c => COMMAND_TYPES[c] = 'lobby');
	['host room', 'spectate game', 'rejoin game'].forEach(c => COMMAND_TYPES[c] = 'roombrowser');
	['chat message', 'change social status'].forEach(c => COMMAND_TYPES[c] = 'social');
}

function setup() {
	setupCommandListener();
	setupListeners();

	registerCommand('autoKey', toggleAutoKey, { aliases: ['ak', 'akey'] });
	registerCommand('autoSkip', toggleAutoSkip, { aliases: ['askip'] });
	registerCommand('autoThrow', toggleAutoThrow, { aliases: ['at', 'athrow'] });
	registerCommand('roll', roll, { bubbleUp: true });
	registerCommand('ping', ping, { bubbleUp: true });
	registerCommand('autoReady', toggleAutoReady, { aliases: ['ar', 'aready'], persistent: true });
	registerCommand('autoStart', toggleAutoStart, { aliases: ['astart'], persistent: true });
	registerCommand('dropdown', toggleDropdown, { aliases: ['dd'] });
}

function setupCommandListener() {
	document.getElementById('gcInput').addEventListener('keydown', e => {
		const input = e.target.value.trim();

		if (e.key !== 'Enter') return;
		if (!input.startsWith(settings.COMMAND_PREFIX)) return;

		const args = input.split(/\s+/);
		let cmd = args[0].substring(settings.COMMAND_PREFIX.length);

		if (!(cmd in COMMANDS)) return;
		let command = COMMANDS[cmd];
		if (typeof command === 'string') {
			cmd = command;
			command = COMMANDS[cmd];
		}

		if (!command.bubbleUp) {
			e.preventDefault();
			e.target.value = '';
		}
		command.execute(args.slice(1));
		if (command.persistent) {
			updatePersistentSettings(cmd);
		}
	});
}

function setupListeners() {
	LISTENERS.set('autoSkip', [
			new Listener('play next song', () => {
			if (!quiz.skipController._toggled)
				quiz.skipClicked();
		})
	]);
	LISTENERS.set('autoThrow', [
		new Listener('play next song', () => {
			quiz.answerInput.setNewAnswer(settings.autoThrow);
		})
	]);
	LISTENERS.set('autoReady', [
		new Listener('Spectator Change To Player', player => {
			if (player.name === selfName)
				setTimeout(checkReady, 10);
		}),
		new Listener('quiz over', () => {
			setTimeout(checkReady, 10);
		}),
		new Listener('Room Settings Changed', () => {
			setTimeout(checkReady, 10);
		})
	]);
	LISTENERS.set('autoStart', [
		new Listener('Player Ready Change', () => {
			setTimeout(checkStart, 10);
		})
	]);
}

function registerCommand(name, callback, { bubbleUp = false, aliases = [], persistent = false } = {}) {
	// Need to find a better way of triggering the callback
	if (settings[name] === true && LISTENERS.has(name)) {
        for (const listener of LISTENERS.get(name)) {
            listener.bindListener();
        }
	}
	const command = { execute: callback, bubbleUp, persistent };
	if (name in COMMANDS) {
		logToChat(`⚠️ Trying to register command with already existing alias: ${name}`);
		return;
	}
	COMMANDS[name] = command;
	for (const alias of aliases) {
		if (alias in COMMANDS) {
			logToChat(`⚠️ Trying to register command with already existing alias: ${name}:${alias}`);
			continue;
		}
		COMMANDS[alias] = name;
	}

	if (persistent && !persistentSettings[name]) {
		updatePersistentSettings(name);
	}
}

function updatePersistentSettings(key) {
	persistentSettings[key] = settings[key];
	localStorage.setItem('', JSON.stringify(persistentSettings));
}

function sendAMQCommand(command, payload) {
	socket.sendCommand({
		command,
		type: COMMAND_TYPES[command],
		data: payload
	});
}

function logToChat(message) {
	const chatElem = document.getElementById('gcMessageContainer');
	const msgElem = document.createElement('li');
	msgElem.style = 'color: #aaa';
	msgElem.innerHTML = ' ' + message;
	chatElem.appendChild(msgElem);
	msgElem.scrollIntoView(false);
}

function sendChatMessage(message, isTeamMessage = false) {
	setTimeout(() => {
		sendAMQCommand('game chat message', {
			msg: message,
			teamMessage: isTeamMessage
		});
	}, 50);
}

function toggleAutoKey() {
	settings.autoKey = !settings.autoKey;
	if (settings.autoKey) {
		document.getElementById('qpAnswerInput').addEventListener('input', autoKey);
	} else {
		document.getElementById('qpAnswerInput').removeEventListener('input', autoKey);
	}
	logToChat(`AutoKey: ${settings.autoKey ? 'Enabled' : 'Disabled'}`);
}

function autoKey(e) {
	const answer = e.target.value.replace('​', '') || '​';
	sendAMQCommand('quiz answer', {
		answer,
		isPlaying: true,
		volumeAtMax: false
	});
}

function toggleAutoSkip() {
	settings.autoSkip = !settings.autoSkip;
	if (settings.autoSkip) {
		if (!quiz.skipController._toggled)
			quiz.skipClicked();
        for (const listener of LISTENERS.get('autoSkip')) {
            listener.bindListener();
        }
	} else {
        for (const listener of LISTENERS.get('autoSkip')) {
            listener.unbindListener();
        }
	}
	logToChat(`AutoSkip: ${settings.autoSkip ? 'Enabled' : 'Disabled'}`);
}

function toggleAutoThrow(arg) {
	if (arg?.length) {
		settings.autoThrow = translateShortcodeToUnicode(arg.join(' ')).text;
		quiz.answerInput.setNewAnswer(settings.autoThrow);
        for (const listener of LISTENERS.get('autoThrow')) {
            listener.bindListener();
        }
		logToChat(`Auto throwing: ${settings.autoThrow}`);
	} else if (settings.autoThrow) {
        for (const listener of LISTENERS.get('autoThrow')) {
            listener.unbindListener();
        }
		logToChat(`Stopped Auto throwing`);
	}
}

function toggleDropdown() {
	settings.dropdownToggle = !settings.dropdownToggle;
	if (settings.dropdownToggle) {
		document.getElementById('qpAnswerInput').nextElementSibling.classList.add('hide');
	} else {
		document.getElementById('qpAnswerInput').nextElementSibling.classList.remove('hide');
	}
	logToChat(`Dropdown Toggle: ${settings.dropdownToggle ? 'Enable' : 'Disabled'}`);
}

function roll(args) {
	let maxRoll = 100;
	if (args[0] != undefined) {
		maxRoll = parseInt(args[0].trim());
		if (isNaN(maxRoll)) {
			sendChatMessage("Please enter a valid number");
		}
	}
	sendChatMessage(` rolls ${Math.ceil(Math.random() * maxRoll)}`);
}

function ping(args) {
	let url;
	if (args[0] != undefined) {
		switch (args[0]) {
			case 'om':
			case 'openingsmoe':
				url = 'openings.moe';
				break;
			case 'amq':
				url = 'animemusicquiz.com';
				break;
			default:
				url = 'catbox.moe';
				break;
		}
	} else {
		url = 'catbox.moe';
	}
	const startTime = (new Date()).getTime()

	const fetchOptions = {
		method: 'HEAD'
	};
	fetch(`https://${url}`, fetchOptions)
		.then(() => {
			sendChatMessage("Response Time: " + (Date.now() - startTime) + 'ms');
		})
		.catch(() => {
			sendChatMessage("Response Time: " + (Date.now() - startTime) + 'ms');
		});
}

function toggleAutoReady() {
	settings.autoReady = !settings.autoReady;
	if (settings.autoReady) {
		checkReady();
		for (const listener of LISTENERS.get('autoReady')) {
			listener.bindListener();
		}
	} else {
		for (const listener of LISTENERS.get('autoReady')) {
			listener.unbindListener();
		}
	}
	logToChat(`AutoReady: ${settings.autoReady ? 'Enabled' : 'Disabled'}`);
}

function checkReady() {
	if (!settings.autoReady || !lobby.inLobby || lobby.isHost || lobby.isSpectator || lobby.isReady || quiz.gamMode === 'Ranked') return;
	lobby.fireMainButtonEvent();
}

function toggleAutoStart() {
	settings.autoStart = !settings.autoStart;
	if (settings.autoStart) {
		checkReady();
		for (const listener of LISTENERS.get('autoStart')) {
			listener.bindListener();
		}
	} else {
		for (const listener of LISTENERS.get('autoStart')) {
			listener.unbindListener();
		}
	}
	logToChat(`AutoStart: ${settings.autoStart ? 'Enabled' : 'Disabled'}`);
}

function checkStart() {
	if (!lobby.inLobby || !lobby.isHost || quiz.gameMode === "Ranked") return;
	for (const player of Object.values(lobby.players)) {
		if (!player.ready) return;
	}
	lobby.fireMainButtonEvent();
}

setup();