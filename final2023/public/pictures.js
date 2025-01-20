document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const pictureList = document.getElementById('picture-list');

    function updatePictureList(pictures) {
        pictureList.innerHTML = ''; // clears the existing list
        pictures.forEach(picture => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <a href="/pictures/${picture.id}">
                    <img src="${picture.path}" alt="Picture" class="thumbnail">
                </a>
                <form action="/pictures/${picture.id}?_method=DELETE" method="POST" style="display:inline;">
                    <button type="submit">Delete</button>
                </form>
            `;
            pictureList.appendChild(listItem);
        });
    }

    
    fetch('/slideshow-data')
        .then(response => response.json())
        .then(data => updatePictureList(data.pictures))
        .catch(err => console.error('Failed to load pictures:', err));

    
    socket.on('update-picture-list', (pictures) => {
        updatePictureList(pictures);
    });
});
