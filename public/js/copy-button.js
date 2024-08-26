document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('pre code').forEach(function(codeBlock) {
        const pre = codeBlock.parentElement; // Get the <pre> element
        const button = document.createElement('button'); // Create the button
        button.textContent = 'Copy'; // Set button text
        button.className = 'copy-button'; // Add the CSS class
        pre.style.position = 'relative'; // Ensure positioning context for the button
        pre.appendChild(button); // Add button to the <pre> element
        
        button.addEventListener('click', function() {
            const range = document.createRange();
            range.selectNode(codeBlock);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            
            try {
                document.execCommand('copy');
                alert('Code copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy code: ', err);
            }
            
            window.getSelection().removeAllRanges(); // Clear selection
        });
    });
});
