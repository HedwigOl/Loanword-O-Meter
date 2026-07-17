// charts.js

// Chart instances
let donutChart = null;
let barChart = null;

// Color palette for the charts
const COLORS = [
    "#961704",
    "#C43C1A",
    "#D96C06",
    "#E6A700",
    "#8A5A00",
    "#6B8E23",
    "#2E7D32",
    "#00838F",
    "#3F51B5",
    "#7B1FA2",
    "#616161"
];

// Create the charts
export function initialiseCharts() {

    const donutCanvas = document.getElementById("languageDonut");
    const barCanvas = document.getElementById("languageBar");

    if (!donutCanvas || !barCanvas) return;

    // Doughnut chart showing the distribution by source language
    donutChart = new Chart(donutCanvas, {
        type: "doughnut",
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: COLORS,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1,
            plugins: {
                legend: {
                    position: "right"
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percent = total ? (100 * value / total).toFixed(1) : 0;

                            return `${context.label}: ${value.toLocaleString()} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });

    // Horizontal bar chart showing the percentage of the corpus
    barChart = new Chart(barCanvas, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: "#961704",
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const rawCount = context.dataset.rawCounts[context.dataIndex];
                            return `${context.raw.toFixed(3)}% (${rawCount.toLocaleString()} loanword${rawCount === 1 ? "" : "s"})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback(value) {
                            return value + "%";
                        }
                    },
                    title: {
                        display: true,
                        text: "Percentage of corpus"
                    }
                }
            }
        }
    });
}

// Update the charts with new data
export function updateCharts(parsed, mode) {

    if (!parsed) return;

    // Select either the token or type distribution
    const distribution = mode === "token"
        ? [...parsed.tokenDistribution]
        : [...parsed.typeDistribution];

    // Sort languages by frequency
    distribution.sort((a, b) => b.count - a.count);

    // Keep only the ten largest languages
    const topTen = distribution.slice(0, 10);

    // Combine all remaining languages into "Other"
    const otherCount = distribution
        .slice(10)
        .reduce((sum, item) => sum + item.count, 0);

    if (otherCount > 0) {
        topTen.push({
            language: "Other",
            count: otherCount
        });
    }

    // Update the doughnut chart
    donutChart.data.labels = topTen.map(d => d.language);
    donutChart.data.datasets[0].data = topTen.map(d => d.count);
    donutChart.update();

    // Determine the denominator for the bar chart percentages
    const denominator = mode === "token"
        ? parsed.corpus.totalTokens
        : parsed.corpus.totalTypes

    const percentages = topTen.map(d =>
        denominator ? 100 * d.count / denominator : 0
    );

    // Store the raw counts for the tooltip
    barChart.data.datasets[0].rawCounts = topTen.map(d => d.count);

    // Update the horizontal bar chart
    barChart.data.labels = topTen.map(d => d.language);

    barChart.data.datasets[0].label = mode === "token"
        ? "% of corpus tokens"
        : "% of loanword types";

    barChart.data.datasets[0].data = percentages;
    barChart.update();
}