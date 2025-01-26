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
    let formatted = escapeHTML(message.content).replace(/```([a-zA-Z0-9_]+)\n/g, '<pre class="overflow-auto w-full"><code class="language-$1 whitespace-pre-wrap">');
    formatted = formatted.replace(/```/g, '</code></pre>');

    const lastPre = formatted.lastIndexOf('<pre>');
    const lastCode = formatted.lastIndexOf('</code></pre>');

    if (lastPre > lastCode) {
        formatted += '</code></pre>';
    }
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
        return;
    }
    return formatted;
}

module.exports = { escapeHTML, formatChat};