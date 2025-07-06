// Quick Debug Script for Admin Dashboard Height Issue
console.log('🔍 Debugging Admin Dashboard...');

// Check for height issues
function debugHeightIssues() {
    console.log('📊 Checking element heights:');
    
    const elements = [
        'html', 'body', '#main-content', 
        '.container-wrapper', '.borrowers-table'
    ];
    
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            const height = element.offsetHeight;
            const scrollHeight = element.scrollHeight;
            console.log(`${selector}: height=${height}px, scrollHeight=${scrollHeight}px`);
            
            if (scrollHeight > height * 2) {
                console.warn(`⚠️ ${selector} has excessive scroll height!`);
            }
        }
    });
}

// Check for infinite loops in data loading
let loadCallCount = 0;
const originalLoadDashboardData = window.loadDashboardData;

if (originalLoadDashboardData) {
    window.loadDashboardData = function() {
        loadCallCount++;
        console.log(`📥 loadDashboardData called ${loadCallCount} times`);
        
        if (loadCallCount > 5) {
            console.error('🚨 Possible infinite loop detected in loadDashboardData!');
            return;
        }
        
        return originalLoadDashboardData.apply(this, arguments);
    };
}

// Run debug when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debugHeightIssues);
} else {
    debugHeightIssues();
}

console.log('✅ Debug script loaded - Check console for height analysis');
