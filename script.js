document.addEventListener('DOMContentLoaded', () => {
    const voiceSearchButton = document.querySelector('.voice-search');
    const searchInput = document.querySelector('#search-input');
    const suggestionsContainer = document.querySelector('#suggestions-container');
    let currentSuggestions = [];
    let selectedIndex = -1;
    let userLocation = 'US'; // Default location
    let userLanguage = 'en'; // Default language

    // Reset search state
    function resetSearchState() {
        searchInput.value = '';
        suggestionsContainer.style.display = 'none';
        currentSuggestions = [];
        selectedIndex = -1;
    }

    // Handle page visibility changes
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // Page was loaded from back-forward cache
            resetSearchState();
        }
    });

    // Handle page load
    window.addEventListener('load', () => {
        resetSearchState();
    });

    // Get user's language from browser
    function getUserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.split('-')[0]; // Get primary language code
    }

    // Get user's location using IP geolocation
    async function getUserLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return data.country_code;
        } catch (error) {
            console.error('Error getting location:', error);
            return 'US'; // Default to US if location detection fails
        }
    }

    // Initialize user settings
    async function initializeUserSettings() {
        userLanguage = getUserLanguage();
        userLocation = await getUserLocation();
    }

    // Debounce function to limit API calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Fetch suggestions from Google Suggest API
    async function fetchSuggestions(query) {
        if (!query.trim()) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        try {
            // Using a CORS proxy to access Google's Suggest API with location and language parameters
            const response = await fetch(`https://cors-anywhere.herokuapp.com/https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}&hl=${userLanguage}&gl=${userLocation}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            currentSuggestions = data[1] || [];
            displaySuggestions();
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            // Fallback to basic suggestions if API fails
            currentSuggestions = [
                `${query} - Google Search`,
                `${query} images`,
                `${query} news`,
                `${query} weather`,
                `${query} maps`
            ];
            displaySuggestions();
        }
    }

    // Display suggestions in the container
    function displaySuggestions() {
        if (currentSuggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        suggestionsContainer.innerHTML = '';
        currentSuggestions.forEach((suggestion, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <i class="fas fa-search"></i>
                <span class="suggestion-text">${suggestion}</span>
                <span class="suggestion-shortcut">${index === 0 ? 'Enter' : `Alt+${index}`}</span>
            `;
            div.addEventListener('click', () => selectSuggestion(suggestion));
            suggestionsContainer.appendChild(div);
        });

        suggestionsContainer.style.display = 'block';
        updateSelectedSuggestion();
    }

    // Update the selected suggestion's style
    function updateSelectedSuggestion() {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            item.style.backgroundColor = index === selectedIndex ? '#f8f9fa' : '';
        });
    }

    // Handle suggestion selection
    function selectSuggestion(suggestion) {
        searchInput.value = suggestion;
        suggestionsContainer.style.display = 'none';
        performSearch(suggestion);
    }

    // Perform the search
    function performSearch(query) {
        if (query.includes('.') && !query.includes(' ')) {
            window.location.href = query.startsWith('http') ? query : `https://${query}`;
        } else {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
    }

    // Handle keyboard navigation
    function handleKeyDown(e) {
        if (suggestionsContainer.style.display === 'none') return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    selectSuggestion(currentSuggestions[selectedIndex]);
                } else {
                    performSearch(searchInput.value);
                }
                break;
            case 'Escape':
                suggestionsContainer.style.display = 'none';
                selectedIndex = -1;
                break;
        }
        updateSelectedSuggestion();
    }

    // Event listeners
    searchInput.addEventListener('input', debounce(() => {
        fetchSuggestions(searchInput.value);
    }, 300));

    searchInput.addEventListener('keydown', handleKeyDown);

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Voice search functionality
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            searchInput.value = text;
            fetchSuggestions(text);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        voiceSearchButton.addEventListener('click', () => {
            recognition.start();
            voiceSearchButton.style.color = '#ea4335';
        });

        recognition.onend = () => {
            voiceSearchButton.style.color = '#4285f4';
        };
    } else {
        voiceSearchButton.style.display = 'none';
        console.log('Speech recognition not supported');
    }

    // Initialize user settings when the page loads
    initializeUserSettings();
}); 