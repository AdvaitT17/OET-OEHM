document.addEventListener("DOMContentLoaded", async function () {
  if (typeof $.fn.DataTable === "undefined") {
    console.error(
      "DataTables is not loaded. Please check if the library is properly included."
    );
    return;
  }

  let attendanceVerified = false;
  let selectedCourses = [];
  let selectedOfflineOETCourses = [];
  let selectedOfflineOEHMCourses = [];
  let availableOfflineOETCourses = [];
  let availableOfflineOEHMCourses = [];
  let userSemester = "";
  let userEmail = "";
  let isOETOnline = false;
  let isOEHMOnline = false;

  function validateAcknowledgeCheckbox() {
    const acknowledgeCheckbox = document.getElementById("acknowledge");
    if (!acknowledgeCheckbox.checked) {
      alert("Please acknowledge that the information is correct.");
      return false;
    }
    return true;
  }

  async function initializeUserData() {
    try {
      const response = await fetch("/user");
      const userData = await response.json();
      if (userData.user) {
        document.getElementById("name").value = userData.user.name || "";
        document.getElementById("email").value = userData.user.email || "";
        if (userData.user.profile_picture) {
          document.getElementById("profilePicture").src =
            userData.user.profile_picture;
        }
        userSemester = userData.user.semester;
        userEmail = userData.user.email;

        handleSemesterVII(userSemester);
      }
      attendanceVerified = await checkAttendanceVerified();
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }

  function handleSemesterVII(semester) {
    if (semester === "VII") {
      const oehmFieldset = document.querySelector(
        ".wizard-fieldset:nth-child(3)"
      );
      if (oehmFieldset) {
        oehmFieldset.style.display = "none";
      }

      const nextButton2 = document.getElementById("nextButton2");
      if (nextButton2) {
        nextButton2.addEventListener("click", function (e) {
          e.preventDefault();
          document
            .querySelector(".wizard-fieldset:nth-child(4)")
            .classList.add("show");
          this.closest(".wizard-fieldset").classList.remove("show");
        });
      }

      const summaryFieldset = document.querySelector(
        ".wizard-fieldset:nth-child(4)"
      );
      if (summaryFieldset) {
        const previousButton = summaryFieldset.querySelector(
          ".form-wizard-previous-btn"
        );
        if (previousButton) {
          previousButton.addEventListener("click", function (e) {
            e.preventDefault();
            summaryFieldset.classList.remove("show");
            document
              .querySelector(".wizard-fieldset:nth-child(2)")
              .classList.add("show");
          });
        }
      }

      const progressSteps = document.querySelectorAll(".form-wizard-steps li");
      if (progressSteps.length >= 3) {
        progressSteps[2].style.display = "none";
        progressSteps.forEach((step) => {
          if (step.style.display !== "none") {
            step.style.width = "33.33%";
          }
        });
      }
    }
  }

  async function fetchCourses(isOnline) {
    const courseUrl = isOnline ? "/api/courses" : "/api/courses_offline";
    try {
      const response = await fetch(courseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const courses = await response.json();

      // Store offline courses for the current semester
      if (!isOnline) {
        availableOfflineOETCourses = courses.filter(
          (course) =>
            course.course_type === "OET" && course.semester === userSemester
        );
        availableOfflineOEHMCourses = courses.filter(
          (course) =>
            course.course_type === "OEHM" && course.semester === userSemester
        );
      }

      return courses;
    } catch (error) {
      console.error("Error fetching courses:", error);
      return [];
    }
  }

  function initializeDataTable(tableId, courses, isOnline) {
    const $table = $(tableId);
    if ($.fn.DataTable.isDataTable(tableId)) {
      $table.DataTable().destroy();
    }
    $table.empty();

    const columns = isOnline
      ? [
          { data: "course_name", title: "Course Name" },
          { data: "university", title: "University" },
          { data: "domain", title: "Domain" },
          { data: "difficulty_level", title: "Difficulty" },
          { data: "language", title: "Language" },
          { data: "hours", title: "Hours" },
          {
            data: "previously_taken",
            title: "Status",
            render: function (data, type, row) {
              return data ? "Previously Taken" : "Available";
            },
          },
        ]
      : [
          { data: "course_code", title: "Course Code" },
          { data: "course_name", title: "Course Name" },
          { data: "faculty_name", title: "Faculty Name" },
          { data: "semester", title: "Semester" },
          { data: "faculty_email", title: "Faculty Email" },
          {
            data: "preference",
            title: "Preference",
            render: function (data, type, row) {
              return data ? data : "Not selected";
            },
          },
          {
            data: "previously_taken",
            title: "Status",
            render: function (data, type, row) {
              return data ? "Previously Taken" : "Available";
            },
          },
        ];

    const dataTable = $table.DataTable({
      data: courses,
      columns: columns,
      responsive: true,
      scrollX: false,
      autoWidth: false,
      pageLength: 5,
      lengthMenu: [
        [5, 10, 25, -1],
        [5, 10, 25, "All"],
      ],
      language: {
        paginate: {
          next: '<i class="fa fa-angle-double-right" aria-hidden="true"></i>',
          previous:
            '<i class="fa fa-angle-double-left" aria-hidden="true"></i>',
        },
      },
      createdRow: function (row, data, dataIndex) {
        if (data.previously_taken) {
          $(row).addClass("disabled");
        }
      },
    });

    $table.off("click", "tbody tr").on("click", "tbody tr", function () {
      const data = dataTable.row(this).data();
      if (data.previously_taken) return;

      if (isOnline) {
        if ($(this).hasClass("selected")) {
          $(this).removeClass("selected");
          selectedCourses = selectedCourses.filter(
            (course) => course.course_id !== data.course_id
          );
        } else {
          $(this).addClass("selected");
          selectedCourses.push({
            ...data,
            mode: "online",
            type: tableId === "#OETCoursesTable" ? "OET" : "OEHM",
          });
        }
      } else {
        const courseArray =
          data.course_type === "OET"
            ? selectedOfflineOETCourses
            : selectedOfflineOEHMCourses;
        const index = courseArray.findIndex(
          (course) => course.course_code === data.course_code
        );

        if (index !== -1) {
          courseArray.splice(index, 1);
        } else {
          courseArray.push({
            ...data,
            preference: courseArray.length + 1,
            mode: "offline",
            type: data.course_type,
          });
        }

        courseArray.forEach((course, index) => {
          course.preference = index + 1;
        });

        dataTable
          .clear()
          .rows.add(
            courses.map((course) => {
              const selected = courseArray.find(
                (c) => c.course_code === course.course_code
              );
              return {
                ...course,
                preference: selected ? selected.preference : null,
              };
            })
          )
          .draw();
      }

      displaySelectedCoursesSummary();
    });

    return dataTable;
  }

  async function setupTable(tableId) {
    const tableContainer = document.querySelector(tableId).closest(".card");
    const toggleContainer = tableContainer.querySelector(".toggle-container");
    const toggleId =
      tableId === "#OETCoursesTable"
        ? "OETCoursesTableToggle"
        : "OEHMCoursesTableToggle";

    let isOnline = false;
    let courses = await fetchCourses(isOnline);

    if (!isOnline) {
      const expectedType = tableId === "#OETCoursesTable" ? "OET" : "OEHM";
      courses = courses.filter(
        (course) =>
          course.course_type === expectedType &&
          course.semester === userSemester
      );
    }

    let dataTable = initializeDataTable(tableId, courses, isOnline);

    if (attendanceVerified) {
      toggleContainer.style.display = "flex";
      const toggle = document.getElementById(toggleId);

      toggle.addEventListener("change", async function () {
        isOnline = this.checked;
        if (tableId === "#OETCoursesTable") {
          isOETOnline = isOnline;
          selectedOfflineOETCourses = []; // Clear offline OET selections when toggling to online
        } else {
          isOEHMOnline = isOnline;
          selectedOfflineOEHMCourses = []; // Clear offline OEHM selections when toggling to online
        }

        if (isOnline) {
          // Clear offline selections for this table
          if (tableId === "#OETCoursesTable") {
            selectedOfflineOETCourses = [];
          } else {
            selectedOfflineOEHMCourses = [];
          }
        } else {
          // Clear online selections for this table
          selectedCourses = selectedCourses.filter(
            (course) =>
              (tableId === "#OETCoursesTable" && course.type !== "OET") ||
              (tableId === "#OEHMCoursesTable" && course.type !== "OEHM")
          );
        }

        courses = await fetchCourses(isOnline);

        if (!isOnline) {
          const expectedType = tableId === "#OETCoursesTable" ? "OET" : "OEHM";
          courses = courses.filter(
            (course) =>
              course.course_type === expectedType &&
              course.semester === userSemester
          );
        }

        if (courses.length === 0) {
          alert(
            `No courses available for ${isOnline ? "online" : "offline"} mode.`
          );
          this.checked = !isOnline; // Revert the toggle
          return;
        }

        dataTable = initializeDataTable(tableId, courses, isOnline);
      });
    } else {
      toggleContainer.style.display = "none";
    }
  }

  function displaySelectedCoursesSummary() {
    const summaryContainer = document.getElementById(
      "selectedCoursesContainer"
    );
    summaryContainer.innerHTML = "";

    if (
      selectedCourses.length === 0 &&
      selectedOfflineOETCourses.length === 0 &&
      selectedOfflineOEHMCourses.length === 0
    ) {
      summaryContainer.innerHTML =
        '<p class="no-courses-message">No courses selected yet.</p>';
      return;
    }

    const summaryTitle = document.createElement("h2");
    summaryTitle.className = "summary-title";
    summaryTitle.textContent = "Summary";
    summaryContainer.appendChild(summaryTitle);

    const courseCardsContainer = document.createElement("div");
    courseCardsContainer.className = "course-cards";

    function createCourseCard(course, isOffline = false) {
      const card = document.createElement("div");
      card.className = `course-card ${isOffline ? "offline" : "online"}`;

      const cardHeader = document.createElement("div");
      cardHeader.className = "course-card-header";

      const courseName = document.createElement("span");
      courseName.textContent = course.course_name;
      cardHeader.appendChild(courseName);

      const modeBadge = document.createElement("span");
      modeBadge.className = "mode-badge";
      modeBadge.textContent = isOffline ? `Offline` : "Online";
      cardHeader.appendChild(modeBadge);

      const cardBody = document.createElement("div");
      cardBody.className = "course-card-body";

      const infoItems = isOffline
        ? [
            { label: "Course Code", value: course.course_code },
            { label: "Faculty", value: course.faculty_name },
            { label: "Semester", value: course.semester },
            { label: "Type", value: course.type, isType: true },
            { label: "Email", value: course.faculty_email },
            { label: "Preference", value: course.preference }, // Added preference here
          ]
        : [
            { label: "University", value: course.university },
            { label: "Domain", value: course.domain },
            { label: "Type", value: course.type, isType: true },
            { label: "Hours", value: course.hours || "N/A" },
            { label: "Peer Graded", value: course.peer_graded ? "Yes" : "No" },
          ];

      infoItems.forEach((item) => {
        const infoDiv = document.createElement("div");
        infoDiv.className = "course-info";

        const label = document.createElement("span");
        label.className = "course-info-label";
        label.textContent = `${item.label}:`;

        const value = document.createElement("span");
        value.className = "course-info-value";

        if (item.isType) {
          value.className += ` course-type course-type-${item.value}`;
        }

        value.textContent = item.value;

        infoDiv.appendChild(label);
        infoDiv.appendChild(value);
        cardBody.appendChild(infoDiv);
      });

      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      return card;
    }

    selectedCourses.forEach((course) => {
      courseCardsContainer.appendChild(createCourseCard(course));
    });

    selectedOfflineOETCourses.forEach((course) => {
      courseCardsContainer.appendChild(createCourseCard(course, true));
    });

    selectedOfflineOEHMCourses.forEach((course) => {
      courseCardsContainer.appendChild(createCourseCard(course, true));
    });

    summaryContainer.appendChild(courseCardsContainer);
  }

  async function updateUserData(data) {
    try {
      const response = await fetch("/updateUserData", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error in updateUserData:", error);
      throw error;
    }
  }

  document
    .getElementById("nextButton1")
    .addEventListener("click", async function (e) {
      if (!validateAcknowledgeCheckbox()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const userData = {
        roll_number: document.getElementById("zcode").value,
        branch: document.getElementById("branchSelect").value,
        semester: document.getElementById("semesterSelect").value,
      };

      try {
        const result = await updateUserData(userData);
        if (result.success) {
          userSemester = userData.semester;
          handleSemesterVII(userSemester);
          toggleFormFields(true);
          await setupTable("#OETCoursesTable");
          if (userSemester !== "VII") {
            await setupTable("#OEHMCoursesTable");
          }
        } else {
          console.error("Update failed:", result);
          alert(
            "Failed to update user data. Please try again. Error: " +
              (result.message || "Unknown error")
          );
        }
      } catch (error) {
        console.error("Error updating user data:", error);
        alert(
          "An error occurred while updating user data. Please try again. Error: " +
            error.message
        );
      }
    });

  async function checkOnboardingStep() {
    try {
      const response = await fetch("/checkOnboardingStep");
      const data = await response.json();

      if (data.step > 1) {
        toggleFormFields(true);
        moveToStep(data.step);
      }
    } catch (error) {
      console.error("Error checking onboarding step:", error);
    }
  }

  function moveToStep(step) {
    const fieldsets = document.querySelectorAll(".wizard-fieldset");

    fieldsets.forEach((fieldset, index) => {
      if (index === step - 1) {
        fieldset.classList.add("show");
      } else {
        fieldset.classList.remove("show");
      }
    });
  }

  function toggleFormFields(disabled) {
    const fields = [
      "zcode",
      "branchSelect",
      "semesterSelect",
      "acknowledge",
      "nextButton1",
    ];
    fields.forEach((fieldId) => {
      document.getElementById(fieldId).disabled = disabled;
    });
  }

  function enrollCourses() {
    if (
      selectedCourses.length === 0 &&
      selectedOfflineOETCourses.length === 0 &&
      selectedOfflineOEHMCourses.length === 0
    ) {
      alert("Please select at least one course to enroll.");
      return;
    }

    const onlineCourses = selectedCourses.filter(
      (course) => course.mode === "online"
    );
    const offlineOETCourses = selectedOfflineOETCourses;
    const offlineOEHMCourses = selectedOfflineOEHMCourses;

    const onlineOETCourses = onlineCourses.filter(
      (course) => course.type === "OET"
    );
    const onlineOEHMCourses = onlineCourses.filter(
      (course) => course.type === "OEHM"
    );

    // Check if all available offline courses for the current semester are selected, only if offline mode is selected
    if (
      !isOETOnline &&
      offlineOETCourses.length > 0 &&
      offlineOETCourses.length !== availableOfflineOETCourses.length
    ) {
      alert(
        `Please select all available offline OET courses for semester ${userSemester} in order of preference.`
      );
      return;
    }

    if (
      userSemester !== "VII" &&
      !isOEHMOnline &&
      offlineOEHMCourses.length > 0 &&
      offlineOEHMCourses.length !== availableOfflineOEHMCourses.length
    ) {
      alert(
        `Please select all available offline OEHM courses for semester ${userSemester} in order of preference.`
      );
      return;
    }

    // Rest of the existing validation logic
    if (userSemester === "VII") {
      if (onlineOETCourses.length === 0 && offlineOETCourses.length === 0) {
        alert("Please select at least one OET course (online or offline).");
        return;
      }
    } else {
      const hasOnlineOET = onlineOETCourses.length > 0;
      const hasOnlineOEHM = onlineOEHMCourses.length > 0;
      const hasOfflineOET = offlineOETCourses.length > 0;
      const hasOfflineOEHM = offlineOEHMCourses.length > 0;

      if (
        !(
          (hasOnlineOET && hasOnlineOEHM) ||
          (hasOfflineOET && hasOfflineOEHM) ||
          (hasOnlineOET && hasOfflineOEHM) ||
          (hasOfflineOET && hasOnlineOEHM)
        )
      ) {
        alert(
          "Invalid combination of courses. Please select either:\n" +
            "1. Online OET and Online OEHM\n" +
            "2. Offline OET and Offline OEHM\n" +
            "3. Online OET and Offline OEHM\n" +
            "4. Offline OET and Online OEHM"
        );
        return;
      }
    }

    if (onlineCourses.length > 0) {
      const totalOETHours = onlineOETCourses.reduce(
        (sum, course) => sum + parseInt(course.hours || 0),
        0
      );
      if (
        onlineOETCourses.length > 0 &&
        (totalOETHours < 30 || totalOETHours > 45)
      ) {
        alert("Total hours for online OET courses must be between 30 and 45.");
        return;
      }

      if (userSemester !== "VII") {
        const totalOEHMHours = onlineOEHMCourses.reduce(
          (sum, course) => sum + parseInt(course.hours || 0),
          0
        );
        if (
          onlineOEHMCourses.length > 0 &&
          (totalOEHMHours < 30 || totalOEHMHours > 45)
        ) {
          alert(
            "Total hours for online OEHM courses must be between 30 and 45."
          );
          return;
        }
      }

      if (
        onlineOETCourses.length > 5 ||
        (userSemester !== "VII" && onlineOEHMCourses.length > 5)
      ) {
        alert(
          "You can select at most 5 online courses for each type" +
            (userSemester !== "VII" ? " (OET and OEHM)" : "") +
            "."
        );
        return;
      }

      if (userSemester !== "VII") {
        const allOnlineCourseIds = new Set(
          onlineCourses.map((course) => course.course_id)
        );
        if (allOnlineCourseIds.size !== onlineCourses.length) {
          alert("A course selected in OET cannot be selected again in OEHM.");
          return;
        }
      }
    }

    const enrollmentData = [
      ...onlineCourses.map((course) => ({
        email: userEmail,
        course_id: course.course_id,
        total_hours: course.hours,
        mode: "ONLINE",
        type: course.type,
        enrolled_semester: userSemester,
        enrolled_academic_year: null, // This will be set on the server side
      })),
      ...offlineOETCourses.map((course) => ({
        email: userEmail,
        course_id: course.course_code,
        total_hours: null,
        mode: "OFFLINE",
        type: "OET",
        enrolled_semester: userSemester,
        enrolled_academic_year: null, // This will be set on the server side
      })),
      ...offlineOEHMCourses.map((course) => ({
        email: userEmail,
        course_id: course.course_code,
        total_hours: null,
        mode: "OFFLINE",
        type: "OEHM",
        enrolled_semester: userSemester,
        enrolled_academic_year: null, // This will be set on the server side
      })),
    ];

    fetch("/api/enroll", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ courses: enrollmentData }),
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(
              `HTTP error! status: ${response.status}, message: ${text}`
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          window.location.href = "/successful-onboarding";
        } else {
          alert("Enrollment failed: " + data.message);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Enrollment failed: " + error.message);
      });
  }

  function checkAttendanceVerified() {
    return fetch("/checkAttendance")
      .then((response) => response.json())
      .then((data) => {
        return data.attendanceVerified;
      })
      .catch((error) => {
        console.error("Error checking attendance:", error);
        return false;
      });
  }

  // Initialize user data and set up tables
  await initializeUserData();
  await setupTable("#OETCoursesTable");
  if (userSemester !== "VII") {
    await setupTable("#OEHMCoursesTable");
  }
  await checkOnboardingStep();

  document.addEventListener(
    "click",
    function (e) {
      if (
        e.target.classList.contains("form-wizard-next-btn") &&
        e.target.closest(".wizard-fieldset") ===
          document.querySelector(".wizard-fieldset:first-of-type")
      ) {
        if (!validateAcknowledgeCheckbox()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    },
    true
  );

  document
    .getElementById("finalSubmit")
    .addEventListener("click", enrollCourses);

  document
    .getElementById("semesterSelect")
    .addEventListener("change", async function () {
      userSemester = this.value;
      handleSemesterVII(userSemester);
      await setupTable("#OETCoursesTable");
      if (userSemester !== "VII") {
        await setupTable("#OEHMCoursesTable");
      } else {
        const oehmTable = document.querySelector("#OEHMCoursesTable");
        if (oehmTable) {
          oehmTable.closest(".card").style.display = "none";
        }
      }
    });
});
