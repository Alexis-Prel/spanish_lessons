// Spanish Verb Trainer - Main Script

document.addEventListener('DOMContentLoaded', function() {
    const sentenceBox = document.getElementById('sentence-box');
    const verbForm = document.getElementById('verb-form');
    const statusBar = document.getElementById('status-bar');
    const radios = document.querySelectorAll('input[name="verb"]');
    const downloadBtn = document.getElementById('download-btn');
    const loadBtn = document.getElementById('load-btn');
    const fileInput = document.getElementById('file-input');
    const nextBtn = document.getElementById('next-btn');

    let samples = [];
    let shuffledSamples = [];
    let currentIndex = 0;
    let currentBlankIndex = 0;
    let blanks = [];
    let currentTokens = [];
    let filledBlanks = {};
    let correctCount = 0;
    let totalCount = 0;
    let userAnswers = [];
    const STORAGE_KEY = 'serEstarAnswers';
    const GAMMA = 0.95;
    let alpha_ser = 0, beta_ser = 0, alpha_estar = 0, beta_estar = 0;
    let N_ser = 0, N_estar = 0;
    let performanceChart = null;
    let isProcessing = false;
    let isWaitingForNext = false;

    // Load samples from JSON file
    fetch('samples.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            samples = data;
            initializeTrainer();
        })
        .catch(error => {
            console.error('Error loading samples:', error);
            sentenceBox.textContent = 'Error loading sentences. Please check the console.';
            statusBar.textContent = 'Error';
        });

    function initializeTrainer() {
        // Create a copy and shuffle
        shuffledSamples = [...samples];
        shuffleArray(shuffledSamples);
        
        currentIndex = 0;
        correctCount = 0;
        totalCount = 0;
        
        showCurrentSentence();
        statusBar.textContent = 'Ready - Use 1 for ser, 2 for estar';
    }

    // Fisher-Yates shuffle algorithm
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function updateEWMAFromAnswers() {
        // Reset to initial state
        alpha_ser = 0;
        beta_ser = 0;
        alpha_estar = 0;
        beta_estar = 0;
        N_ser = 0;
        N_estar = 0;

        // Process all answers in order
        for (const answer of userAnswers) {
            const truth = answer.truth;
            const user = answer.user;

            if (truth === 'ser') {
                N_ser++;
                if (user === 'ser') {
                    alpha_ser = GAMMA * alpha_ser + 1;
                    beta_ser = GAMMA * beta_ser;
                } else {
                    alpha_ser = GAMMA * alpha_ser;
                    beta_ser = GAMMA * beta_ser + 1;
                }
            } else if (truth === 'estar') {
                N_estar++;
                if (user === 'estar') {
                    alpha_estar = GAMMA * alpha_estar + 1;
                    beta_estar = GAMMA * beta_estar;
                } else {
                    alpha_estar = GAMMA * alpha_estar;
                    beta_estar = GAMMA * beta_estar + 1;
                }
            }
        }
    }

    function generateChartData() {
        updateEWMAFromAnswers();

        // Build cumulative data for the chart
        let serData = [];
        let estarData = [];
        let labels = [];
        let cumulativeN_ser = 0;
        let cumulativeN_estar = 0;
        let cumulativeCorrectSer = 0;
        let cumulativeCorrectEstar = 0;

        for (let i = 0; i < userAnswers.length; i++) {
            const answer = userAnswers[i];
            const truth = answer.truth;
            const user = answer.user;

            if (truth === 'ser') {
                cumulativeN_ser++;
                if (user === 'ser') {
                    cumulativeCorrectSer++;
                }
            } else if (truth === 'estar') {
                cumulativeN_estar++;
                if (user === 'estar') {
                    cumulativeCorrectEstar++;
                }
            }

            const probSer = cumulativeN_ser > 0 ? (cumulativeCorrectSer / cumulativeN_ser * 100) : 0;
            const probEstar = cumulativeN_estar > 0 ? (cumulativeCorrectEstar / cumulativeN_estar * 100) : 0;

            labels.push(i + 1);
            serData.push(probSer);
            estarData.push(probEstar);
        }

        return { labels, serData, estarData };
    }

    function initChart() {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;

        if (performanceChart) {
            performanceChart.destroy();
        }

        const chartData = generateChartData();

        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'P(ser correct) %',
                        data: chartData.serData,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'P(estar correct) %',
                        data: chartData.estarData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Probability (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'N samples'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Over Time (Cumulative Accuracy)'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    function updateSummaryText() {
        updateEWMAFromAnswers();

        const total_ser = alpha_ser + beta_ser;
        const total_estar = alpha_estar + beta_estar;

        const prob_ser = total_ser > 0 ? alpha_ser / total_ser : 0;
        const prob_estar = total_estar > 0 ? alpha_estar / total_estar : 0;

        const chartContainer = document.getElementById('chart-container');
        
        // Ensure canvas exists
        let canvas = document.getElementById('performance-chart');
        if (!canvas) {
            chartContainer.innerHTML = '<canvas id="performance-chart"></canvas>';
        }

        const summaryHtml = `
            <div class="chart-title">Performance Summary (EWMA)</div>
            <div class="chart-row">
                <span class="chart-label">P(ser correct):</span>
                <span class="chart-value">${(prob_ser * 100).toFixed(1)}%</span>
            </div>
            <div class="chart-row">
                <span class="chart-label">P(estar correct):</span>
                <span class="chart-value">${(prob_estar * 100).toFixed(1)}%</span>
            </div>
            <div class="chart-row">
                <span class="chart-label">N_ser:</span>
                <span class="chart-value">${N_ser}</span>
            </div>
            <div class="chart-row">
                <span class="chart-label">N_estar:</span>
                <span class="chart-value">${N_estar}</span>
            </div>
            <div class="chart-row">
                <span class="chart-label">Total answers:</span>
                <span class="chart-value">${userAnswers.length}</span>
            </div>
        `;

        // Remove existing summary elements
        const existingSummary = chartContainer.querySelector('.chart-title');
        if (existingSummary) {
            const elementsToRemove = [];
            let next = existingSummary.nextElementSibling;
            while (next && next.classList.contains('chart-row')) {
                elementsToRemove.push(next);
                next = next.nextElementSibling;
            }
            elementsToRemove.forEach(el => el.remove());
            existingSummary.remove();
        }

        // Add new summary
        chartContainer.insertAdjacentHTML('beforeend', summaryHtml);
    }

    function updateChartDisplay() {
        updateSummaryText();
        initChart();
    }

    function saveToLocalStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userAnswers));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            userAnswers = JSON.parse(saved);
            statusBar.textContent = 'Previous answers loaded from localStorage';
        }
    }

    function downloadAnswers() {
        const jsonl = userAnswers.map(a => JSON.stringify(a)).join('\n');
        const blob = new Blob([jsonl], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ser_estar_answers.jsonl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.trim().split('\n');
            const loadedAnswers = [];
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        loadedAnswers.push(JSON.parse(line));
                    } catch (err) {
                        console.error('Error parsing line:', line, err);
                    }
                }
            }
            
            userAnswers = loadedAnswers;
            saveToLocalStorage();
            statusBar.textContent = `Loaded ${loadedAnswers.length} answers from file`;
            updateChartDisplay();
        };
        reader.readAsText(file);
    }

    function showCurrentSentence() {
        // Hide next button when showing a new sentence
        nextBtn.style.display = 'none';
        isWaitingForNext = false;
        
        if (currentIndex >= shuffledSamples.length) {
            // All sentences completed
            sentenceBox.textContent = 'All sentences completed! Score: ' + correctCount + '/' + totalCount;
            statusBar.textContent = 'Complete - Press F5 to restart';
            return;
        }

        const currentSample = shuffledSamples[currentIndex];
        
        // Store the actual tokens for this sentence
        currentTokens = currentSample.tokens || currentSample.blanked || [];
        
        // Find all blanks and their correct verbs
        const blanked = currentSample.blanked || currentSample.tokens || [];
        const lemmas = currentSample.lemmas || [];
        
        blanks = [];
        filledBlanks = {};
        
        for (let i = 0; i < blanked.length; i++) {
            if (blanked[i] === '_____') {
                // Find the corresponding lemma
                let correctVerb = null;
                if (i < lemmas.length) {
                    if (lemmas[i] === 'ser') {
                        correctVerb = 'ser';
                    } else if (lemmas[i] === 'estar') {
                        correctVerb = 'estar';
                    }
                }
                blanks.push({ position: i, correctVerb: correctVerb || '' });
            }
        }
        
        currentBlankIndex = 0;
        displayCurrentBlank();
    }
    
    function displayCurrentBlank() {
        const currentSample = shuffledSamples[currentIndex];
        const blanked = currentSample.blanked || currentSample.tokens || [];
        
        // Build HTML with current blank highlighted and filled blanks replaced
        let htmlParts = [];
        for (let i = 0; i < blanked.length; i++) {
            const token = blanked[i];
            const isBlank = token === '_____';
            const isCurrentBlank = isBlank && currentBlankIndex < blanks.length && blanks[currentBlankIndex].position === i;
            const isFilled = filledBlanks.hasOwnProperty(i);
            
            if (isFilled) {
                // This blank has been filled, show the actual token
                const actualToken = currentTokens[i] || filledBlanks[i];
                htmlParts.push(actualToken);
            } else if (isCurrentBlank) {
                // This is the current blank to fill, highlight it
                htmlParts.push('<span class="highlighted">' + token + '</span>');
            } else {
                // Regular token or future blank
                htmlParts.push(token);
            }
            // Add space between tokens (but not before punctuation that shouldn't have space)
            if (i < blanked.length - 1) {
                htmlParts.push(' ');
            }
        }
        
        sentenceBox.innerHTML = htmlParts.join('');
        
        // Store the correct answer for the current blank
        if (currentBlankIndex < blanks.length) {
            verbForm.dataset.correctAnswer = blanks[currentBlankIndex].correctVerb;
        } else {
            verbForm.dataset.correctAnswer = '';
        }
        
        // Reset radio buttons
        radios.forEach(radio => {
            radio.checked = false;
            radio.disabled = false;
        });
        
        // Update status
        const blankInfo = currentBlankIndex < blanks.length ? ` (blank ${currentBlankIndex + 1} of ${blanks.length})` : '';
        statusBar.textContent = `Sentence ${currentIndex + 1} of ${shuffledSamples.length}` + blankInfo;
    }

    function advanceToNextQuestion() {
        // Only process if we're waiting for manual advancement
        if (!isWaitingForNext) return;
        
        // Hide the next button
        nextBtn.style.display = 'none';
        isWaitingForNext = false;
        
        // Clear feedback classes
        sentenceBox.classList.remove('correct', 'incorrect');
        
        // Enable radio buttons for next question
        radios.forEach(radio => radio.disabled = false);
        
        // Check if there are more blanks in the current sentence
        if (currentBlankIndex + 1 < blanks.length) {
            // Move to next blank in the same sentence
            currentBlankIndex++;
            displayCurrentBlank();
        } else {
            // All blanks in this sentence are done, move to next sentence
            currentIndex++;
            showCurrentSentence();
        }
    }

    function moveToNextSentence(forceAdvance = false) {
        // Prevent overlapping submissions
        if (isProcessing) return;
        isProcessing = true;

        // Get user's selection
        const selectedVerb = document.querySelector('input[name="verb"]:checked');
        const correctAnswer = verbForm.dataset.correctAnswer;
        
        if (selectedVerb) {
            totalCount++;
            
            // Record the user's answer
            userAnswers.push({
                user: selectedVerb.value,
                truth: correctAnswer
            });
            saveToLocalStorage();
            updateChartDisplay();
            
            // Store the user's answer for the current blank
            const currentBlank = blanks[currentBlankIndex];
            if (currentBlank) {
                filledBlanks[currentBlank.position] = currentTokens[currentBlank.position];
            }
            
            // Update sentence display with filled blank
            displayCurrentBlank();
            
            if (selectedVerb.value === correctAnswer) {
                correctCount++;
                sentenceBox.classList.add('correct');
                statusBar.textContent = 'Correct! ✓';
                answerWasCorrect = true;
            } else {
                sentenceBox.classList.add('incorrect');
                statusBar.textContent = `Wrong! It was "${correctAnswer}"`;
                answerWasCorrect = false;
            }
            
            // Disable radio buttons briefly to show feedback
            radios.forEach(radio => radio.disabled = true);
            
            // Always show next button and wait for user
            setTimeout(() => {
                isProcessing = false;
                isWaitingForNext = true;
                nextBtn.style.display = 'inline-block';
                nextBtn.focus();
            }, 100);
        } else {
            // No selection made, just move on
            setTimeout(() => {
                isProcessing = false;
                isWaitingForNext = true;
                nextBtn.style.display = 'inline-block';
                nextBtn.focus();
            }, 100);
        }
    }

    // Handle radio button selection - auto-submit when selected
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                moveToNextSentence();
            }
        });
    });

    // Handle 1 and 2 keys to select and auto-submit
    document.addEventListener('keydown', function(e) {
        if (e.key === '1') {
            radios[0].checked = true;
            moveToNextSentence();
            e.preventDefault();
        } else if (e.key === '2') {
            radios[1].checked = true;
            moveToNextSentence();
            e.preventDefault();
        } else if (e.key === 'Enter' && document.querySelector('input[name="verb"]:checked')) {
            // Also allow Enter key to submit when a radio is selected
            e.preventDefault();
            moveToNextSentence();
        }
    });

    // Load previous answers from localStorage on startup
    loadFromLocalStorage();
    // Initialize chart display (will show 0% if no answers yet)
    updateChartDisplay();

    // Download button
    downloadBtn.addEventListener('click', downloadAnswers);

    // Load button - triggers file input click
    loadBtn.addEventListener('click', function() {
        fileInput.click();
    });

    // File input change handler
    fileInput.addEventListener('change', handleFileUpload);

    // Next button click handler
    nextBtn.addEventListener('click', advanceToNextQuestion);
    
    // Also allow Enter key to trigger next when waiting
    document.addEventListener('keydown', function(e) {
        if (isWaitingForNext && e.key === 'Enter') {
            e.preventDefault();
            advanceToNextQuestion();
        }
    });
});
