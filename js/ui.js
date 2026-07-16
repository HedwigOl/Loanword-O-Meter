// ui.js

// Number formatter used for displaying large numbers
const formatter = new Intl.NumberFormat();

// Update all statistics shown on the dashboard
export function updateDashboard(stats) {

    setValue(
        "loanOccurrences",
        formatter.format(stats.loanOccurrences)
    );
    setValue(
        "uniqueLoanwords",
        formatter.format(stats.uniqueLoanwords)
    );
    setValue(
        "totalWords",
        stats.totalWords > 0
            ? formatter.format(stats.totalWords)
            : "Unknown"
    );
    setValue(
        "totalTypes",
        stats.totalTypes > 0
            ? formatter.format(stats.totalTypes)
            : "Unknown"
    );
    setValue(
        "occurrencePercent",
        formatPercentage(stats.occurrencePercent)
    );
    setValue(
        "typePercent",
        formatPercentage(stats.typePercent)
    );
    setValue(
        "topLanguage",
        stats.topLanguage || "–"
    );
    setValue(
        "sourceLanguages",
        formatter.format(stats.sourceLanguages)
    );
}

// Display a status message below the upload area
export function updateStatus(message) {

    const status = document.getElementById("status");

    if (status) {
        status.textContent = message;
    }
}

// Format a number as a percentage
function formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return "Unknown";
    }
    return value.toFixed(2) + "%";
}

// Update the text of the corpus facts
function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}