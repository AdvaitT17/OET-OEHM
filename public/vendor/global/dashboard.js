document.addEventListener('DOMContentLoaded', function() {
    // Create an initial empty chart
    updateProgressChart(0);

    // Fetch completed courses (all semesters)
    fetch('/api/completed-courses')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.dlab-cource.bg-secondary h4').textContent = data.count;
        })
        .catch(error => console.error('Error fetching completed courses:', error));

    // Fetch enrolled courses (current semester only)
    fetch('/api/enrolled-courses')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.dlab-cource:not(.bg-secondary):not(.bg-primary) h4').textContent = data.count;
        })
        .catch(error => console.error('Error fetching enrolled courses:', error));

    // Fetch total learning hours (current semester only)
    fetch('/api/total-learning-hours')
        .then(response => response.json())
        .then(data => {
            document.querySelector('.dlab-cource.bg-primary h4').textContent = data.total;
        })
        .catch(error => console.error('Error fetching total learning hours:', error));

    // Fetch progress (current semester, online courses only)
    fetch('/api/progress')
        .then(response => response.json())
        .then(data => {
            // Update progress text
            document.getElementById('progressText').textContent = `${data.completed} out of ${data.total} online courses completed`;
            
            // Update the progress chart
            updateProgressChart(data.percentage);
            
        })
        .catch(error => console.error('Error fetching progress:', error));
});

function updateProgressChart(percentage) {
    // Make sure percentage is a number
    percentage = parseFloat(percentage);
    
    var options = {
        series: [percentage],
        chart: {
            height: 250,
            type: 'radialBar',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            }
        },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: {
                    margin: 0,
                    size: '70%',
                    background: '#fff',
                    image: undefined,
                    imageOffsetX: 0,
                    imageOffsetY: 0,
                    position: 'front',
                },
                track: {
                    background: '#F8F8F8',
                    strokeWidth: '67%',
                    margin: 0,
                },
                dataLabels: {
                    show: true,
                    name: {
                        offsetY: -10,
                        show: true,
                        color: '#888',
                        fontSize: '17px'
                    },
                    value: {
                        formatter: function(val) {
                            return parseInt(val) + '%';
                        },
                        color: '#111',
                        fontSize: '36px',
                        show: true,
                    }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#FF0000'],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            }
        },
        stroke: {
            lineCap: 'round'
        },
        labels: ['Progress'],
    };

    // Destroy existing chart if it exists
    if (window.progressChart) {
        window.progressChart.destroy();
    }

    // Create new chart
    window.progressChart = new ApexCharts(document.querySelector("#newProgressChart"), options);
    window.progressChart.render();

    // After rendering, update the series with the actual percentage
    window.progressChart.updateSeries([percentage]);
}