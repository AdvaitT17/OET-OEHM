document.addEventListener('DOMContentLoaded', function () {
    fetch('/user')
        .then(response => response.json())
         .then(data => {
             var profilePicture = document.getElementById('profilePicture');
              if (profilePicture) {
                profilePicture.src = data.user ? data.user.profile_picture : 'images/profile/default-profile.jpg';
             }
        })
         .catch(error => console.error('Error fetching user data:', error));
 });

 let userDetails = {};
 let totalLearningHours = 0;
 let courses = [];
 
 document.addEventListener('DOMContentLoaded', function() {
     fetchUserData()
         .then(() => fetchTotalLearningHours())
         .then(() => fetchEnrollments())
         .then(() => updateStats())
         .catch(error => {
             console.error('Error initializing page:', error);
         });
 });
 
 function fetchUserData() {
     return fetch('/user')
         .then(response => {
             if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
             return response.json();
         })
         .then(data => {
             userDetails = data.user;
             updateUserDetailsDisplay();
         })
         .catch(error => {
             console.error('Error fetching user data:', error);
         });
 }
 
 function updateUserDetailsDisplay() {
     const nameElement = document.getElementById('userName');
     const emailElement = document.getElementById('userEmail');
     const detailsElement = document.getElementById('userDetails');
 
     if (nameElement) nameElement.textContent = userDetails.name || 'User Name';
     if (emailElement) emailElement.textContent = userDetails.email || 'Email';
     if (detailsElement) detailsElement.textContent = `Semester ${userDetails.semester || 'N/A'}`;
 }
 
 function fetchTotalLearningHours() {
     return fetch('/api/total-learning-hours')
         .then(response => {
             if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
             return response.json();
         })
         .then(data => {
             totalLearningHours = data.total || 0;
         })
         .catch(error => {
             console.error('Error fetching total learning hours:', error);
         });
 }
 
 function fetchEnrollments() {
    return fetch('/api/enrollments')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            courses = data;
            populateCoursesGrids(courses);
        })
        .catch(error => {
            console.error('Error fetching enrollments:', error);
            document.getElementById('currentSemesterGrid').innerHTML = '<p>Error loading courses. Please try again later.</p>';
            document.getElementById('previousSemesterGrid').innerHTML = '<p>Error loading courses. Please try again later.</p>';
        });
}

function populateCoursesGrids(courses) {
    const currentSemesterCourses = courses.filter(c => c.enrolled_semester == userDetails.semester);
    const previousSemesterCourses = courses.filter(c => c.enrolled_semester < userDetails.semester);

    populateGrid('currentSemesterGrid', currentSemesterCourses);
    populateGrid('previousSemesterGrid', previousSemesterCourses);
}

function populateGrid(gridId, courses) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    grid.innerHTML = courses.length === 0 ? '<p>No courses found.</p>' : '';

    courses.forEach(course => {
        const card = createCourseCard(course);
        grid.appendChild(card);
    });
}

function createCourseCard(course) {
    const card = document.createElement('div');
    card.className = 'course-card';
    
    const capitalizedMode = course.mode.charAt(0).toUpperCase() + course.mode.slice(1);
    
    // Truncate course name if it's too long
    const maxLength = 50; 
    const truncatedName = course.course_name.length > maxLength 
        ? course.course_name.substring(0, maxLength) + '...' 
        : course.course_name;
    
    card.innerHTML = `
        <div class="card-header ${course.type.toLowerCase()} ${course.mode.toLowerCase()}">
            <div class="course-name-container">
                <span class="course-name" title="${course.course_name}">${truncatedName}</span>
                <span class="course-type-badge">${course.type} - ${capitalizedMode}</span>
            </div>
        </div>
        <div class="card-body">
            <div class="card-info">
                <span class="card-info-label">Semester:</span>
                <span>${course.enrolled_semester}</span>
            </div>
            <div class="card-info">
                <span class="card-info-label">Status:</span>
                <span class="completion-status ${course.course_completed ? 'completed' : 'not-completed'}">
                    ${course.course_completed ? 'Completed' : 'Not Completed'}
                </span>
            </div>
        </div>
    `;
    return card;
}

function updateStats() {
    const completedCourses = courses.filter(c => c.course_completed).length;
    const enrolledCourses = courses.length;

    const completedElement = document.getElementById('completedCourses');
    const enrolledElement = document.getElementById('enrolledCourses');
    const hoursElement = document.getElementById('totalHours');

    if (completedElement) completedElement.textContent = completedCourses;
    if (enrolledElement) enrolledElement.textContent = enrolledCourses;
    if (hoursElement) hoursElement.textContent = totalLearningHours;
}