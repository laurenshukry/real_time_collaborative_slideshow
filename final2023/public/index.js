document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const pictureCountElement = document.getElementById('picture-count');

    
    function updatePictureCount(count) {
        pictureCountElement.textContent = count;
    }

    
    socket.on('update-picture-count', (count) => {
        updatePictureCount(count);
    });
});
