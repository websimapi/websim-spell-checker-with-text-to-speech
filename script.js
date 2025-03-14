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
        console.log("Available voices:", allVoices.map(v => `${v.name} (${v.lang})`));
        
        // First priority: explicitly female US English voices
        let femaleVoices = allVoices.filter(voice => 
            voice.lang.includes('en-US') && 
            (voice.name.toLowerCase().includes('female') || 
             voice.name.toLowerCase().includes('samantha') ||
             voice.name.toLowerCase().includes('victoria') ||
             voice.name.toLowerCase().includes('karen') ||
             voice.name.toLowerCase().includes('melody') ||
             voice.name.toLowerCase().includes('alex') || // Alex is usually female on some systems
             voice.name.toLowerCase().includes('siri') ||
             voice.name.toLowerCase().includes('lisa') ||
             voice.name.toLowerCase().includes('catherine') ||
             voice.name.toLowerCase().includes('allison') ||
             voice.name.toLowerCase().includes('susan') ||
             voice.name.toLowerCase().includes('ava') ||
             voice.name.toLowerCase().includes('lora') ||
             voice.name.toLowerCase().includes('zira'))
        );
        
        // Second priority: US English voices that don't have "male" in the name
        if (femaleVoices.length === 0) {
            femaleVoices = allVoices.filter(voice => 
                voice.lang.includes('en-US') && 
                !voice.name.toLowerCase().includes('male') &&
                !voice.name.toLowerCase().includes('guy') &&
                !voice.name.toLowerCase().includes('david') &&
                !voice.name.toLowerCase().includes('mark') &&
                !voice.name.toLowerCase().includes('daniel') &&
                !voice.name.toLowerCase().includes('thomas') &&
                !voice.name.toLowerCase().includes('james') &&
                !voice.name.toLowerCase().includes('john') &&
                !voice.name.toLowerCase().includes('robert') &&
                !voice.name.toLowerCase().includes('mike') &&
                !voice.name.toLowerCase().includes('william')
            );
        }
        
        // Third priority: any English voice that's likely female
        if (femaleVoices.length === 0) {
            femaleVoices = allVoices.filter(voice => 
                (voice.lang.includes('en') || voice.lang.startsWith('en')) && 
                (voice.name.toLowerCase().includes('female') ||
                 voice.name.toLowerCase().includes('samantha') ||
                 voice.name.toLowerCase().includes('victoria') ||
                 voice.name.toLowerCase().includes('karen') ||
                 voice.name.toLowerCase().includes('lisa') ||
                 voice.name.toLowerCase().includes('siri'))
            );
        }
        
        // Log found voices for debugging
        console.log("Found female voices:", femaleVoices.map(v => `${v.name} (${v.lang})`));
        
        // Last resort: first available voice (should rarely happen)
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
        
        // Reinitialize voice to ensure we have the latest available voices
        initializeVoice();
        
        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set the selected voice
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log("Speaking with voice:", selectedVoice.name);
        }
        
        // Force female voice characteristics
        utterance.rate = 1.0; // Speed of speech
        utterance.pitch = 1.3; // Higher pitch for more feminine sound
        utterance.volume = 1.0; // Full volume
        
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