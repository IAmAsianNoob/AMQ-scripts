// ==UserScript==
// @name         AMQ Chat Commands
// @namespace    http://tampermonkey.net/
// @version      0.1
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
	autoSkip: false
};
const settings = localStorage.getItem('amqChatCommandsConfig') ? JSON.parse(localStorage.getItem('amqChatCommandsConfig')) : DEFAULT_CONFIG;
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
	registerCommand('autokey', toggleAutoKey, { aliases: ['ak', 'akey'] });
	registerCommand('autoskip', toggleAutoSkip, { aliases: ['as', 'askip'] });
	registerCommand('autothrow', toggleAutoThrow, { aliases: ['at', 'athrow'] });
	registerCommand('roll', roll, { bubbleUp: true });
	registerCommand('ping', ping, { bubbleUp: true });
}

function setupCommandListener() {
	document.getElementById('gcInput').addEventListener('keydown', e => {
		const input = e.target.value.trim();

		if (e.key !== 'Enter') return;
		if (!input.startsWith(settings.COMMAND_PREFIX)) return;

		const args = input.split(/\s+/);
		const cmd = args[0].substring(settings.COMMAND_PREFIX.length);

		if (!(cmd in COMMANDS)) return;
		let command = COMMANDS[cmd];
		if (typeof command === 'string')
			command = COMMANDS[command];

		if (!command.bubbleUp) {
			e.preventDefault();
			e.target.value = '';
		}
		command.execute(args.slice(1));
	});
}

function setupListeners() {
	LISTENERS.set('autoSkip', new Listener('play next song', () => {
		quiz.skipClicked();
	}));
	LISTENERS.set('autoThrow', new Listener('play next song', () => {
		quiz.answerInput.setNewAnswer(settings.autoThrow);
	}));
}

function registerCommand(name, callback, { bubbleUp = false, aliases = [] } = {}) {
	const command = { execute: callback, bubbleUp };
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
	const answer = e.target.value || '';
	sendAMQCommand('quiz answer', {
		answer,
		isPlaying: true,
		volumeAtMax: false
	});
}

function toggleAutoSkip() {
	settings.autoSkip = !settings.autoSkip;
	if (settings.autoSkip) {
		sendAMQCommand('skip vote', { skipVote: true });
		LISTENERS.get('autoSkip').bindListener();
	} else {
		LISTENERS.get('autoSkip').unbindListener();
	}
	logToChat(`AutoSkip: ${settings.autoSkip ? 'Enabled' : 'Disabled'}`);
}

function toggleAutoThrow(arg) {
	if (arg?.length) {
		settings.autoThrow = translateShortcodeToUnicode(arg.join(' ')).text;
		quiz.answerInput.setNewAnswer(settings.autoThrow);
		LISTENERS.get('autoThrow').bindListener();
		logToChat(`Auto throwing: ${settings.autoThrow}`);
	} else if (settings.autoThrow) {
		LISTENERS.get('autoThrow').unbindListener();
		logToChat(`Stopped Auto throwing`);
	}
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

setup();