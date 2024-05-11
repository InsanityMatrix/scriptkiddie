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
    let formatted = escapeHTML(message).replace(/```([a-zA-Z0-9_]+)\n/g, '<pre class="overflow-auto w-full"><code class="language-$1 whitespace-pre-wrap">');
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

    if (message.startsWith('You:')) {
        formatted = formatted.replace(/You:/i, '<strong>You:</strong>');
        formatted = '<p style="color: black;">' + formatted + '</p>';
    }

    // Check if message starts with 'AI:'
    else if (message.startsWith('AI:')) {
        formatted = formatted.replace(/AI:/i, '<strong>AI:</strong>');
        formatted = '<p style="color: gray;">' + formatted + '</p>';
    }
    return formatted;
}

module.exports = { escapeHTML, formatChat};