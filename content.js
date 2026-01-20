// content.js

let lastResult = null;

// Pre-load audio objects
const passedAudio = new Audio(chrome.runtime.getURL("assets/passed.mp3.mp4"));
const wastedAudio = new Audio(chrome.runtime.getURL("assets/wasted.mp3.mp4"));

// Attempt to unlock audio on first user interaction
let audioUnlocked = false;
document.addEventListener('click', () => {
    if (audioUnlocked) return;

    // Quickly play and pause to whitelist these audio elements in Chrome
    passedAudio.volume = 0;
    wastedAudio.volume = 0;

    const p1 = passedAudio.play();
    const p2 = wastedAudio.play();

    Promise.all([p1, p2]).then(() => {
        passedAudio.pause();
        wastedAudio.pause();
        passedAudio.currentTime = 0;
        wastedAudio.currentTime = 0;
        passedAudio.volume = 1;
        wastedAudio.volume = 1;
        audioUnlocked = true;
        console.log("Audio unlocked successfully via click.");
    }).catch(e => console.log("Audio unlock attempt failed (normal if brief click):", e));
}, { once: true });


// Function to play sound and show overlay
function triggerEffect(type) {
    // Prevent spamming the effect if it's already showing or was just shown for this result
    if (document.getElementById('gta-overlay')) return;

    console.log(`Triggering ${type} effect`);

    const overlay = document.createElement('div');
    overlay.id = 'gta-overlay';

    const text = document.createElement('div');
    text.className = type === 'passed' ? 'gta-text passed' : 'gta-text wasted';
    text.innerText = type === 'passed' ? 'MISSION PASSED' : 'WASTED';

    overlay.appendChild(text);

    if (type === 'passed') {
        const subtext = document.createElement('div');
        subtext.className = 'gta-subtext';
        subtext.innerText = 'RESPECT +';
        overlay.appendChild(subtext);
    }

    document.body.appendChild(overlay);

    // Play Audio logic using pre-loaded objects
    const audioToPlay = type === 'passed' ? passedAudio : wastedAudio;

    // Ensure volume is up (in case unlock failed or reset)
    audioToPlay.volume = 1;
    audioToPlay.currentTime = 0;

    const playPromise = audioToPlay.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => console.log("Audio playing..."))
            .catch(e => {
                console.error(`Audio playback blocked/failed. Name: ${e.name}, Message: ${e.message}`);
                console.log("Audio URL:", audioToPlay.src);
            });
    }

    // Remove after a few seconds
    setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 1000);
    }, 4000);
}

// Observer to watch for submission results
// LeetCode structure is complex, we look for key substrings in the body or specific containers
const observer = new MutationObserver((mutations) => {
    // Optimization: Check if we are even on a submission view. 
    // In strict LeetCode SPA, simpler to just scan text content changes of specific target areas if possible.
    // However, finding the exact container is hard without selectors.
    // We will look for specific text in the whole document body but debounced/throttled if possible, 
    // or better, target the likely result container.

    // Attempting to find the result container. 
    // Usually "Status: Accepted" or similar text appears.

    const textContent = document.body.innerText;

    if (textContent.includes("Accepted") && !textContent.includes("Pending")) {
        // Need to be careful not to trigger on past submissions list.
        // Usually dynamic results appear in a modal or a specific side panel.
        // Let's refine: look for the "Success" or "Wrong Answer" headers that appear after clicking Submit.

        // A common class for the result header in new UI is often elusive, but 'text-green-500' or 'text-red-500' 
        // are common tailwind classes used or semantic colors.

        const successElement = document.querySelector('[data-e2e-locator="submission-result-accepted-text"]'); // Example selector
        // Fallback to text search in highly specific way if possible, or just robust content check.

        // Using a more generic approach allows for UI updates.
        // Check for the "result-state" appearing.
    }
});


// Better Approach: 
// Capture the specific response elements.
// LeetCode's new dynamic layout uses varying classes. 
// We will try detecting the appearance of the "green" or "red" large text.

const targetNode = document.body;
const config = { childList: true, subtree: true };

const effectiveObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    const text = node.innerText || "";

                    // Check for "Accepted" details
                    if (text.includes("Accepted") && text.includes("Runtime") && !lastResult) {
                        // Double check it's the main result header
                        const isMainHeader = node.querySelector('.text-green-500') || node.querySelector('.text-green-s') || text.startsWith("Accepted");
                        if (isMainHeader) {
                            triggerEffect('passed');
                            lastResult = 'passed';
                            setTimeout(() => lastResult = null, 5000); // Reset
                        }
                    }

                    // Check for "Wrong Answer", "Time Limit Exceeded", "Runtime Error"
                    if ((text.includes("Wrong Answer") || text.includes("Time Limit Exceeded") || text.includes("Runtime Error")) && !lastResult) {
                        const isMainHeader = node.querySelector('.text-red-500') || node.querySelector('.text-red-s') || text.startsWith("Wrong Answer");
                        if (isMainHeader) {
                            triggerEffect('wasted');
                            lastResult = 'wasted';
                            setTimeout(() => lastResult = null, 5000); // Reset
                        }
                    }
                }
            });
        }
    }
});

// Start observing
effectiveObserver.observe(targetNode, config);

// Manual trigger for testing (User can type `triggerTestPass()` in console)
window.triggerTestPass = () => triggerEffect('passed');
window.triggerTestFail = () => triggerEffect('wasted');
