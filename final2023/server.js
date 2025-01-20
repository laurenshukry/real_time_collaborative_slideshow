const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const methodOverride = require('method-override');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Picture = require('./models/Picture'); 

const app = express();
const port = 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/slideshow', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.set('view engine', 'ejs');
app.use(express.static('public')); 
app.use(methodOverride('_method'));

const storage = multer.diskStorage({
    destination: 'public/uploads',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Routes
app.get('/', async (req, res) => {
    try {
        const pictureCount = await Picture.countDocuments(); // Get picture count from MongoDB
        res.render('index', { pictureCount });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/pictures', async (req, res) => {
    try {
        const pictures = await Picture.find(); 
        res.render('pictures', { pictures });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/pictures/:id', async (req, res) => {
    try {
        const picture = await Picture.findOne({ id: req.params.id }); 
        if (picture) {
            res.render('picture', { filename: picture.filename });
        } else {
            res.status(404).send('Picture not found');
        }
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/pictures', upload.single('image'), async (req, res) => {
    try {
        const newPicture = new Picture({
            id: req.file.filename,
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`
        });

        await newPicture.save(); // save the new picture to MongoDB
        updateClientsPictureList(); // notify clients about the new picture
        updateClientsPictureCount(); // notify clients about the updated picture count
        res.redirect(`/pictures/${newPicture.id}`);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.delete('/pictures/:id', async (req, res) => {
    try {
        await Picture.deleteOne({ id: req.params.id }); // delete the picture from MongoDB

        const picturePath = path.join(__dirname, 'public', 'uploads', req.params.id);
        fs.unlink(picturePath, (err) => {
            if (err) {
                console.error('Failed to delete image:', err);
                res.status(500).send('Failed to delete image');
                return;
            }

            updateClientsPictureList(); 
            updateClientsPictureCount(); 
            res.redirect('/pictures');
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/upload', (req, res) => {
    res.render('upload', { uploadedImage: null });
});

app.get('/slideshow', async (req, res) => {
    try {
        const pictures = await Picture.find(); 
        res.render('slideshow', { pictures });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/slideshow-data', async (req, res) => {
    try {
        const pictures = await Picture.find(); 
        res.json({ pictures });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Function to update the list of pictures to all clients
async function updateClientsPictureList() {
    try {
        const pictures = await Picture.find();
        io.emit('update-picture-list', pictures);
    } catch (err) {
        console.error('Error fetching pictures:', err);
    }
}

// Function to update the picture count to all clients
async function updateClientsPictureCount() {
    try {
        const count = await Picture.countDocuments(); 
        io.emit('update-picture-count', count);
    } catch (err) {
        console.error('Error fetching picture count:', err);
    }
}

// HTTP server and Socket.IO for real-time communication
const server = http.createServer(app);
const io = socketIo(server);

let currentImageIndex = 0;
let isRunning = false;
let speed = 2000;
let slideshowInterval = null;

// Function to start the slideshow
async function startSlideshow() {
    if (slideshowInterval) return; 

    try {
        const pictures = await Picture.find();  // Fetch pictures from MongoDB
        if (pictures.length === 0) {
            console.log('No pictures found for slideshow');
            return;
        }


        let callback = () => {}

        slideshowInterval = setInterval(() => {
            currentImageIndex = (currentImageIndex + 1) % pictures.length;
            io.emit('sync-slide', currentImageIndex);
        }, speed);
    } catch (err) {
        console.error('Error fetching pictures for slideshow:', err);
    }
}

// Function to stop the slideshow
function stopSlideshow() {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
}

// Socket.IO events for slideshow control
io.on('connection', (socket) => {
    
    // Send the initial state to the client
    updateClientsPictureList();
    updateClientsPictureCount();
    socket.emit('sync-slide', currentImageIndex);
    socket.emit('sync-state', { isRunning, speed });

    socket.on('manual-change', (index) => {
        currentImageIndex = index;
        io.emit('sync-slide', currentImageIndex);
    });

    socket.on('start-stop', (running) => {
        isRunning = running;
        io.emit('sync-state', { isRunning, speed });

        if (isRunning) {
            startSlideshow();
        } else {
            stopSlideshow();
        }
    });

    // Speed change
    socket.on('change-speed', (newSpeed) => {
        speed = newSpeed;
        io.emit('sync-state', { isRunning, speed });

        // Restart with new speed if it's running
        if (isRunning) {
            stopSlideshow();
            startSlideshow();
        }
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
