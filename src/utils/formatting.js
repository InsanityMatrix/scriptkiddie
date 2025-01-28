import hljs from 'highlight.js';

function escapeHTML(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g,"&#039;");
}

function formatChat(message, document) {
    var showdown = require('showdown');
    let converter = new showdown.Converter();
    let formatted = converter.makeHtml(message.content);
    
    const container = document.createElement('div');
    container.innerHTML = formatted;
    container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    if (message.role == 'user') {
        formatted = '<strong>You:</strong>' + formatted;
        formatted = '<p style="color: black;">' + formatted + '</p>';
    }

    // Check if message starts with 'AI:'
    else if (message.role == 'assistant') {
        formatted = '<strong>AI:</strong>' + formatted;
        formatted = '<p style="color: gray;">' + formatted + '</p>';
    }
    else {
        return '';
    }
    return formatted;
}

module.exports = { escapeHTML, formatChat};