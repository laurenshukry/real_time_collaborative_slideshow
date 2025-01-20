document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const imageElement = document.getElementById('slideshow-image');
    const speedInput = document.getElementById('speed-input');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');

    let images = [];
    let currentIndex = 0;
    let isRunning = false;
    let slideshowInterval = null;

    //set a minimum speed limit (500ms)
    const MIN_SPEED = 500;

    function showImage(index) {
        if (images.length > 0) {
            imageElement.src = images[index].path;
            currentIndex = index;
        }
    }

    function startSlideshow() {
        if (slideshowInterval) return;

        const speed = Math.max(parseInt(speedInput.value) || 2000, MIN_SPEED); // Enforce minimum speed

        slideshowInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % images.length;
            showImage(currentIndex);

            // Emit 'manual-change' event but throttle it to avoid overwhelming the network
            throttle(() => {
                socket.emit('manual-change', currentIndex);
            }, 300); // Throttle the event to fire at most every 300ms
        }, speed);
    }

    function stopSlideshow() {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }

    socket.on('sync-slide', (index) => {
        showImage(index);
    });

    // Syncing the state (start, stop, and speed)
    socket.on('sync-state', (state) => {
        isRunning = state.isRunning;
        speedInput.value = state.speed;

        // If the slideshow is running, restart it with the new speed
        if (isRunning) {
            stopSlideshow();  // Clear the old interval
            startSlideshow(); // Start with the updated speed
        } else {
            stopSlideshow();  // Just stop if not running
        }
    });

    // Start the slideshow
    startBtn.addEventListener('click', () => {
        socket.emit('start-stop', true); // Notify others to start
    });

    // Stop the slideshow
    stopBtn.addEventListener('click', () => {
        socket.emit('start-stop', false); // Notify others to stop
    });

    // Next image button logic
    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % images.length;
        showImage(currentIndex);
        socket.emit('manual-change', currentIndex); // Sync manual change
    });

    // Previous image button logic
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        showImage(currentIndex);
        socket.emit('manual-change', currentIndex); // Sync manual change
    });

    // Change slideshow speed
    speedInput.addEventListener('change', () => {
        const newSpeed = Math.max(parseInt(speedInput.value) || 2000, MIN_SPEED); // Enforce minimum speed
        socket.emit('change-speed', newSpeed); // Notify others about the new speed

        // If the slideshow is running, restart it with the new speed
        if (isRunning) {
            stopSlideshow();  // Clear the old interval
            startSlideshow(); // Start with the updated speed
        }
    });

    // Fetch and set up images on load
    fetch('/slideshow-data')
        .then(response => response.json())
        .then(data => {
            images = data.pictures;
            if (images.length > 0) {
                showImage(0); // Show the first image initially
            }
        })
        .catch(err => console.error('Failed to load images:', err));

    // Utility function to throttle events
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
});
