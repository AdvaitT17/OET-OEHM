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
let submissions = [];
let userCurrentSemester;

document.addEventListener('DOMContentLoaded', function() {
    fetchUserData()
        .then(() => fetchSubmissions())
        .catch(error => {
            console.error('Error initializing page:', error);
            showError('Failed to initialize page. Please try again later.');
        });

    document.getElementById('currentSemesterGrid').addEventListener('click', handleSubmissionClick);
    document.getElementById('previousSemestersGrid').addEventListener('click', handleSubmissionClick);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('submissionForm').addEventListener('submit', handleSubmissionSubmit);

    window.onclick = function(event) {
        if (event.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    }
});

function fetchUserData() {
    return fetch('/user')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            userCurrentSemester = data.user.semester;
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            showError('Failed to load user data. Please try again later.');
        });
}

function fetchSubmissions() {
    showLoader();
    fetch('/api/submissions')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            submissions = data;
            populateSubmissionsGrids(submissions);
            hideLoader();
        })
        .catch(error => {
            console.error('Error fetching submissions:', error);
            showError('Failed to load submissions. Please try again later.');
            hideLoader();
        });
}

function populateSubmissionsGrids(submissions) {
    const currentSemesterSubmissions = submissions.filter(s => s.enrolled_semester === userCurrentSemester);
    const previousSemesterSubmissions = submissions.filter(s => s.enrolled_semester < userCurrentSemester);

    if (currentSemesterSubmissions.length === 0) {
        document.getElementById('currentSemesterGrid').innerHTML = '<p class="no-submissions">No courses opted for this semester yet.</p>';
    } else {
        populateGrid('currentSemesterGrid', currentSemesterSubmissions);
    }

    if (previousSemesterSubmissions.length === 0) {
        document.getElementById('previousSemestersGrid').innerHTML = '<p class="no-submissions">No submissions from previous semesters.</p>';
    } else {
        populateGrid('previousSemestersGrid', previousSemesterSubmissions);
    }
}

function populateGrid(gridId, submissions) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';

    submissions.forEach((submission, index) => {
        const card = createSubmissionCard(submission);
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        grid.appendChild(card);

        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

function createSubmissionCard(submission) {
    const card = document.createElement('div');
    card.className = `submission-card ${submission.type.toLowerCase()}`;
    card.innerHTML = `
        <div class="card-header ${submission.type.toLowerCase()}">
            <span>${submission.course_name}</span>
            <span class="course-type course-type-${submission.type}">${submission.type}</span>
            <div class="card-header-circle"></div>
        </div>
        <div class="card-body">
            <div class="card-info">
                <span class="card-info-label">Semester:</span>
                <span>${submission.enrolled_semester}</span>
            </div>
            <div class="card-info">
                <span class="card-info-label">Status:</span>
                <span class="submission-status ${submission.submission_status.toLowerCase().replace(' ', '-')}">
                    ${getStatusIcon(submission.submission_status)} ${submission.submission_status}
                </span>
            </div>
            <div class="card-info">
                <span class="card-info-label">Link:</span>
                <span>${submission.submission_link && submission.submission_link !== 'Not submitted' 
                    ? `<a href="${submission.submission_link}" target="_blank">View Submission</a>`
                    : 'Not submitted'}
                </span>
            </div>
            ${(submission.submission_status === 'Not submitted' || submission.submission_status === 'Rejected')
                ? `<button class="btn btn-primary" data-course-id="${submission.course_id}">
                    ${submission.submission_link && submission.submission_link !== 'Not submitted' ? 'Edit Submission' : 'Submit'}
                   </button>`
                : ''}
        </div>
    `;
    return card;
}

function getStatusIcon(status) {
    const iconClass = {
        'Accepted': 'fa-check-circle status-accepted',
        'Rejected': 'fa-times-circle status-rejected',
        'Pending': 'fa-clock status-pending',
        'Not submitted': 'fa-exclamation-circle status-not-submitted'
    }[status] || 'fa-question-circle';

    return `<i class="fas ${iconClass} status-icon"></i>`;
}

function handleSubmissionClick(e) {
    if (e.target.classList.contains('btn-primary')) {
        const courseId = e.target.getAttribute('data-course-id');
        showSubmissionModal(courseId);
    }
}

function showSubmissionModal(courseId) {
    const modal = document.getElementById('submissionModal');
    const submission = submissions.find(s => s.course_id === courseId);
    
    document.getElementById('courseId').value = courseId;
    document.getElementById('submissionLink').value = submission.submission_link !== 'Not submitted' ? submission.submission_link : '';
    document.getElementById('submitBtn').textContent = submission.submission_link !== 'Not submitted' ? 'Update' : 'Submit';
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.querySelector('.container').style.filter = 'blur(5px)';

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('submissionModal');
    modal.classList.remove('show');
    
    document.querySelector('.container').style.filter = '';

    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

function handleSubmissionSubmit(e) {
    e.preventDefault();
    const courseId = document.getElementById('courseId').value;
    const submissionLink = document.getElementById('submissionLink').value;

    if (!submissionLink) {
        showError('Please enter a valid submission link');
        return;
    }

    submitSubmission(courseId, submissionLink);
}

function submitSubmission(courseId, submissionLink) {
    showLoader();
    fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, submissionLink }),
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showSuccess('Submission successful!');
            fetchSubmissions();
        } else {
            showError(data.message || 'Submission failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error submitting:', error);
        showError('Submission failed. Please try again later.');
    })
    .finally(() => {
        closeModal();
        hideLoader();
    });
}

function showLoader() {
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
    document.body.style.overflow = '';
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }, 100);
}