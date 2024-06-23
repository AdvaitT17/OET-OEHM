document.addEventListener('DOMContentLoaded', async function() {
  console.log("DOM fully loaded and parsed");

  if (typeof $.fn.DataTable === 'undefined') {
    console.error('DataTables is not loaded. Please check if the library is properly included.');
    return;
  }
  console.log('DataTables version:', $.fn.DataTable.version);

  let attendanceVerified = false;
  let selectedCourses = [];

  try {
    const userData = await fetch('/user').then(response => response.json());
    console.log('User data:', userData);
    if (userData.user) {
      document.getElementById('name').value = userData.user.name || '';
      document.getElementById('email').value = userData.user.email || '';
      if (userData.user.profile_picture) {
        document.getElementById('profilePicture').src = userData.user.profile_picture;
      }
    }
    attendanceVerified = await checkAttendanceVerified();
    console.log('Attendance verified:', attendanceVerified);
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  async function initializeDataTable(tableId, isOnline) {
    console.log(`Initializing table ${tableId}, isOnline: ${isOnline}`);
    
    if (typeof $ === 'undefined' || typeof $.fn.DataTable === 'undefined') {
      console.error('jQuery or DataTables is not loaded');
      return null;
    }

    const $table = $(tableId);
    if (!$table.length) {
      console.error(`Table with ID ${tableId} not found in the DOM.`);
      return null;
    }

    if ($.fn.DataTable.isDataTable(tableId)) {
      console.log(`Destroying existing DataTable for ${tableId}`);
      $(tableId).DataTable().destroy();
    }

    $table.empty();

    const courseType = isOnline ? 'online' : 'offline';
    const courseUrl = isOnline ? '/api/courses' : '/api/courses_offline';

    try {
      console.log(`Fetching ${courseType} courses from ${courseUrl}`);
      const response = await fetch(courseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let courses = await response.json();
      console.log(`Received ${courses.length} ${courseType} courses:`, courses);
      console.log('First course:', courses[0]);
      
      if (!Array.isArray(courses) || courses.length === 0) {
        console.warn(`No courses found for ${courseType} ${tableId}`);
        return null;
      }

      if (!isOnline) {
        const expectedType = tableId === "#OETCoursesTable" ? "OET" : "OEHM";
        console.log(`Filtering offline courses for type: ${expectedType}`);
        courses = courses.filter(course => course.course_type === expectedType);
        console.log(`Filtered ${courses.length} ${expectedType} offline courses:`, courses);
      }

      if (courses.length === 0) {
        console.warn(`No courses found after filtering for ${courseType} ${tableId}`);
        return null;
      }

      console.log(`Creating DataTable for ${courseType} ${tableId}`);
      
      const columns = isOnline ? [
        { data: "course_name", title: "Course Name" },
        { data: "university", title: "University" },
        { data: "domain", title: "Domain" },
        { data: "difficulty_level", title: "Difficulty" },
        { data: "language", title: "Language" },
        { data: "hours", title: "Hours" }
      ] : [
        { data: "course_code", title: "Course Code" },
        { data: "course_name", title: "Course Name" },
        { data: "faculty_name", title: "Faculty Name" },
        { data: "semester", title: "Semester" },
        { data: "faculty_email", title: "Faculty Email" }
      ];

      try {
        console.log('Initializing DataTable with courses:', courses);
        const dataTable = $table.DataTable({
          data: courses,
          columns: columns,
          responsive: true,
          scrollX: false,
          autoWidth: false,
          pageLength: 5,
          lengthMenu: [[5, 10, 25, -1], [5, 10, 25, "All"]],
          language: {
            paginate: {
              next: '<i class="fa fa-angle-double-right" aria-hidden="true"></i>',
              previous: '<i class="fa fa-angle-double-left" aria-hidden="true"></i>'
            }
          }
        });
        console.log('DataTable initialized successfully');

        $table.off('click', 'tbody tr').on('click', 'tbody tr', function() {
          const data = dataTable.row(this).data();
          if ($(this).hasClass('selected')) {
            $(this).removeClass('selected');
            selectedCourses = selectedCourses.filter(course => course.course_id !== data.course_id);
          } else {
            $(this).addClass('selected');
            selectedCourses.push({
              ...data,
              mode: isOnline ? 'online' : 'offline',
              type: tableId === "#OETCoursesTable" ? "OET" : "OEHM"
            });
          }
          displaySelectedCoursesSummary();
        });

        return dataTable;
      } catch (error) {
        console.error('Error initializing DataTable:', error);
        console.log('Table element:', $table[0].outerHTML);
        console.log('Courses data:', JSON.stringify(courses));
        return null;
      }
    } catch (error) {
      console.error(`Error fetching or initializing ${courseType} courses for ${tableId}:`, error);
      return null;
    }
  }

  async function setupTable(tableId) {
    console.log(`Setting up table ${tableId}, attendance verified: ${attendanceVerified}`);
    const tableContainer = document.querySelector(tableId).closest('.card');
    const toggleContainer = tableContainer.querySelector('.toggle-container');
    const toggleId = tableId === "#OETCoursesTable" ? "OETCoursesTableToggle" : "OEHMCoursesTableToggle";
    
    if (attendanceVerified) {
      toggleContainer.style.display = 'flex';
      const toggle = document.getElementById(toggleId);
      
      let dataTable = await initializeDataTable(tableId, false);
      console.log(`Initial dataTable setup result for ${tableId}:`, dataTable);
      
      if (dataTable) {
        toggle.addEventListener('change', async function() {
          const isOnline = this.checked;
          console.log(`Toggle changed to ${isOnline ? 'online' : 'offline'} for ${tableId}`);
          dataTable = await initializeDataTable(tableId, isOnline);
          console.log(`DataTable after toggle for ${tableId}:`, dataTable);
          if (!dataTable) {
            alert(`No courses available for ${isOnline ? 'online' : 'offline'} mode in ${tableId}.`);
            this.checked = !isOnline;  // Revert the toggle
          }
        });
      } else {
        console.warn(`Failed to initialize DataTable for ${tableId}`);
        toggleContainer.style.display = 'none';
      }
    } else {
      toggleContainer.style.display = 'none';
      const dataTable = await initializeDataTable(tableId, false);
      console.log(`Offline-only dataTable setup result for ${tableId}:`, dataTable);
      if (!dataTable) {
        console.warn(`No offline courses available for ${tableId}`);
      }
    }
  }

  function displaySelectedCoursesSummary() {
    const summaryContainer = document.getElementById('selectedCoursesContainer');
    summaryContainer.innerHTML = '';

    if (selectedCourses.length === 0) {
      summaryContainer.innerHTML = '<p>No courses selected yet.</p>';
      return;
    }

    const summaryTable = document.createElement('table');
    summaryTable.classList.add('summary-table');

    const headerRow = summaryTable.insertRow();
    const headers = ['Course Name', 'University/Faculty', 'Domain/Semester', 'Difficulty/Email', 'Language/Type', 'Hours', 'Mode'];
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });

    selectedCourses.forEach(course => {
      const row = summaryTable.insertRow();
      row.insertCell().textContent = course.course_name;
      row.insertCell().textContent = course.mode === 'online' ? course.university : course.faculty_name;
      row.insertCell().textContent = course.mode === 'online' ? course.domain : course.semester;
      row.insertCell().textContent = course.mode === 'online' ? course.difficulty_level : course.faculty_email;
      row.insertCell().textContent = course.mode === 'online' ? course.language : course.course_type;
      row.insertCell().textContent = course.hours || 'N/A';
      row.insertCell().textContent = course.mode;
    });

    summaryContainer.appendChild(summaryTable);
  }

  function enrollCourses() {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to enroll.');
      return;
    }

    const onlineCourses = selectedCourses.filter(course => course.mode === 'online');
    const offlineCourses = selectedCourses.filter(course => course.mode === 'offline');

    // Validate online courses
    if (onlineCourses.length > 0) {
      const oetDomains = new Set();
      const oehmDomains = new Set();
      let totalOETHours = 0;
      let totalOEHMHours = 0;

      const hasConflict = onlineCourses.some(course => {
        if (course.type === 'OET') {
          if (oetDomains.has(course.domain)) return true;
          oetDomains.add(course.domain);
          totalOETHours += parseInt(course.hours || 0);
        } else {
          if (oehmDomains.has(course.domain)) return true;
          oehmDomains.add(course.domain);
          totalOEHMHours += parseInt(course.hours || 0);
        }
        return false;
      });

      if (hasConflict) {
        alert('You cannot select multiple online courses of the same domain for OET or OEHM.');
        return;
      }

      if (totalOETHours < 30 || totalOETHours > 45 || totalOEHMHours < 30 || totalOEHMHours > 45) {
        alert('Total hours for online OET and OEHM courses must be between 30 and 45.');
        return;
      }
    }

    // TODO: Add offline course enrollment validation here

    // Proceed with enrollment
    fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courses: selectedCourses })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          window.location.href = '/successful-onboarding';
        } else {
          alert('Enrollment failed: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error enrolling courses:', error);
      });
  }

  await setupTable("#OETCoursesTable");
  await setupTable("#OEHMCoursesTable");

  document.getElementById('finalSubmit').addEventListener('click', enrollCourses);

  console.log("Onboarding script completed");
});

function checkAttendanceVerified() {
  return fetch('/checkAttendance')
    .then(response => response.json())
    .then(data => {
      console.log('Attendance verification response:', data);
      return data.attendanceVerified;
    })
    .catch(error => {
      console.error('Error checking attendance:', error);
      return false;
    });
}