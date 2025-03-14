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
    
    // Check if the browser supports speech synthesis
    if (!speechSynthesis) {
        alert("Your browser doesn't support Text to Speech. Please try a different browser.");
    }

    // Function to populate voice options
    function populateVoiceList() {
        voices = speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';
        
        // Filter only English voices
        const englishVoices = voices.filter(voice => 
            voice.lang.includes('en') || voice.lang.includes('EN'));
        
        if (englishVoices.length === 0) {
            console.warn("No English voices found. Using all available voices.");
            // Fall back to all voices if no English voices found
            englishVoices.push(...voices);
        }
        
        // Find default voice (English US female if available)
        let defaultVoice = null;
        const englishAmericanFemaleVoices = englishVoices.filter(voice => 
            (voice.lang.includes('en-US') || voice.lang.includes('en_US')) && 
            (voice.name.toLowerCase().includes('female') || !voice.name.toLowerCase().includes('male')));
        
        // Try to find any English female voice if no US specific one
        if (englishAmericanFemaleVoices.length === 0) {
            const englishFemaleVoices = englishVoices.filter(voice => 
                voice.name.toLowerCase().includes('female') || !voice.name.toLowerCase().includes('male'));
            
            if (englishFemaleVoices.length > 0) {
                defaultVoice = englishFemaleVoices[0];
            } else if (englishVoices.length > 0) {
                defaultVoice = englishVoices[0]; // Any English voice
            }
        } else {
            defaultVoice = englishAmericanFemaleVoices[0];
        }
        
        // Add voice verification information
        const voiceInfo = document.getElementById('voice-info');
        if (defaultVoice) {
            voiceInfo.textContent = `Default voice: ${defaultVoice.name} (${defaultVoice.lang})`;
            voiceInfo.classList.remove('error');
        } else {
            voiceInfo.textContent = "No suitable English voice found";
            voiceInfo.classList.add('error');
        }
        
        // Add voice options
        englishVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-voice-uri', voice.voiceURI);
            option.setAttribute('data-lang', voice.lang);
            
            if (defaultVoice && voice.voiceURI === defaultVoice.voiceURI) {
                option.selected = true;
            }
            
            voiceSelect.appendChild(option);
        });
        
        // Test the selected voice
        testSelectedVoice();
    }

    // Function to test if the selected voice works
    function testSelectedVoice() {
        if (voices.length === 0) {
            console.warn("No voices available to test");
            return;
        }
        
        const testUtterance = new SpeechSynthesisUtterance("test");
        testUtterance.volume = 0; // Silent test
        
        // Set the selected voice
        if (voiceSelect.selectedOptions && voiceSelect.selectedOptions.length > 0) {
            const selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-voice-uri');
            const selectedVoice = voices.find(voice => voice.voiceURI === selectedOption);
            
            if (selectedVoice) {
                testUtterance.voice = selectedVoice;
                const voiceInfo = document.getElementById('voice-info');
                testUtterance.onend = () => {
                    voiceInfo.textContent = `Active voice: ${selectedVoice.name} (${selectedVoice.lang})`;
                    voiceInfo.classList.remove('error');
                };
                testUtterance.onerror = () => {
                    voiceInfo.textContent = `Voice ${selectedVoice.name} failed to load`;
                    voiceInfo.classList.add('error');
                };
                
                try {
                    speechSynthesis.speak(testUtterance);
                } catch (e) {
                    console.error("Error testing voice:", e);
                }
            }
        }
    }

    // Initialize voices
    populateVoiceList();
    
    // Chrome loads voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoiceList;
    }

    // Function to speak text
    function speakText(text) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set the selected voice
        if (voiceSelect.selectedOptions && voiceSelect.selectedOptions.length > 0) {
            const selectedOption = voiceSelect.selectedOptions[0].getAttribute('data-voice-uri');
            const selectedVoice = voices.find(voice => voice.voiceURI === selectedOption);
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
            } else {
                console.warn("Selected voice not found, falling back to default");
            }
        }
        
        // Add error handling for mobile devices
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            document.getElementById('voice-info').textContent = "Error with voice playback. Try another voice.";
            document.getElementById('voice-info').classList.add('error');
        };
        
        // Speak the text
        speechSynthesis.speak(utterance);
    }

    // Test voices when selection changes
    voiceSelect.addEventListener('change', testSelectedVoice);

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