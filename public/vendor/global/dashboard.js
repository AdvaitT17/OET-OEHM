document.addEventListener("DOMContentLoaded", function () {
  fetch("/user")
    .then((response) => response.json())
    .then((data) => {
      var profilePicture = document.getElementById("profilePicture");
      if (profilePicture) {
        profilePicture.src = data.user
          ? data.user.profile_picture
          : "images/profile/default-profile.jpg";
      }
    })
    .catch((error) => console.error("Error fetching user data:", error));
});
document.addEventListener("DOMContentLoaded", function () {
  // Create an initial empty chart
  createProgressChart(0);

  // Fetch all data in parallel
  Promise.all([
    fetch("/api/completed-courses").then((response) => response.json()),
    fetch("/api/enrolled-courses").then((response) => response.json()),
    fetch("/api/total-learning-hours").then((response) => response.json()),
    fetch("/api/progress").then((response) => response.json()),
  ])
    .then(([completedCourses, enrolledCourses, learningHours, progress]) => {
      // Update completed courses
      document.querySelector(".dlab-cource.bg-secondary h4").textContent =
        completedCourses.count;

      // Update enrolled courses
      document.querySelector(
        ".dlab-cource:not(.bg-secondary):not(.bg-primary) h4"
      ).textContent = enrolledCourses.count;

      // Update total learning hours
      document.querySelector(".dlab-cource.bg-primary h4").textContent =
        learningHours.total;

      // Update progress text
      document.getElementById(
        "progressText"
      ).textContent = `${progress.completed} out of ${progress.total} courses completed`;

      // Update the progress chart
      updateProgressChart(progress.percentage);
    })
    .catch((error) => console.error("Error fetching data:", error));
});

function createProgressChart(initialPercentage) {
  var options = {
    series: [initialPercentage],
    chart: {
      height: 250,
      type: "radialBar",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: "70%",
          background: "#fff",
          image: undefined,
          imageOffsetX: 0,
          imageOffsetY: 0,
          position: "front",
        },
        track: {
          background: "#F8F8F8",
          strokeWidth: "67%",
          margin: 0,
        },
        dataLabels: {
          show: true,
          name: {
            offsetY: -10,
            show: true,
            color: "#888",
            fontSize: "17px",
          },
          value: {
            formatter: function (val) {
              return parseInt(val) + "%";
            },
            color: "#111",
            fontSize: "36px",
            show: true,
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.5,
        gradientToColors: ["#FF0000"],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Progress"],
  };

  window.progressChart = new ApexCharts(
    document.querySelector("#newProgressChart"),
    options
  );
  window.progressChart.render();
}

function updateProgressChart(percentage) {
  // Make sure percentage is a number
  percentage = parseFloat(percentage);

  if (window.progressChart) {
    window.progressChart.updateSeries([percentage]);
  } else {
    console.error("Progress chart not initialized");
  }
}
