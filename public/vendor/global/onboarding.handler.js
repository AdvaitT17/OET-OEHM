document.addEventListener('DOMContentLoaded',function(){fetch('/user').then(response=>response.json()).then(data=>{var profilePicture=document.getElementById('profilePicture');if(profilePicture){profilePicture.src=data.user?data.user.profile_picture:'images/profile/default-profile.jpg';}document.getElementById('name').value=data.user?data.user.name:'';document.getElementById('email').value=data.user?data.user.email:'';}).catch(error=>console.error('Error fetching user data:',error));function updateUserData(field,value){fetch('/updateUserData',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({field:field,value:value})}).then(response=>response.json()).then(data=>{if(data.success){console.log(`${field} updated successfully`);}else{console.error(`Failed to update ${field}: ${data.message}`);}}).catch(error=>console.error('Error updating user data:',error));}document.getElementById('nextButton1').addEventListener('click',function(event){event.preventDefault();var isAcknowledged=document.getElementById('acknowledge').checked;if(!isAcknowledged){alert('Please confirm that the information you have entered is correct.');return;}var name=document.getElementById('name').value;var email=document.getElementById('email').value;var rollNumber=document.getElementById('zcode').value;var branch=document.getElementById('branchSelect').value;var semester=document.getElementById('semesterSelect').value;updateUserData('name',name);updateUserData('email',email);updateUserData('roll_number',rollNumber);updateUserData('branch',branch);updateUserData('semester',semester);});});
$(document).ready(function() {
  var selectedCourses = []; // Array to store selected courses
  var $oetCoursesTable, $oehmCoursesTable;
  var oetDataTable, oehmDataTable;

  // Function to initialize DataTable and handle course selection
  function initializeDataTable(tableId, dataTable) {
    const $table = $(tableId);
    if (!$table.length) {
      console.error(`Table with ID ${tableId} not found in the DOM.`);
      return;
    }

    // Destroy the existing DataTable instance if it exists
    if (dataTable) {
      dataTable.destroy();
    }

    dataTable = $table.DataTable({
      columns: [
        { data: "course_name" },
        { data: "university" },
        { data: "domain" },
        { data: "difficulty_level" },
        { data: "language" },
        { data: "hours" }
      ],
      language: {
        paginate: {
          next: '<i class="fa fa-angle-double-right" aria-hidden="true"></i>',
          previous: '<i class="fa fa-angle-double-left" aria-hidden="true"></i>'
        }
      },
      responsive: true
    });

    fetch("/api/courses")
      .then(response => response.json())
      .then(function(courses) {
        dataTable.clear().rows.add(courses).draw();
      })
      .catch(function(error) {
        console.error("Error fetching courses:", error);
      });

    $table.on('click', 'tbody tr', function() {
      var data = dataTable.row(this).data();
      if ($(this).hasClass('selected')) {
        $(this).removeClass('selected');
        selectedCourses = selectedCourses.filter(course => course.course_id !== data.course_id);
      } else {
        $(this).addClass('selected');
        selectedCourses.push({
          course_id: data.course_id,
          total_hours: data.hours,
          mode: 'online', // Assuming the mode is online for this example
          type: tableId === "#OETCoursesTable" ? "OET" : "OEHM", // Determining the type based on the tableId
          semester: $('#semesterDropdown').val() // Fetching the semester value from a dropdown or any other input field
        });        
      }
    });

    return dataTable;
  }

  // Function to handle enrollment
  function enrollCourses() {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course to enroll.');
      return;
    }

    fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courses: selectedCourses })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Enrollment successful!');
          selectedCourses = [];
          $('.selected').removeClass('selected');

          // Reinitialize DataTables with updated data
          oetDataTable = initializeDataTable("#OETCoursesTable", oetDataTable);
          oehmDataTable = initializeDataTable("#OEHMCoursesTable", oehmDataTable);
        } else {
          alert('Enrollment failed: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error enrolling courses:', error);
      });
  }

  // Initialize DataTables for online courses
  $oetCoursesTable = $('#OETCoursesTable');
  $oehmCoursesTable = $('#OEHMCoursesTable');
  oetDataTable = initializeDataTable("#OETCoursesTable", oetDataTable);
  oehmDataTable = initializeDataTable("#OEHMCoursesTable", oehmDataTable);

  // Event listener for the enrollment button
  $('#finalSubmit').on('click', enrollCourses);
});
