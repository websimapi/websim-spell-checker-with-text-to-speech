document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('word-input');
    const checkButton = document.getElementById('check-button');
    const spellingResult = document.getElementById('spelling-result');
    const spellingFeedback = document.getElementById('spelling-feedback');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const suggestionsList = document.getElementById('suggestions-list');
    const voiceSelect = document.getElementById('voice-select');

    // Create speech synthesis instance
    const speechSynthesis = window.speechSynthesis;
    let voices = [];
    let selectedVoice = null;
    
    // Check if the browser supports speech synthesis
    if (!speechSynthesis) {
        alert("Your browser doesn't support Text to Speech. Please try a different browser.");
    }

    // Function to get the best English American female voice
    function getEnglishAmericanFemaleVoice() {
        const allVoices = speechSynthesis.getVoices();
        
        // Filter for English US female voices
        let femaleVoices = allVoices.filter(voice => 
            voice.lang.includes('en-US') && 
            (voice.name.toLowerCase().includes('female') || 
             !voice.name.toLowerCase().includes('male'))
        );
        
        // If no specific female voices found, try any US English voice
        if (femaleVoices.length === 0) {
            femaleVoices = allVoices.filter(voice => voice.lang.includes('en-US'));
        }
        
        // If still no voices, try any English voice
        if (femaleVoices.length === 0) {
            femaleVoices = allVoices.filter(voice => voice.lang.includes('en'));
        }
        
        return femaleVoices.length > 0 ? femaleVoices[0] : allVoices[0];
    }
    
    // Initialize voice
    function initializeVoice() {
        selectedVoice = getEnglishAmericanFemaleVoice();
        console.log("Selected voice:", selectedVoice ? selectedVoice.name : "None available");
    }
    
    // Initialize voice when available
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = initializeVoice;
    } else {
        initializeVoice();
    }

    // Function to speak text
    function speakText(text) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set the selected voice
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        // Adjust settings if needed
        utterance.rate = 1.0; // Speed of speech (0.1 to 10)
        utterance.pitch = 1.0; // Pitch (0 to 2)
        
        // Speak the text
        speechSynthesis.speak(utterance);
    }

    // Function to check spelling and get suggestions
    async function checkSpelling(word) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const data = await response.json();
            
            if (response.ok) {
                // Word is correctly spelled
                spellingFeedback.innerHTML = `<span class="correct">"${word}"</span> is spelled correctly!`;
                suggestionsContainer.classList.add('hidden');
                
                // Speak the word
                speakText(word);
                
                return true;
            } else {
                // Word is misspelled, get suggestions
                if (data.title === "No Definitions Found") {
                    spellingFeedback.innerHTML = `<span class="incorrect">"${word}"</span> might be misspelled.`;
                    
                    // Get spelling suggestions
                    const suggestionsResponse = await fetch(`https://api.datamuse.com/words?sp=${word}*&max=5`);
                    const suggestions = await suggestionsResponse.json();
                    
                    if (suggestions.length > 0) {
                        suggestionsContainer.classList.remove('hidden');
                        suggestionsList.innerHTML = '';
                        
                        suggestions.forEach(suggestion => {
                            const li = document.createElement('li');
                            li.textContent = suggestion.word;
                            li.addEventListener('click', () => {
                                wordInput.value = suggestion.word;
                                checkSpelling(suggestion.word);
                            });
                            suggestionsList.appendChild(li);
                        });
                    } else {
                        suggestionsContainer.classList.add('hidden');
                    }
                    
                    // Speak the misspelled word message
                    speakText(`"${word}" might be misspelled.`);
                    
                    return false;
                }
            }
        } catch (error) {
            console.error("Error checking spelling:", error);
            spellingFeedback.innerHTML = "Error checking spelling. Please try again.";
            suggestionsContainer.classList.add('hidden');
            return false;
        }
    }

    // Event listener for the check button
    checkButton.addEventListener('click', () => {
        const word = wordInput.value.trim();
        
        if (word) {
            spellingResult.classList.remove('hidden');
            checkSpelling(word);
        } else {
            spellingResult.classList.add('hidden');
        }
    });

    // Event listener for Enter key in the input field
    wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkButton.click();
        }
    });
});