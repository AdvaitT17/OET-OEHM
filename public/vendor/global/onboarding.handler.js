document.addEventListener('DOMContentLoaded', async function() {
  console.log("DOM fully loaded and parsed");

  if (typeof $.fn.DataTable === 'undefined') {
    console.error('DataTables is not loaded. Please check if the library is properly included.');
    return;
  }
  console.log('DataTables version:', $.fn.DataTable.version);

  let attendanceVerified = false;
  let selectedCourses = [];
  let userSemester = '';
  let userEmail = '';

  try {
    const userData = await fetch('/user').then(response => response.json());
    console.log('User data:', userData);
    if (userData.user) {
      document.getElementById('name').value = userData.user.name || '';
      document.getElementById('email').value = userData.user.email || '';
      if (userData.user.profile_picture) {
        document.getElementById('profilePicture').src = userData.user.profile_picture;
      }
      userSemester = userData.user.semester;
      userEmail = userData.user.email;
    }
    attendanceVerified = await checkAttendanceVerified();
    console.log('Attendance verified:', attendanceVerified);
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  async function fetchCourses(isOnline) {
    const courseUrl = isOnline ? '/api/courses' : '/api/courses_offline';
    try {
      const response = await fetch(courseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  function initializeDataTable(tableId, courses, isOnline) {
    const $table = $(tableId);
    if ($.fn.DataTable.isDataTable(tableId)) {
      $table.DataTable().destroy();
    }
    $table.empty();

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
          type: isOnline ? (tableId === "#OETCoursesTable" ? "OET" : "OEHM") : data.course_type
        });
      }
      displaySelectedCoursesSummary();
    });

    return dataTable;
  }

  async function setupTable(tableId) {
    const tableContainer = document.querySelector(tableId).closest('.card');
    const toggleContainer = tableContainer.querySelector('.toggle-container');
    const toggleId = tableId === "#OETCoursesTable" ? "OETCoursesTableToggle" : "OEHMCoursesTableToggle";
    
    let isOnline = false;
    let courses = await fetchCourses(isOnline);
    
    if (!isOnline) {
      const expectedType = tableId === "#OETCoursesTable" ? "OET" : "OEHM";
      courses = courses.filter(course => course.course_type === expectedType && course.semester === userSemester);
    }

    let dataTable = initializeDataTable(tableId, courses, isOnline);

    if (attendanceVerified) {
      toggleContainer.style.display = 'flex';
      const toggle = document.getElementById(toggleId);
      
      toggle.addEventListener('change', async function() {
        isOnline = this.checked;
        courses = await fetchCourses(isOnline);
        
        if (!isOnline) {
          const expectedType = tableId === "#OETCoursesTable" ? "OET" : "OEHM";
          courses = courses.filter(course => course.course_type === expectedType && course.semester === userSemester);
        }

        if (courses.length === 0) {
          alert(`No courses available for ${isOnline ? 'online' : 'offline'} mode.`);
          this.checked = !isOnline;  // Revert the toggle
          return;
        }

        dataTable = initializeDataTable(tableId, courses, isOnline);
      });
    } else {
      toggleContainer.style.display = 'none';
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

  function getCurrentAcademicYear() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    if (currentMonth < 6) {
      return `${currentYear - 1}-${currentYear}`;
    } else {
      return `${currentYear}-${currentYear + 1}`;
    }
  }

  async function updateUserData(data) {
    try {
        const response = await fetch('/updateUserData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error in updateUserData:', error);
        throw error;
    }
}

document.getElementById('nextButton1').addEventListener('click', async function(e) {
    e.preventDefault();
    
    if (!document.getElementById('acknowledge').checked) {
        alert('Please acknowledge that the information is correct.');
        return;
    }

    const userData = {
        roll_number: document.getElementById('zcode').value,
        branch: document.getElementById('branchSelect').value,
        semester: document.getElementById('semesterSelect').value
    };

    console.log('Attempting to update user data:', userData);

    try {
        const result = await updateUserData(userData);
        console.log('Update user data result:', result);
        if (result.success) {
            // Update userSemester
            userSemester = userData.semester;
            // Move to the next step & disable first step fields
            toggleFormFields(true);
            // Reinitialize tables with updated semester
            await setupTable("#OETCoursesTable");
            await setupTable("#OEHMCoursesTable");
        } else {
            console.error('Update failed:', result);
            alert('Failed to update user data. Please try again. Error: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating user data:', error);
        alert('An error occurred while updating user data. Please try again. Error: ' + error.message);
    }
});

  async function checkOnboardingStep() {
    try {
      const response = await fetch('/checkOnboardingStep');
      const data = await response.json();
      
      if (data.step > 1) {
        // Disable first step fields and move to the appropriate step
        toggleFormFields(true);
        moveToStep(data.step);
      }
    } catch (error) {
      console.error('Error checking onboarding step:', error);
    }
  }

  function moveToStep(step) {
    const steps = document.querySelectorAll('.form-wizard-steps li');
    const fieldsets = document.querySelectorAll('.wizard-fieldset');

    fieldsets.forEach((fieldset, index) => {
      if (index === step - 1) {
        fieldset.classList.add('show');
      } else {
        fieldset.classList.remove('show');
      }
    });
  }

  function toggleFormFields(disabled) {
    const fields = ['zcode', 'branchSelect', 'semesterSelect', 'acknowledge', 'nextButton1'];
    fields.forEach(fieldId => {
      document.getElementById(fieldId).disabled = disabled;
    });
  }

  function enrollCourses() {
    console.log('Enrollment process started');
    console.log('Selected courses:', JSON.stringify(selectedCourses, null, 2));
  
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to enroll.');
      return;
    }
  
    const onlineCourses = selectedCourses.filter(course => course.mode === 'online');
    const offlineCourses = selectedCourses.filter(course => course.mode === 'offline');
  
    const onlineOETCourses = onlineCourses.filter(course => course.type === 'OET');
    const onlineOEHMCourses = onlineCourses.filter(course => course.type === 'OEHM');
    const offlineOETCourses = offlineCourses.filter(course => course.type === 'OET');
    const offlineOEHMCourses = offlineCourses.filter(course => course.type === 'OEHM');
  
    // Check for valid combination
    const hasOnlineOET = onlineOETCourses.length > 0;
    const hasOnlineOEHM = onlineOEHMCourses.length > 0;
    const hasOfflineOET = offlineOETCourses.length > 0;
    const hasOfflineOEHM = offlineOEHMCourses.length > 0;
  
    if (!((hasOnlineOET && hasOnlineOEHM) || 
          (hasOfflineOET && hasOfflineOEHM) || 
          (hasOnlineOET && hasOfflineOEHM) || 
          (hasOfflineOET && hasOnlineOEHM))) {
      alert('Invalid combination of courses. Please select either:\n' +
            '1. Online OET and Online OEHM\n' +
            '2. Offline OET and Offline OEHM\n' +
            '3. Online OET and Offline OEHM\n' +
            '4. Offline OET and Online OEHM');
      return;
    }
  
    // Offline courses validation
    if (offlineCourses.length > 0) {
      if (offlineOETCourses.length > 1 || offlineOEHMCourses.length > 1) {
        alert('For offline courses, you can select at most 1 OET course and 1 OEHM course.');
        return;
      }
    }
  
    // Online courses validation
    if (onlineCourses.length > 0) {
      // Check total hours for OET
      const totalOETHours = onlineOETCourses.reduce((sum, course) => sum + parseInt(course.hours || 0), 0);
      if (onlineOETCourses.length > 0 && (totalOETHours < 30 || totalOETHours > 45)) {
        alert('Total hours for online OET courses must be between 30 and 45.');
        return;
      }
  
      // Check total hours for OEHM
      const totalOEHMHours = onlineOEHMCourses.reduce((sum, course) => sum + parseInt(course.hours || 0), 0);
      if (onlineOEHMCourses.length > 0 && (totalOEHMHours < 30 || totalOEHMHours > 45)) {
        alert('Total hours for online OEHM courses must be between 30 and 45.');
        return;
      }
  
      // Check course count
      if (onlineOETCourses.length > 5 || onlineOEHMCourses.length > 5) {
        alert('You can select at most 5 online courses for each type (OET and OEHM).');
        return;
      }
  
      // Check for duplicate courses between OET and OEHM
      const allOnlineCourseIds = new Set(onlineCourses.map(course => course.course_id));
      if (allOnlineCourseIds.size !== onlineCourses.length) {
        alert('A course selected in OET cannot be selected again in OEHM.');
        return;
      }
    }
  
    // Prepare enrollment data
    const enrollmentData = selectedCourses.map(course => ({
      email: userEmail,
      course_id: course.course_id || course.course_code,
      total_hours: course.mode === 'online' ? course.hours : null,
      mode: course.mode.toUpperCase(),
      type: course.type,
      enrolled_semester: userSemester,
      enrolled_academic_year: getCurrentAcademicYear()
    }));
  
    console.log('Enrollment data:', JSON.stringify(enrollmentData, null, 2));
  
    // Enroll courses
    fetch('/api/enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ courses: enrollmentData }),
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        window.location.href = '/successful-onboarding';
      } else {
        alert('Enrollment failed: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Enrollment failed: ' + error.message);
    });
  }

  await setupTable("#OETCoursesTable");
  await setupTable("#OEHMCoursesTable");
  await checkOnboardingStep();

  document.getElementById('finalSubmit').addEventListener('click', enrollCourses);

  document.getElementById('semesterSelect').addEventListener('change', async function() {
    userSemester = this.value;
    await setupTable("#OETCoursesTable");
    await setupTable("#OEHMCoursesTable");
  });

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