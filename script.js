// script.js
// =======================
// INITIALIZATION
// =======================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode
    initDarkMode();
    
    // Initialize the app based on current page
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    
    if (page === 'index.html' || page === '') {
        initCapturePage();
    } else if (page === 'timeline.html') {
        initTimelinePage();
    } else if (page === 'recall.html') {
        initRecallPage();
    }
    
    // Update quick stats on capture page
    updateQuickStats();
    
    // Load demo data if empty (for judges)
    autoLoadDemoIfEmpty();
});

// =======================
// DARK MODE
// =======================
function initDarkMode() {
    const toggleBtn = document.getElementById('darkModeToggle');
    if (!toggleBtn) return;
    
    // Check saved theme or prefer color scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    toggleBtn.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    });
}

// =======================
// DECISION DATA MANAGEMENT
// =======================
class DecisionManager {
    static getDecisions() {
        return JSON.parse(localStorage.getItem("continuumDecisions")) || [];
    }
    
    static saveDecisions(decisions) {
        localStorage.setItem("continuumDecisions", JSON.stringify(decisions));
    }
    
    static addDecision(decision) {
        const decisions = this.getDecisions();
        decisions.push(decision);
        this.saveDecisions(decisions);
        return decisions;
    }
    
    static deleteDecision(id) {
        let decisions = this.getDecisions();
        decisions = decisions.filter(d => d.id !== id);
        this.saveDecisions(decisions);
        return decisions;
    }
    
    static updateDecision(id, updatedData) {
        let decisions = this.getDecisions();
        const index = decisions.findIndex(d => d.id === id);
        if (index !== -1) {
            decisions[index] = { ...decisions[index], ...updatedData };
            this.saveDecisions(decisions);
        }
        return decisions;
    }
    
    static getDecisionById(id) {
        const decisions = this.getDecisions();
        return decisions.find(d => d.id === id);
    }
    
    static getFilteredDecisions(filter = {}, searchTerm = '') {
        let decisions = this.getDecisions();
        
        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            decisions = decisions.filter(d => 
                d.title.toLowerCase().includes(term) ||
                d.intent.toLowerCase().includes(term) ||
                d.finalDecision.toLowerCase().includes(term) ||
                d.reasoning.toLowerCase().includes(term) ||
                (d.tags && d.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        }
        
        // Apply timeframe filter
        if (filter.timeframe && filter.timeframe !== 'all') {
            const now = new Date();
            decisions = decisions.filter(d => {
                const decisionDate = new Date(d.timestamp);
                const diffTime = now - decisionDate;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                switch(filter.timeframe) {
                    case 'week': return diffDays <= 7;
                    case 'month': return diffDays <= 30;
                    case 'year': return diffDays <= 365;
                    default: return true;
                }
            });
        }
        
        // Apply tag filter
        if (filter.tag && filter.tag !== 'all') {
            decisions = decisions.filter(d => 
                d.tags && d.tags.some(tag => tag.toLowerCase() === filter.tag.toLowerCase())
            );
        }
        
        return decisions.sort((a, b) => b.timestamp - a.timestamp);
    }
}

// =======================
// CAPTURE PAGE FUNCTIONS
// =======================
function initCapturePage() {
    const form = document.getElementById("decisionForm");
    const demoBtn = document.getElementById("demoBtn");
    
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            saveDecision();
        });
    }
    
    if (demoBtn) {
        demoBtn.addEventListener("click", loadDemoData);
    }
}

function saveDecision() {
    const form = document.getElementById("decisionForm");
    
    // Get tags from input
    const tagsInput = document.getElementById("tags").value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    // Add analysis tags based on content
    const autoTags = analyzeContentForTags(
        document.getElementById("constraints").value,
        document.getElementById("reasoning").value
    );
    
    const decision = {
        id: Date.now(),
        title: document.getElementById("title").value.trim(),
        intent: document.getElementById("intent").value.trim(),
        constraints: document.getElementById("constraints").value.trim(),
        alternatives: document.getElementById("alternatives").value.trim(),
        finalDecision: document.getElementById("finalDecision").value.trim(),
        reasoning: document.getElementById("reasoning").value.trim(),
        emotionalState: parseInt(document.getElementById("emotionalState").value),
        tags: [...new Set([...tags, ...autoTags])], // Remove duplicates
        timestamp: new Date().getTime(),
        date: new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
    };
    
    DecisionManager.addDecision(decision);
    
    // Show success message
    showNotification("✅ Decision saved successfully!", "success");
    
    // Reset form
    form.reset();
    document.getElementById("emotionalState").value = 5;
    
    // Update quick stats
    updateQuickStats();
}

function analyzeContentForTags(constraints, reasoning) {
    const tags = [];
    const text = (constraints + ' ' + reasoning).toLowerCase();
    
    if (text.includes('time') || text.includes('deadline') || text.includes('urgent')) {
        tags.push('time-sensitive');
    }
    
    if (text.includes('money') || text.includes('budget') || text.includes('cost') || text.includes('paid')) {
        tags.push('financial');
    }
    
    if (text.includes('learn') || text.includes('experience') || text.includes('growth') || text.includes('skill')) {
        tags.push('learning');
    }
    
    if (text.includes('stress') || text.includes('emotional') || text.includes('feeling') || text.includes('anxiety')) {
        tags.push('emotional');
    }
    
    if (text.includes('work') || text.includes('job') || text.includes('career')) {
        tags.push('work');
    }
    
    if (text.includes('personal') || text.includes('life') || text.includes('family')) {
        tags.push('personal');
    }
    
    return tags;
}

// =======================
// TIMELINE PAGE FUNCTIONS
// =======================
function initTimelinePage() {
    // Load decisions
    loadTimelineDecisions();
    
    // Set up search functionality
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function() {
            loadTimelineDecisions();
        });
    }
    
    // Set up filter functionality
    const filterTimeframe = document.getElementById("filterTimeframe");
    const filterTag = document.getElementById("filterTag");
    const clearFilters = document.getElementById("clearFilters");
    
    if (filterTimeframe) {
        filterTimeframe.addEventListener("change", loadTimelineDecisions);
    }
    
    if (filterTag) {
        filterTag.addEventListener("change", loadTimelineDecisions);
    }
    
    if (clearFilters) {
        clearFilters.addEventListener("click", function() {
            if (filterTimeframe) filterTimeframe.value = "all";
            if (filterTag) filterTag.value = "all";
            if (searchInput) searchInput.value = "";
            loadTimelineDecisions();
        });
    }
    
    // Update statistics
    updateStatistics();
}

function loadTimelineDecisions(page = 1, itemsPerPage = 5) {
    const timeline = document.getElementById("timeline");
    const pagination = document.getElementById("pagination");
    
    if (!timeline) return;
    
    // Get filter values
    const filterTimeframe = document.getElementById("filterTimeframe");
    const filterTag = document.getElementById("filterTag");
    const searchInput = document.getElementById("searchInput");
    
    const filter = {
        timeframe: filterTimeframe ? filterTimeframe.value : 'all',
        tag: filterTag ? filterTag.value : 'all'
    };
    
    const searchTerm = searchInput ? searchInput.value : '';
    
    // Get filtered decisions
    const allDecisions = DecisionManager.getFilteredDecisions(filter, searchTerm);
    const totalDecisions = allDecisions.length;
    
    // Calculate pagination
    const totalPages = Math.ceil(totalDecisions / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const decisions = allDecisions.slice(startIndex, endIndex);
    
    // Clear timeline
    timeline.innerHTML = '';
    
    // Display decisions or empty state
    if (decisions.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No decisions found</h3>
                <p>${searchTerm ? 'Try a different search term or' : 'Capture your first decision to start building your memory timeline.'}</p>
                <a href="index.html" class="btn btn-primary">
                    <i class="fas fa-plus-circle"></i> Capture New Decision
                </a>
            </div>
        `;
    } else {
        decisions.forEach(decision => {
            const card = createDecisionCard(decision);
            timeline.appendChild(card);
        });
    }
    
    // Update pagination
    if (pagination && totalDecisions > itemsPerPage) {
        let paginationHTML = '';
        
        // Previous button
        if (page > 1) {
            paginationHTML += `<button onclick="loadTimelineDecisions(${page - 1})">Previous</button>`;
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === page) {
                paginationHTML += `<button class="active" onclick="loadTimelineDecisions(${i})">${i}</button>`;
            } else if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                paginationHTML += `<button onclick="loadTimelineDecisions(${i})">${i}</button>`;
            } else if (i === page - 2 || i === page + 2) {
                paginationHTML += `<span>...</span>`;
            }
        }
        
        // Next button
        if (page < totalPages) {
            paginationHTML += `<button onclick="loadTimelineDecisions(${page + 1})">Next</button>`;
        }
        
        pagination.innerHTML = paginationHTML;
    } else if (pagination) {
        pagination.innerHTML = '';
    }
    
    // Update statistics
    updateStatistics();
}

function createDecisionCard(decision) {
    const div = document.createElement("div");
    div.className = "timeline-card";
    div.setAttribute("data-id", decision.id);
    
    // Format tags
    const tagsHTML = decision.tags && decision.tags.length > 0 
        ? decision.tags.map(tag => `<span class="tag ${tag.toLowerCase()}">${tag}</span>`).join('')
        : '';
    
    // Format emotional state
    let emotionalIcon = "😊";
    if (decision.emotionalState <= 3) emotionalIcon = "😟";
    else if (decision.emotionalState <= 7) emotionalIcon = "😐";
    
    div.innerHTML = `
        <div class="timeline-card-header">
            <h3 class="timeline-card-title">${decision.title}</h3>
            <span class="timeline-card-date">${decision.date}</span>
        </div>
        
        ${tagsHTML ? `<div class="timeline-card-tags">${tagsHTML}</div>` : ''}
        
        <div class="timeline-card-content">
            <div class="timeline-card-section">
                <h4><i class="fas fa-bullseye"></i> Intent</h4>
                <p>${decision.intent}</p>
            </div>
            <div class="timeline-card-section">
                <h4><i class="fas fa-lock"></i> Constraints</h4>
                <p>${decision.constraints}</p>
            </div>
            <div class="timeline-card-section">
                <h4><i class="fas fa-check-circle"></i> Final Decision</h4>
                <p><strong>${decision.finalDecision}</strong></p>
            </div>
            <div class="timeline-card-section">
                <h4><i class="fas fa-brain"></i> Reasoning</h4>
                <p>${decision.reasoning}</p>
            </div>
        </div>
        
        <div class="timeline-card-footer">
            <div class="emotional-state">
                <span>Emotional State: ${emotionalIcon} (${decision.emotionalState}/10)</span>
            </div>
            <div class="timeline-card-actions">
                <button class="btn-icon delete-btn" onclick="deleteDecision(${decision.id})" title="Delete Decision">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon" onclick="analyzeDecision(${decision.id})" title="Analyze">
                    <i class="fas fa-chart-bar"></i>
                </button>
                <button class="btn-icon" onclick="editDecision(${decision.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// =======================
// DELETE & EDIT FUNCTIONS
// =======================
function deleteDecision(id) {
    if (confirm("Are you sure you want to delete this decision? This action cannot be undone.")) {
        DecisionManager.deleteDecision(id);
        showNotification("🗑️ Decision deleted successfully!", "success");
        
        // Reload the current view
        if (window.location.pathname.includes("timeline.html")) {
            loadTimelineDecisions();
        }
        
        updateQuickStats();
        updateStatistics();
    }
}

function editDecision(id) {
    const decision = DecisionManager.getDecisionById(id);
    if (!decision) return;
    
    // Redirect to index page with decision data
    localStorage.setItem('editDecision', JSON.stringify(decision));
    window.location.href = 'index.html';
}

// Check for edit decision on page load
document.addEventListener('DOMContentLoaded', function() {
    const editData = localStorage.getItem('editDecision');
    if (editData && window.location.pathname.includes('index.html')) {
        const decision = JSON.parse(editData);
        
        // Fill the form with decision data
        document.getElementById('title').value = decision.title || '';
        document.getElementById('intent').value = decision.intent || '';
        document.getElementById('constraints').value = decision.constraints || '';
        document.getElementById('alternatives').value = decision.alternatives || '';
        document.getElementById('finalDecision').value = decision.finalDecision || '';
        document.getElementById('reasoning').value = decision.reasoning || '';
        document.getElementById('tags').value = decision.tags ? decision.tags.join(', ') : '';
        document.getElementById('emotionalState').value = decision.emotionalState || 5;
        
        // Update form to edit mode
        const form = document.getElementById('decisionForm');
        const originalSubmit = form.onsubmit;
        
        form.onsubmit = function(e) {
            e.preventDefault();
            
            // Update the decision
            const updatedDecision = {
                ...decision,
                title: document.getElementById('title').value,
                intent: document.getElementById('intent').value,
                constraints: document.getElementById('constraints').value,
                alternatives: document.getElementById('alternatives').value,
                finalDecision: document.getElementById('finalDecision').value,
                reasoning: document.getElementById('reasoning').value,
                emotionalState: parseInt(document.getElementById('emotionalState').value),
                tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
                timestamp: Date.now(),
                date: new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })
            };
            
            DecisionManager.updateDecision(id, updatedDecision);
            showNotification("✅ Decision updated successfully!", "success");
            form.reset();
            form.onsubmit = originalSubmit; // Reset to original
            
            // Clear edit data
            localStorage.removeItem('editDecision');
        };
        
        // Change button text
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Decision';
        
        // Restore original button when form resets
        form.addEventListener('reset', function() {
            submitBtn.innerHTML = originalHTML;
            form.onsubmit = originalSubmit;
            localStorage.removeItem('editDecision');
        });
        
        showNotification("✏️ Editing decision: " + decision.title, "info");
    }
});

function analyzeDecision(id) {
    const decision = DecisionManager.getDecisionById(id);
    if (!decision) return;
    
    const analysis = `
        <div style="padding: 20px; max-width: 500px;">
            <h3 style="color: var(--primary); margin-bottom: 15px;">🔍 Analysis of "${decision.title}"</h3>
            
            <div style="margin-bottom: 15px;">
                <strong>Emotional State:</strong> ${decision.emotionalState}/10
                <div style="background: #e0e0e0; height: 10px; border-radius: 5px; margin-top: 5px;">
                    <div style="width: ${decision.emotionalState * 10}%; background: var(--primary); height: 100%; border-radius: 5px;"></div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Decision Quality Indicators:</strong><br>
                • Reasoning Length: ${decision.reasoning.length} characters<br>
                • Alternatives Considered: ${decision.alternatives.length > 100 ? "Detailed" : "Brief"}<br>
                • Constraints Documented: ${decision.constraints.length > 50 ? "Comprehensive" : "Minimal"}
            </div>
            
            <div style="margin-bottom: 15px;">
                <strong>Key Tags:</strong> ${decision.tags ? decision.tags.map(tag => `<span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px;">${tag}</span>`).join(' ') : "None"}
            </div>
            
            <div style="background: #f5f7fb; padding: 15px; border-radius: 8px; border-left: 4px solid var(--primary);">
                <strong>AI Insight:</strong><br>
                ${generateDecisionInsight(decision)}
            </div>
        </div>
    `;
    
    // Create modal for analysis
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    `;
    
    modalContent.innerHTML = analysis;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'Close';
    closeBtn.style.cssText = `
        background: var(--primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        margin: 20px auto;
        display: block;
    `;
    closeBtn.onclick = () => modal.remove();
    
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

function generateDecisionInsight(decision) {
    const insights = [];
    
    if (decision.reasoning.length < 100) {
        insights.push("📝 Brief reasoning - consider documenting more details for future reference.");
    }
    
    if (decision.emotionalState <= 3) {
        insights.push("😟 Made under emotional stress - this might affect decision quality.");
    }
    
    if (decision.constraints.toLowerCase().includes("time") && !decision.constraints.toLowerCase().includes("enough time")) {
        insights.push("⏰ Time-constrained decision - evaluate if time pressure led to optimal choice.");
    }
    
    if (decision.tags && decision.tags.includes("learning")) {
        insights.push("📚 Learning-focused decision - good for long-term growth.");
    }
    
    if (decision.tags && decision.tags.includes("financial")) {
        insights.push("💰 Financial decision - consider tracking outcomes for ROI analysis.");
    }
    
    return insights.length > 0 ? insights.join("<br>") : "✅ Well-documented decision with balanced considerations.";
}

function updateStatistics() {
    const decisions = DecisionManager.getDecisions();
    const totalDecisions = decisions.length;
    
    // Count by category
    let timeCount = 0;
    let moneyCount = 0;
    let learningCount = 0;
    
    decisions.forEach(d => {
        const constraints = d.constraints.toLowerCase();
        const reasoning = d.reasoning.toLowerCase();
        const tags = d.tags ? d.tags.map(tag => tag.toLowerCase()) : [];
        
        if (constraints.includes("time") || constraints.includes("deadline") || 
            tags.includes("time-sensitive") || tags.includes("urgent")) {
            timeCount++;
        }
        
        if (constraints.includes("money") || constraints.includes("budget") || 
            constraints.includes("cost") || tags.includes("financial")) {
            moneyCount++;
        }
        
        if (reasoning.includes("learn") || reasoning.includes("growth") || 
            reasoning.includes("experience") || tags.includes("learning")) {
            learningCount++;
        }
    });
    
    // Update UI elements if they exist
    const totalEl = document.getElementById("totalDecisions");
    const timeEl = document.getElementById("timeDecisions");
    const moneyEl = document.getElementById("moneyDecisions");
    const learningEl = document.getElementById("learningDecisions");
    
    if (totalEl) totalEl.textContent = totalDecisions;
    if (timeEl) timeEl.textContent = timeCount;
    if (moneyEl) moneyEl.textContent = moneyCount;
    if (learningEl) learningEl.textContent = learningCount;
}

// =======================
// AI RECALL PAGE FUNCTIONS
// =======================
function initRecallPage() {
    // Load recent decisions
    loadRecentDecisions();
    
    // Initialize chart
    initializeDecisionChart();
    
    // Generate initial insights
    generateRecall('patterns');
}

function loadRecentDecisions() {
    const recentList = document.getElementById("recentDecisionsList");
    if (!recentList) return;
    
    const decisions = DecisionManager.getDecisions()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
    
    if (decisions.length === 0) {
        recentList.innerHTML = `<p style="color: var(--gray); text-align: center;">No decisions yet. <a href="index.html">Capture one</a> to get started.</p>`;
        return;
    }
    
    recentList.innerHTML = decisions.map(decision => `
        <div class="recent-decision">
            <h4>${decision.title}</h4>
            <p>${decision.finalDecision.substring(0, 50)}${decision.finalDecision.length > 50 ? '...' : ''}</p>
            <small>${decision.date}</small>
        </div>
    `).join('');
}

function initializeDecisionChart() {
    const ctx = document.getElementById('decisionChart');
    if (!ctx) return;
    
    const decisions = DecisionManager.getDecisions();
    const last6Months = getLast6Months();
    
    // Count decisions by month
    const monthlyData = last6Months.map(month => {
        return decisions.filter(d => {
            const decisionDate = new Date(d.timestamp);
            return decisionDate.getMonth() === month.month && 
                   decisionDate.getFullYear() === month.year;
        }).length;
    });
    
    const monthNames = last6Months.map(m => m.name);
    
    // Destroy existing chart if it exists
    if (window.decisionChartInstance) {
        window.decisionChartInstance.destroy();
    }
    
    window.decisionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthNames,
            datasets: [{
                label: 'Decisions per Month',
                data: monthlyData,
                borderColor: '#4b7bec',
                backgroundColor: 'rgba(75, 123, 236, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function getLast6Months() {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            name: date.toLocaleDateString('en-US', { month: 'short' }),
            month: date.getMonth(),
            year: date.getFullYear()
        });
    }
    
    return months;
}

function generateRecall(type) {
    const decisions = DecisionManager.getDecisions();
    const output = document.getElementById("aiOutput");
    
    if (decisions.length === 0) {
        output.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-robot"></i>
                <h3>No Data Yet</h3>
                <p>Capture some decisions first to get AI insights.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-plus-circle"></i> Capture First Decision
                </a>
            </div>
        `;
        return;
    }
    
    // Show loading state
    output.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Analyzing Your Decisions...</h3>
            <p>Processing ${decisions.length} decisions for ${type} insights</p>
        </div>
    `;
    
    // Simulate AI processing
    setTimeout(() => {
        let insights = [];
        let title = "";
        
        switch(type) {
            case 'patterns':
                title = "Pattern Analysis";
                insights = analyzePatterns(decisions);
                break;
            case 'biases':
                title = "Cognitive Bias Detection";
                insights = detectBiases(decisions);
                break;
            case 'improvements':
                title = "Improvement Suggestions";
                insights = suggestImprovements(decisions);
                break;
            case 'sentiment':
                title = "Sentiment Analysis";
                insights = analyzeSentiment(decisions);
                break;
        }
        
        output.innerHTML = `
            <h3><i class="fas fa-lightbulb"></i> ${title}</h3>
            <p>Based on analysis of ${decisions.length} decisions in your memory:</p>
            <div class="insights-container">
                ${insights.map((insight, index) => `
                    <div class="ai-insight ${insight.type || ''}">
                        <div class="ai-insight-header">
                            <span class="ai-insight-title">${insight.title}</span>
                            ${insight.confidence ? `<span class="ai-insight-confidence">${insight.confidence}% confidence</span>` : ''}
                        </div>
                        <p>${insight.message}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }, 1000);
}

// AI analysis functions
function analyzePatterns(decisions) {
    const insights = [];
    
    // Time-based patterns
    const timeDecisions = decisions.filter(d => 
        d.constraints.toLowerCase().includes("time") || 
        d.tags?.includes("time-sensitive")
    ).length;
    
    if (timeDecisions > decisions.length * 0.3) {
        insights.push({
            title: "⏳ Time Pressure Pattern",
            message: `You make time-sensitive decisions in ${Math.round((timeDecisions/decisions.length)*100)}% of cases. Consider if artificial deadlines are helping or hurting decision quality.`,
            confidence: 85
        });
    }
    
    // Emotional patterns
    const avgEmotionalState = decisions.reduce((sum, d) => sum + (d.emotionalState || 5), 0) / decisions.length;
    
    if (avgEmotionalState < 4) {
        insights.push({
            title: "😟 Emotional State Alert",
            message: `Your average emotional state during decisions is ${avgEmotionalState.toFixed(1)}/10. Lower emotional states can lead to risk-averse or impulsive choices.`,
            type: "warning",
            confidence: 90
        });
    }
    
    // Decision reversal patterns
    const similarDecisions = findSimilarDecisions(decisions);
    if (similarDecisions.length > 0) {
        insights.push({
            title: "🔄 Recurring Decision Patterns",
            message: `Found ${similarDecisions.length} clusters of similar decisions. This suggests recurring themes in your life that might benefit from standardized decision frameworks.`,
            confidence: 75
        });
    }
    
    // Learning patterns
    const learningDecisions = decisions.filter(d => 
        d.reasoning.toLowerCase().includes("learn") || 
        d.tags?.includes("learning")
    ).length;
    
    if (learningDecisions > decisions.length * 0.4) {
        insights.push({
            title: "📚 Growth Mindset Detected",
            message: `${Math.round((learningDecisions/decisions.length)*100)}% of your decisions prioritize learning and growth. This is a strong indicator of long-term thinking.`,
            confidence: 88
        });
    }
    
    return insights;
}

function detectBiases(decisions) {
    const insights = [];
    
    // Check for confirmation bias
    const hasAlternatives = decisions.filter(d => 
        d.alternatives && d.alternatives.length > 50
    ).length;
    
    const alternativeRatio = hasAlternatives / decisions.length;
    
    if (alternativeRatio < 0.5) {
        insights.push({
            title: "🔍 Potential Confirmation Bias",
            message: `Only ${Math.round(alternativeRatio*100)}% of decisions thoroughly consider alternatives. This might indicate confirmation bias - seeking information that confirms pre-existing views.`,
            type: "warning",
            confidence: 80
        });
    }
    
    // Check for sunk cost fallacy
    const sunkCostIndicators = decisions.filter(d => 
        d.reasoning.toLowerCase().includes("already invested") ||
        d.reasoning.toLowerCase().includes("too late to change") ||
        d.reasoning.toLowerCase().includes("can't waste")
    ).length;
    
    if (sunkCostIndicators > 0) {
        insights.push({
            title: "💸 Sunk Cost Fallacy Alert",
            message: `Found ${sunkCostIndicators} decisions with language suggesting sunk cost thinking. Remember: past investments shouldn't dictate future decisions if better alternatives exist.`,
            type: "danger",
            confidence: 70
        });
    }
    
    // Check for emotional bias
    const highEmotionDecisions = decisions.filter(d => 
        d.emotionalState && (d.emotionalState <= 3 || d.emotionalState >= 8)
    ).length;
    
    if (highEmotionDecisions > decisions.length * 0.25) {
        insights.push({
            title: "😤 Emotional Decision Making",
            message: `${Math.round((highEmotionDecisions/decisions.length)*100)}% of decisions were made in high-emotion states. Consider implementing a "cooling off" period for important decisions.`,
            type: "warning",
            confidence: 82
        });
    }
    
    // Check for availability bias (recent decisions)
    const recentDecisions = decisions.slice(0, 5);
    const recentPatterns = analyzeRecentPatterns(recentDecisions, decisions);
    
    if (recentPatterns.isolated) {
        insights.push({
            title: "📰 Availability Bias Warning",
            message: "Your most recent decisions show different patterns than historical ones. This could be availability bias - overweighting recent, memorable information.",
            confidence: 75
        });
    }
    
    return insights;
}

function suggestImprovements(decisions) {
    const insights = [];
    
    // Check decision documentation quality
    const avgReasoningLength = decisions.reduce((sum, d) => sum + d.reasoning.length, 0) / decisions.length;
    
    if (avgReasoningLength < 100) {
        insights.push({
            title: "📝 Improve Documentation",
            message: `Your average reasoning length is ${Math.round(avgReasoningLength)} characters. More detailed reasoning improves future recall and learning. Aim for at least 200 characters.`,
            confidence: 85
        });
    }
    
    // Check for follow-up tracking
    const hasFollowUp = decisions.filter(d => d.tags?.includes("follow-up")).length;
    
    if (hasFollowUp < decisions.length * 0.1) {
        insights.push({
            title: "🔁 Add Decision Follow-ups",
            message: "Only a few decisions have follow-up tracking. Consider adding 'follow-up' tags to important decisions to review outcomes later.",
            confidence: 90
        });
    }
    
    // Suggest decision frameworks
    const frameworkUsed = decisions.filter(d => 
        d.reasoning.toLowerCase().includes("framework") ||
        d.reasoning.toLowerCase().includes("process") ||
        d.reasoning.toLowerCase().includes("method")
    ).length;
    
    if (frameworkUsed < decisions.length * 0.2) {
        insights.push({
            title: "⚙️ Use Decision Frameworks",
            message: `Only ${Math.round((frameworkUsed/decisions.length)*100)}% of decisions mention using a framework. Structured approaches like Cost-Benefit Analysis or Pro/Con lists can improve consistency.`,
            confidence: 88
        });
    }
    
    // Time allocation suggestion
    const quickDecisions = decisions.filter(d => 
        d.constraints.toLowerCase().includes("quick") ||
        d.constraints.toLowerCase().includes("immediate")
    ).length;
    
    if (quickDecisions > decisions.length * 0.4) {
        insights.push({
            title: "⏱️ Balance Decision Speed",
            message: `${Math.round((quickDecisions/decisions.length)*100)}% of decisions are made under time pressure. Consider if some decisions deserve more deliberate thinking time.`,
            confidence: 83
        });
    }
    
    return insights;
}

function analyzeSentiment(decisions) {
    const insights = [];
    
    // Overall sentiment trend
    const recentSentiment = calculateSentimentScore(decisions.slice(0, 5));
    const overallSentiment = calculateSentimentScore(decisions);
    
    if (recentSentiment > overallSentiment + 10) {
        insights.push({
            title: "📈 Improving Decision Sentiment",
            message: "Your recent decisions show more positive language than your historical average. This could indicate growing confidence or satisfaction.",
            confidence: 78
        });
    } else if (recentSentiment < overallSentiment - 10) {
        insights.push({
            title: "📉 Declining Decision Sentiment",
            message: "Your recent decisions show more negative language than your historical average. Consider if external factors are affecting your decision-making mood.",
            type: "warning",
            confidence: 76
        });
    }
    
    // Emotional state correlation with decision type
    const workDecisions = decisions.filter(d => d.tags?.includes("work"));
    const personalDecisions = decisions.filter(d => d.tags?.includes("personal"));
    
    if (workDecisions.length > 0 && personalDecisions.length > 0) {
        const avgWorkEmotion = workDecisions.reduce((sum, d) => sum + (d.emotionalState || 5), 0) / workDecisions.length;
        const avgPersonalEmotion = personalDecisions.reduce((sum, d) => sum + (d.emotionalState || 5), 0) / personalDecisions.length;
        
        if (Math.abs(avgWorkEmotion - avgPersonalEmotion) > 2) {
            insights.push({
                title: "🏢 Work/Personal Emotion Gap",
                message: `Significant emotion difference between work decisions (${avgWorkEmotion.toFixed(1)}/10) and personal decisions (${avgPersonalEmotion.toFixed(1)}/10).`,
                confidence: 82
            });
        }
    }
    
    // Constraint sentiment analysis
    const highConstraintDecisions = decisions.filter(d => d.constraints.length > 100);
    if (highConstraintDecisions.length > 0) {
        const constraintSentiment = calculateSentimentScore(highConstraintDecisions.map(d => d.constraints));
        
        if (constraintSentiment < 40) {
            insights.push({
                title: "🚧 Negative Constraint Language",
                message: "Your constraint descriptions tend to use negative language. Reframing constraints as challenges or parameters might improve decision mindset.",
                type: "warning",
                confidence: 79
            });
        }
    }
    
    return insights;
}

// Helper functions for AI analysis
function calculateSentimentScore(texts) {
    if (!texts || texts.length === 0) return 50;
    
    let totalScore = 0;
    let count = 0;
    
    const positiveWords = ["good", "great", "excellent", "positive", "happy", "satisfied", "confident", "optimistic", "success", "win"];
    const negativeWords = ["bad", "poor", "negative", "unhappy", "stressed", "anxious", "worried", "failure", "lose", "difficult"];
    
    texts.forEach(text => {
        if (typeof text === 'object') {
            text = text.reasoning + " " + text.constraints;
        }
        
        text = text.toLowerCase();
        let score = 50;
        
        positiveWords.forEach(word => {
            if (text.includes(word)) score += 5;
        });
        
        negativeWords.forEach(word => {
            if (text.includes(word)) score -= 5;
        });
        
        totalScore += Math.max(0, Math.min(100, score));
        count++;
    });
    
    return count > 0 ? totalScore / count : 50;
}

function findSimilarDecisions(decisions) {
    const clusters = [];
    const processed = new Set();
    
    for (let i = 0; i < decisions.length; i++) {
        if (processed.has(i)) continue;
        
        const cluster = [i];
        const decisionA = decisions[i];
        
        for (let j = i + 1; j < decisions.length; j++) {
            if (processed.has(j)) continue;
            
            const decisionB = decisions[j];
            
            // Calculate similarity score
            let similarity = 0;
            
            // Compare tags
            if (decisionA.tags && decisionB.tags) {
                const commonTags = decisionA.tags.filter(tag => decisionB.tags.includes(tag));
                similarity += commonTags.length * 10;
            }
            
            // Compare titles (simple word overlap)
            const titleAWords = new Set(decisionA.title.toLowerCase().split(/\W+/));
            const titleBWords = decisionB.title.toLowerCase().split(/\W+/);
            const commonTitleWords = titleBWords.filter(word => titleAWords.has(word));
            similarity += commonTitleWords.length * 5;
            
            if (similarity >= 15) {
                cluster.push(j);
                processed.add(j);
            }
        }
        
        if (cluster.length > 1) {
            clusters.push(cluster);
            processed.add(i);
        }
    }
    
    return clusters;
}

function analyzeRecentPatterns(recentDecisions, allDecisions) {
    if (recentDecisions.length < 3 || allDecisions.length < 10) {
        return { isolated: false };
    }
    
    // Calculate average emotional state
    const recentEmotion = recentDecisions.reduce((sum, d) => sum + (d.emotionalState || 5), 0) / recentDecisions.length;
    const historicalEmotion = allDecisions.slice(recentDecisions.length).reduce((sum, d) => sum + (d.emotionalState || 5), 0) / (allDecisions.length - recentDecisions.length);
    
    // Check tag distribution
    const recentTags = new Set();
    recentDecisions.forEach(d => {
        if (d.tags) d.tags.forEach(tag => recentTags.add(tag));
    });
    
    const historicalTags = new Set();
    allDecisions.slice(recentDecisions.length).forEach(d => {
        if (d.tags) d.tags.forEach(tag => historicalTags.add(tag));
    });
    
    // Calculate overlap
    let overlap = 0;
    recentTags.forEach(tag => {
        if (historicalTags.has(tag)) overlap++;
    });
    
    const tagSimilarity = overlap / Math.max(recentTags.size, 1);
    
    return {
        isolated: Math.abs(recentEmotion - historicalEmotion) > 2 && tagSimilarity < 0.5
    };
}

// =======================
// DEMO DATA SYSTEM
// =======================
function autoLoadDemoIfEmpty() {
    const decisions = DecisionManager.getDecisions();
    if (decisions.length === 0 && window.location.pathname.includes('index.html')) {
        // Auto-suggest demo after 2 seconds
        setTimeout(() => {
            const shouldLoad = confirm("👋 Welcome to Continuum!\n\nLoad sample decisions to see AI Insights immediately?");
            if (shouldLoad) {
                loadDemoData();
            }
        }, 2000);
    }
}

function loadDemoData() {
    const demoDecisions = [
        {
            id: Date.now() - 86400000,
            title: "Choosing React vs Vue for Hackathon Project",
            intent: "Select best framework for rapid development with good presentation",
            constraints: "48-hour hackathon, solo developer, must impress judges",
            alternatives: "React (more components), Vue (simpler), Plain JS (faster)",
            finalDecision: "Use React with pre-built components",
            reasoning: "React has more UI libraries for quick prototyping, judges familiar with it",
            emotionalState: 8,
            tags: ["hackathon", "technical", "presentation", "work"],
            timestamp: Date.now() - 86400000,
            date: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        },
        {
            id: Date.now() - 172800000,
            title: "Should we add AI features to our hackathon project?",
            intent: "Decide if AI will increase our score significantly",
            constraints: "Limited time, no budget, API rate limits",
            alternatives: "1) Real AI API 2) Mock AI data 3) No AI",
            finalDecision: "Use mock AI with realistic insights",
            reasoning: "Shows understanding without implementation risk, can explain approach to judges",
            emotionalState: 6,
            tags: ["AI", "strategy", "risk", "technical"],
            timestamp: Date.now() - 172800000,
            date: new Date(Date.now() - 172800000).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        },
        {
            id: Date.now() - 259200000,
            title: "Focus on UI polish vs adding more features",
            intent: "Allocate remaining time effectively",
            constraints: "Only 5 hours left, tired, need to prepare presentation",
            alternatives: "Polish current features vs Add 1 more complex feature",
            finalDecision: "Polish UI and prepare demo flow",
            reasoning: "Judges see polished projects as more complete. Better to have fewer perfect features than many buggy ones.",
            emotionalState: 7,
            tags: ["time-management", "prioritization", "quality", "work"],
            timestamp: Date.now() - 259200000,
            date: new Date(Date.now() - 259200000).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        },
        {
            id: Date.now() - 345600000,
            title: "Buy new laptop or repair old one",
            intent: "Maximize productivity with limited budget",
            constraints: "$1500 budget, need for coding and design, prefer portability",
            alternatives: "New MacBook ($1400), Windows laptop ($1200), Repair old one ($300)",
            finalDecision: "Buy refurbished MacBook Air",
            reasoning: "Better value, meets all requirements, Apple ecosystem helps development",
            emotionalState: 8,
            tags: ["financial", "personal", "technology"],
            timestamp: Date.now() - 345600000,
            date: new Date(Date.now() - 345600000).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })
        }
    ];
    
    // Save demo data
    const existing = DecisionManager.getDecisions();
    const newDecisions = [...demoDecisions, ...existing];
    localStorage.setItem("continuumDecisions", JSON.stringify(newDecisions));
    
    // Fill current form with example if on capture page
    if (document.getElementById('title')) {
        document.getElementById('title').value = "Decide project presentation order";
        document.getElementById('intent').value = "Maximize judge attention and score";
        document.getElementById('constraints').value = "5-minute limit, tired judges, many competing projects";
        document.getElementById('alternatives').value = "1) Start with demo 2) Explain problem first 3) Show AI insights immediately";
        document.getElementById('finalDecision').value = "Start with 30-second demo, then explain";
        document.getElementById('reasoning').value = "Hook judges immediately, then justify approach. Show, then tell.";
        document.getElementById('tags').value = "presentation, strategy, psychology";
        document.getElementById('emotionalState').value = 7;
    }
    
    // Update all displays
    if (typeof loadTimelineDecisions === 'function') loadTimelineDecisions();
    if (typeof updateStatistics === 'function') updateStatistics();
    if (typeof updateQuickStats === 'function') updateQuickStats();
    if (typeof loadRecentDecisions === 'function') loadRecentDecisions();
    if (typeof initializeDecisionChart === 'function') initializeDecisionChart();
    
    showNotification("🚀 Demo data loaded! Check Timeline & AI Insights", "success");
}

// =======================
// UTILITY FUNCTIONS
// =======================
function updateQuickStats() {
    const decisions = DecisionManager.getDecisions();
    const total = decisions.length;
    
    // Calculate recent decisions (this month)
    const now = new Date();
    const thisMonth = decisions.filter(d => {
        const decisionDate = new Date(d.timestamp);
        return decisionDate.getMonth() === now.getMonth() && 
               decisionDate.getFullYear() === now.getFullYear();
    }).length;
    
    // Calculate average confidence (based on emotional state)
    const avgConfidence = decisions.length > 0 
        ? (decisions.reduce((sum, d) => sum + (d.emotionalState || 5), 0) / decisions.length).toFixed(1)
        : "0";
    
    // Update elements if they exist
    const totalEl = document.getElementById("totalDecisions");
    const recentEl = document.getElementById("recentDecisions");
    const avgEl = document.getElementById("avgConfidence");
    
    if (totalEl) totalEl.textContent = total;
    if (recentEl) recentEl.textContent = thisMonth;
    if (avgEl) avgEl.textContent = avgConfidence;
}

function showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('style[data-notifications]')) {
        const style = document.createElement('style');
        style.setAttribute('data-notifications', 'true');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 1000;
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-width: 300px;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            }
            
            .notification.info { background: var(--primary); }
            .notification.success { background: var(--success); }
            .notification.warning { background: var(--warning); }
            .notification.danger { background: var(--danger); }
            
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                margin-left: 15px;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// =======================
// EXPORT/IMPORT FUNCTIONS
// =======================
function exportDecisions() {
    const decisions = DecisionManager.getDecisions();
    const dataStr = JSON.stringify(decisions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `continuum-decisions-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification("📥 Decisions exported successfully", "success");
}

function importDecisions() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => { 
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const importedDecisions = JSON.parse(event.target.result);
                
                // Validate the imported data
                if (!Array.isArray(importedDecisions)) {
                    throw new Error("Invalid file format");
                }
                
                // Merge with existing decisions (avoid duplicates by ID)
                const existingDecisions = DecisionManager.getDecisions();
                const existingIds = new Set(existingDecisions.map(d => d.id));
                
                const newDecisions = importedDecisions.filter(d => !existingIds.has(d.id));
                const updatedDecisions = [...existingDecisions, ...newDecisions];
                
                DecisionManager.saveDecisions(updatedDecisions);
                
                showNotification(`📤 Successfully imported ${newDecisions.length} new decisions`, "success");
                
                // Reload the page if on timeline or recall page
                if (window.location.pathname.includes("timeline.html") || 
                    window.location.pathname.includes("recall.html")) {
                    window.location.reload();
                }
            } catch (error) {
                showNotification("❌ Error importing file. Please check the format.", "danger");
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();

}
