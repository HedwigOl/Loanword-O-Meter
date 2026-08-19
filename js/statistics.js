export function calculateStatistics(
    loanwordRows,
    corpus = {},
    generalRows = []
) {

    // Statistics based on hom=false
    const loanOccurrences = calculateLoanOccurrences(loanwordRows);
    const uniqueLoanwords = loanwordRows.length;

    const totalWords = corpus.totalTokens ?? 0;
    const totalTypes = corpus.totalTypes ?? 0;

    // Language information based on the original query
    const topLanguage = findTopLanguage(generalRows);

    const occurrencePercent =
        totalWords > 0
            ? (loanOccurrences / totalWords) * 100
            : null;

    const typePercent =
        totalTypes > 0
            ? (uniqueLoanwords / totalTypes) * 100
            : null;

    const sourceLanguages = new Set(
        generalRows.map(row => row.language)
    ).size;

    return {
        loanOccurrences,
        uniqueLoanwords,
        totalWords,
        totalTypes,
        occurrencePercent,
        typePercent,
        topLanguage,
        sourceLanguages
    };
}


// Sum up number of loanword occurrences
function calculateLoanOccurrences(rows) {
    return rows.reduce((sum, row) => {
        return sum + row.count;
    }, 0);
}


// Select language with most contributions
function findTopLanguage(rows) {
    const languageTotals = {};

    rows.forEach(row => {

        if (!languageTotals[row.language]) {
            languageTotals[row.language] = 0;
        }

        languageTotals[row.language] += row.count;
    });

    let topLanguage = "Unknown";
    let highestCount = -1;

    for (const [language, count] of Object.entries(languageTotals)) {
        if (count > highestCount) {
            highestCount = count;
            topLanguage = language;
        }
    }

    return topLanguage;
}