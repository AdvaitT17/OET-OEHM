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