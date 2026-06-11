require('dotenv').config();
const express = require('express');
const path = require('path');
const hbs = require('hbs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

// Multer Storage Configuration
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'sisa_album',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp']
    }
});
const upload = multer({ storage: storage });
const app = express();
const PORT = process.env.PORT || 3001;

// Database Connection
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB User Database');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
};

// Global middleware to ensure DB connection before handling requests on Vercel
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Admission Schema
const admissionSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    dob: { type: Date, required: true },
    whatsappNumber: { type: String, required: true },
    email: { type: String },
    address: { type: String, required: true },
    previouslyStudied: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now }
});

const Admission = mongoose.models.Admission || mongoose.model('Admission', admissionSchema);

// Reading Corner Schema
const readingEntrySchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['Story', 'Poem', 'Feature'] },
    title: { type: String },
    writerName: { type: String, required: true },
    writerDetails: { type: String },
    content: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const ReadingEntry = mongoose.models.ReadingEntry || mongoose.model('ReadingEntry', readingEntrySchema);

// Contact Message Schema
const messageSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
});

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// User Schema
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema, 'Signup Details');

// Album Photo Schema
const albumPhotoSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    description: { type: String },
    uploadedAt: { type: Date, default: Date.now }
});

const AlbumPhoto = mongoose.models.AlbumPhoto || mongoose.model('AlbumPhoto', albumPhotoSchema);

// Youtube Video Schema
const youtubeVideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    videoId: { type: String, required: true },
    category: { type: String, required: true },
    isShort: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
});

const YoutubeVideo = mongoose.models.YoutubeVideo || mongoose.model('YoutubeVideo', youtubeVideoSchema);

// Important Message Schema
const importantMessageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    imageUrl: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
});

const ImportantMessage = mongoose.models.ImportantMessage || mongoose.model('ImportantMessage', importantMessageSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Configuration
const MongoStore = require('connect-mongo').default || require('connect-mongo');

app.use(session({
    secret: 'sisa-portal-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions'
    }),
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use((req, res, next) => {
    const logLine = `${new Date().toISOString()} - ${req.method} ${req.url}`;
    console.log(logLine);
    next();
});

// Global user middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Admin Authentication Middleware (Firewall)
const ALLOWED_IP = '2409:40f3:1482:3207:8000::';
const SECRET_TOKEN = 'SwalihAdminSuperSecret2026!';

const requireAdmin = (req, res, next) => {
    /*
    // Clean up the IP format
    const clientIp = req.ip.includes('::ffff:') ? req.ip.split(':').pop() : req.ip;

    // Condition 1: Active session
    if (req.session && req.session.isAdmin === true) {
        return next();
    }

    // Condition 2: Matching IP
    if (clientIp === ALLOWED_IP) {
        return next();
    }

    // Condition 3: Secret Token in URL
    if (req.query.token === SECRET_TOKEN) {
        console.log(`[Admin Access Granted] Token used. Establishing session for IP: ${clientIp}`);
        req.session.isAdmin = true;
        
        // Remove token from URL
        const cleanUrl = req.originalUrl.split('?')[0]; 
        return res.redirect(cleanUrl);
    }

    // Deny access
    console.warn(`[Admin Blocked] Unauthorized attempt from IP: ${clientIp}`);
    return res.status(403).send('403 Forbidden: Access denied.');
    */

    // IP Filtering temporarily disabled to allow access from any IP
    return next();
};

app.use('/admin', requireAdmin);

// Setup Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Register partials
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// Handlebars Helpers
hbs.registerHelper('substring', function (str, start, end) {
    if (!str) return '';
    return str.toString().substring(start, end);
});

hbs.registerHelper('formatDate', function (date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
});

hbs.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

hbs.registerHelper('formatDate', function (date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', async (req, res) => {
    try {
        const latestEntries = await ReadingEntry.find({ isApproved: true }).sort({ createdAt: -1 }).limit(3);
        const albumPhotos = await AlbumPhoto.find().sort({ uploadedAt: -1 }).limit(3);
        const allVideos = await YoutubeVideo.find().sort({ uploadedAt: -1 });
        const importantMessage = await ImportantMessage.findOne({ isActive: true });

        res.render('home', {
            title: 'SIRAJUL IRFAN - Tradition Meets Technological Efficiency',
            latestEntries: latestEntries,
            albumPhotos: albumPhotos,
            youtubeVideos: allVideos,
            importantMessage: importantMessage,
            messageSuccess: req.query.success === 'message_sent',
            messageError: req.query.error === 'message_failed',
            user: req.session.user,
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error fetching latest entries/photos/videos:', err);
        res.render('home', { title: 'SIRAJUL IRFAN - Tradition Meets Technological Efficiency', latestEntries: [], albumPhotos: [], youtubeVideos: [], importantMessage: null });
    }
});

app.get('/reading-corner', async (req, res) => {
    try {
        const entries = await ReadingEntry.find({ isApproved: true }).sort({ createdAt: -1 });
        res.render('reading-corner', {
            title: 'Reading Corner - SIRAJUL IRFAN',
            readingEntries: entries,
            success: req.query.success === 'submitted',
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error fetching reading corner entries:', err);
        res.render('reading-corner', { title: 'Reading Corner - SIRAJUL IRFAN', readingEntries: [] });
    }
});

// Public Submission Route
app.post('/reading-corner/submit', async (req, res) => {
    try {
        const newEntry = new ReadingEntry({
            type: req.body.type,
            title: req.body.title,
            writerName: req.body.writerName,
            writerDetails: req.body.writerDetails,
            content: req.body.content,
            isApproved: false // Requires admin approval
        });
        await newEntry.save();
        res.redirect('/reading-corner?success=submitted');
    } catch (err) {
        console.error('Error submitting reading entry:', err);
        res.status(500).send('Error submitting your work');
    }
});



app.get('/admin', async (req, res) => {

    try {
        console.log('Fetching dashboard data...');
        const admissions = await Admission.find().sort({ submittedAt: -1 });
        const totalReadingEntries = await ReadingEntry.countDocuments();
        const pendingReadingCount = await ReadingEntry.countDocuments({ isApproved: false });
        const totalMessages = await Message.countDocuments();
        const totalUsers = await User.countDocuments();
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

        res.render('adminDashboard', {
            title: 'Admin Dashboard - SISA Portal',
            admissions: admissions,
            totalEnrollment: admissions.length,
            totalReadingEntries,
            pendingReadingCount,
            totalMessages,
            totalUsers,
            recentUsers,
            activePage: 'dashboard',
            adminName: (req.session && req.session.user && req.session.user.fullName) ? req.session.user.fullName : 'Admin'
        });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.render('adminDashboard', { title: 'Admin Dashboard - SIRAJUL IRFAN', admissions: [] });
    }
});

// Admin Enrollments Routes
app.get('/admin/enrollments', async (req, res) => {
    try {
        await connectDB(); // Ensure DB is connected before querying
        const admissions = await Admission.find().sort({ submittedAt: -1 });
        res.render('adminEnrollments', {
            title: 'Manage Enrollments - SISA Admin',
            admissions: admissions,
            activePage: 'enrollments'
        });
    } catch (err) {
        console.error('Error fetching enrollments:', err);
        res.status(500).send('Error loading enrollments page');
    }
});

app.post('/admin/enrollments/delete/:id', async (req, res) => {
    try {
        await Admission.findByIdAndDelete(req.params.id);
        res.redirect('/admin/enrollments');
    } catch (err) {
        console.error('Error deleting enrollment:', err);
        res.status(500).send('Error deleting enrollment');
    }
});

// Admin Reading Corner Routes
app.get('/admin/reading-corner', async (req, res) => {
    try {
        const approvedEntries = await ReadingEntry.find({ isApproved: true }).sort({ createdAt: -1 });
        const pendingEntries = await ReadingEntry.find({ isApproved: false }).sort({ createdAt: -1 });

        // Calculate category counts
        const storyCount = await ReadingEntry.countDocuments({ type: 'Story' });
        const poemCount = await ReadingEntry.countDocuments({ type: 'Poem' });
        const featureCount = await ReadingEntry.countDocuments({ type: 'Feature' });

        res.render('adminReadingCorner', {
            title: 'Manage Writing Corner - Admin',
            readingEntries: approvedEntries,
            pendingEntries: pendingEntries,
            storyCount,
            poemCount,
            featureCount,
            totalCount: approvedEntries.length + pendingEntries.length,
            activePage: 'reading-corner'
        });
    } catch (err) {
        console.error('Error fetching reading entries:', err);
        res.status(500).send('Error loading management page');
    }
});

app.post('/admin/reading-corner/add', async (req, res) => {
    try {
        const newEntry = new ReadingEntry({
            type: req.body.type,
            title: req.body.title,
            writerName: req.body.writerName,
            writerDetails: req.body.writerDetails,
            content: req.body.content,
            isApproved: true // Admin added entries are auto-approved
        });
        await newEntry.save();
        res.redirect('/admin/reading-corner');
    } catch (err) {
        console.error('Error saving reading entry:', err);
        res.status(500).send('Error saving entry');
    }
});

app.post('/admin/reading-corner/approve/:id', async (req, res) => {
    try {
        await ReadingEntry.findByIdAndUpdate(req.params.id, { isApproved: true });
        res.redirect('/admin/reading-corner');
    } catch (err) {
        console.error('Error approving reading entry:', err);
        res.status(500).send('Error approving entry');
    }
});

app.post('/admin/reading-corner/delete/:id', async (req, res) => {
    try {
        await ReadingEntry.findByIdAndDelete(req.params.id);
        res.redirect('/admin/reading-corner');
    } catch (err) {
        console.error('Error deleting reading entry:', err);
        res.status(500).send('Error deleting entry');
    }
});


// Contact Form Route
app.post('/contact', async (req, res) => {
    try {
        const newMessage = new Message({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            message: req.body.message
        });
        await newMessage.save();
        res.redirect('/?success=message_sent#contact');
    } catch (err) {
        console.error('Error saving contact message:', err);
        res.status(500).redirect('/?error=message_failed#contact');
    }
});

// Admin Messages Route
app.get('/admin/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ submittedAt: -1 });
        res.render('adminMessages', {
            title: 'Messages - Admin Dashboard',
            messages: messages,
            activePage: 'messages'
        });
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).send('Error loading messages');
    }
});

// Admin Delete Message Route
app.post('/admin/messages/delete/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.redirect('/admin/messages');
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).send('Error deleting message');
    }
});

// Admin Users Routes
app.get('/admin/users', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('adminUsers', {
            title: 'Manage Users - Admin',
            users: users,
            activePage: 'users'
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Error loading users page');
    }
});

app.post('/admin/users/delete/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).send('Error deleting user');
    }
});

app.get('/admission', (req, res) => {
    res.render('admission', { title: 'Apply Now - SIRAJUL IRFAN Admission Portal', isLandingPage: true });
});

app.post('/admission', async (req, res) => {
    try {
        const newAdmission = new Admission({
            fullName: req.body.fullName,
            dob: req.body.dob,
            whatsappNumber: req.body.whatsappNumber,
            email: req.body.email,
            address: req.body.address,
            previouslyStudied: req.body.previouslyStudied === 'on' || req.body.previouslyStudied === true
        });

        await newAdmission.save();
        res.render('admission', {
            title: 'Apply Now - SIRAJUL IRFAN Admission Portal',
            success: 'Application submitted successfully! Our team will contact you soon.',
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error saving admission:', err);
        res.status(500).render('admission', {
            title: 'Apply Now - SIRAJUL IRFAN Admission Portal',
            error: 'There was an error processing your application. Please try again.'
        });
    }
});

// Admin Delete Admission Route
app.post('/admin/delete/:id', async (req, res) => {
    try {
        await Admission.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error deleting admission:', err);
        res.status(500).send('Error deleting record');
    }
});

// Admission Status Route
app.post('/admission/status', async (req, res) => {
    try {
        const { whatsappNumber } = req.body;
        const student = await Admission.findOne({ whatsappNumber });

        if (student) {
            res.render('admission', {
                title: 'Apply Now - SIRAJUL IRFAN Admission Portal',
                statusResult: {
                    fullName: student.fullName,
                    id: student._id.toString().substring(18, 24)
                },
                isLandingPage: true
            });
        } else {
            res.render('admission', {
                title: 'Apply Now - SIRAJUL IRFAN Admission Portal',
                statusError: whatsappNumber,
                isLandingPage: true
            });
        }
    } catch (err) {
        console.error('Error checking status:', err);
        res.status(500).send('Error checking status');
    }
});



app.get('/admin/test-keys', (req, res) => {
    res.send(`
        <h3>Cloudinary Keys Status:</h3>
        Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ കിട്ടിയിട്ടുണ്ട്' : '❌ ഇല്ല'} <br>
        API Key: ${process.env.CLOUDINARY_API_KEY ? '✅ കിട്ടിയിട്ടുണ്ട്' : '❌ ഇല്ല'} <br>
        API Secret: ${process.env.CLOUDINARY_API_SECRET ? '✅ കിട്ടിയിട്ടുണ്ട്' : '❌ ഇല്ല'}
    `);
});


// Album Routes
app.get('/album', async (req, res) => {
    try {
        const photos = await AlbumPhoto.find().sort({ uploadedAt: -1 });
        res.render('album', {
            title: 'Album - SIRAJUL IRFAN',
            photos: photos,
            user: req.session.user,
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error fetching album photos:', err);
        res.status(500).send('Server Error');
    }
});

// Videos Public Route
app.get('/videos', async (req, res) => {
    try {
        const videos = await YoutubeVideo.find().sort({ uploadedAt: -1 });
        res.render('videos', {
            title: 'Featured Videos - SIRAJUL IRFAN',
            youtubeVideos: videos,
            user: req.session.user,
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).send('Server Error');
    }
});

// Admin Album Routes
app.get('/admin/album', requireAdmin, async (req, res) => {
    try {
        const photos = await AlbumPhoto.find().sort({ uploadedAt: -1 });
        res.render('adminAlbum', {
            title: 'Manage Album - Admin',
            photos: photos,
            user: req.session.user,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error('Error fetching admin album:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/album/upload', requireAdmin, (req, res) => {
    upload.single('photo')(req, res, async (err) => {
        if (err) {
            console.error('### CLOUDINARY UPLOAD ERROR ###');
            console.error(err);
            console.error(JSON.stringify(err, null, 2));
            return res.redirect('/admin/album?error=upload_failed');
        }

        try {
            if (!req.file) {
                console.error('### UPLOAD ERROR: No File ###');
                return res.redirect('/admin/album?error=no_file_uploaded');
            }

            const newPhoto = new AlbumPhoto({
                imageUrl: req.file.path,
                description: req.body.description || ''
            });

            await newPhoto.save();
            res.redirect('/admin/album?success=photo_uploaded');
        } catch (dbErr) {
            console.error('### DATABASE ERROR ###', dbErr);
            res.redirect('/admin/album?error=upload_failed');
        }
    });
});

app.post('/admin/album/delete/:id', requireAdmin, async (req, res) => {
    try {
        const photo = await AlbumPhoto.findById(req.params.id);
        if (!photo) return res.redirect('/admin/album?error=photo_not_found');

        // Remove file from Cloudinary (if it's a Cloudinary URL)
        if (photo.imageUrl && photo.imageUrl.includes('cloudinary.com')) {
            const urlParts = photo.imageUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const publicId = 'sisa_album/' + filename.split('.')[0];
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cErr) {
                console.error('Cloudinary deletion error:', cErr);
            }
        } else if (photo.imageUrl && photo.imageUrl.startsWith('/images/album/')) {
            // Keep fallback for legacy local images if needed
            const filePath = path.join(__dirname, 'public', photo.imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await AlbumPhoto.findByIdAndDelete(req.params.id);
        res.redirect('/admin/album?success=photo_deleted');
    } catch (err) {
        console.error('Error deleting photo:', err);
        res.redirect('/admin/album?error=delete_failed');
    }
});

// Admin Important Message Routes
app.get('/admin/important-message', requireAdmin, async (req, res) => {
    try {
        const messages = await ImportantMessage.find().sort({ uploadedAt: -1 });
        res.render('adminImportantMessage', {
            title: 'Manage Important Message - Admin',
            activePage: 'important-message',
            messages: messages,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error('Error fetching important messages:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/important-message/upload', requireAdmin, (req, res) => {
    upload.single('poster')(req, res, async (err) => {
        if (err) {
            console.error('Upload Error:', err);
            return res.redirect('/admin/important-message?error=upload_failed');
        }
        try {
            if (!req.file) {
                return res.redirect('/admin/important-message?error=no_file_uploaded');
            }

            const count = await ImportantMessage.countDocuments();
            
            const newMessage = new ImportantMessage({
                title: req.body.title,
                subtitle: req.body.subtitle || '',
                imageUrl: req.file.path,
                isActive: count === 0 // auto-activate if it's the first one
            });

            await newMessage.save();
            res.redirect('/admin/important-message?success=message_uploaded');
        } catch (dbErr) {
            console.error('Database Error:', dbErr);
            res.redirect('/admin/important-message?error=upload_failed');
        }
    });
});

app.post('/admin/important-message/activate/:id', requireAdmin, async (req, res) => {
    try {
        await ImportantMessage.updateMany({}, { isActive: false });
        await ImportantMessage.findByIdAndUpdate(req.params.id, { isActive: true });
        res.redirect('/admin/important-message?success=message_activated');
    } catch (err) {
        console.error('Error activating message:', err);
        res.redirect('/admin/important-message?error=activate_failed');
    }
});

app.post('/admin/important-message/delete/:id', requireAdmin, async (req, res) => {
    try {
        const message = await ImportantMessage.findById(req.params.id);
        if (!message) return res.redirect('/admin/important-message?error=message_not_found');

        if (message.imageUrl && message.imageUrl.includes('cloudinary.com')) {
            const urlParts = message.imageUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const publicId = 'sisa_album/' + filename.split('.')[0];
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cErr) {
                console.error('Cloudinary deletion error:', cErr);
            }
        }
        await ImportantMessage.findByIdAndDelete(req.params.id);
        res.redirect('/admin/important-message?success=message_deleted');
    } catch (err) {
        console.error('Error deleting message:', err);
        res.redirect('/admin/important-message?error=delete_failed');
    }
});

// Admin Youtube Video Routes
app.get('/admin/videos', requireAdmin, async (req, res) => {
    try {
        const videos = await YoutubeVideo.find().sort({ uploadedAt: -1 });
        res.render('adminVideos', {
            title: 'Manage Videos - Admin',
            activePage: 'videos',
            videos: videos,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error('Error fetching admin videos:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/videos/add', requireAdmin, async (req, res) => {
    try {
        const { title, videoId, category } = req.body;
        const isShort = req.body.isShort === 'on' || req.body.isShort === 'true' || (videoId && videoId.includes('shorts/'));
        let parsedVideoId = videoId.trim();
        if (parsedVideoId.length !== 11 || parsedVideoId.includes('/') || parsedVideoId.includes('?')) {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
            const match = parsedVideoId.match(regExp);
            if (match && match[2].length === 11) {
                parsedVideoId = match[2];
            }
        }

        const newVideo = new YoutubeVideo({
            title,
            videoId: parsedVideoId,
            category,
            isShort
        });
        await newVideo.save();
        res.redirect('/admin/videos?success=video_added');
    } catch (err) {
        console.error('Error adding video:', err);
        res.redirect('/admin/videos?error=add_failed');
    }
});

app.post('/admin/videos/delete/:id', requireAdmin, async (req, res) => {
    try {
        await YoutubeVideo.findByIdAndDelete(req.params.id);
        res.redirect('/admin/videos?success=video_deleted');
    } catch (err) {
        console.error('Error deleting video:', err);
        res.redirect('/admin/videos?error=delete_failed');
    }
});

// Login system has been removed in favor of IP/Token firewall.

app.get('/student', (req, res) => {
    res.render('studentDashboard', { title: 'Student Portal - SIRAJUL IRFAN' });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).send('Something broke!');
});

// Start Server
app.listen(PORT, () => {
    console.log(`### SERVER STARTING ON PORT ${PORT} ###`);
});

module.exports = app;
