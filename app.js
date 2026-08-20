require('dotenv').config();
const express = require('express');
const path = require('path');
const hbs = require('hbs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const festflowService = require('./services/festflowService');


// Heyzine API Digital Magazines Controller
async function fetchHeyzineMagazines() {
    const apiKey = process.env.HEYZINE_API_KEY || 'c502881430e690393919d990bf4315897ea65279.2710f0f3e0abb7c8';
    try {
        let response;
        try {
            response = await axios.get('https://heyzine.com/api1/flipbook-list', {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 8000
            });
        } catch (err) {
            response = await axios.get(`https://heyzine.com/api1/flipbook-list?k=${apiKey}`, {
                timeout: 8000
            });
        }

        const rawList = Array.isArray(response.data) ? response.data : [];
        if (!rawList.length) return getFallbackMagazines();

        const magazines = rawList.map(item => {
            const title = item.title && item.title.trim() ? item.title : 'Sirajul Irfan Digital Magazine';
            const embedUrl = item.links?.custom || item.links?.base || `https://heyzine.com/flip-book/${(item.id || '').replace('.pdf', '')}.html`;
            const coverImage = item.links?.thumbnail || '/images/CAC02790.JPG';
            const description = item.description || item.subtitle || 'Interactive annual souvenir, magazine, and institutional report.';

            const yearMatch = title.match(/\b(19|20)\d{2}\b/);
            const dateObj = item.date ? new Date(item.date) : new Date();
            const year = yearMatch ? yearMatch[0] : (item.date ? dateObj.getFullYear().toString() : '2024');

            return {
                id: item.id,
                title,
                year,
                embedUrl,
                coverImage,
                description,
                rawDate: dateObj.getTime()
            };
        });

        // Chronological sorting (oldest to newest by date / year)
        magazines.sort((a, b) => {
            if (a.year !== b.year && !isNaN(a.year) && !isNaN(b.year)) {
                return parseInt(a.year) - parseInt(b.year);
            }
            return a.rawDate - b.rawDate;
        });

        return magazines;
    } catch (error) {
        console.error('Error fetching Heyzine magazines API:', error.message);
        return getFallbackMagazines();
    }
}

function getFallbackMagazines() {
    return [
        {
            title: 'Sirajul Irfan Annual Report 2020',
            year: '2020',
            embedUrl: 'https://heyzine.com/flip-book/f1e2f88736.html',
            coverImage: '/images/CAC02790.JPG',
            description: 'Foundational publication capturing the early journey, student activities, and educational endeavors of 2020.'
        }
    ];
}

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

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    studentClass: { type: String, required: true },
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
    isImportant: { type: Boolean, default: false },
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

// Committee Schema
const committeeSchema = new mongoose.Schema({
    year: { type: String, required: true },
    presidentName: { type: String, required: true },
    presidentLocation: { type: String, required: false },
    presidentImage: { type: String, required: true },
    gsName: { type: String, required: true },
    gsLocation: { type: String, required: false },
    gsImage: { type: String, required: true },
    fsName: { type: String, required: true },
    fsLocation: { type: String, required: false },
    fsImage: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
});

const Committee = mongoose.models.Committee || mongoose.model('Committee', committeeSchema);

// Admission Setting Schema
const admissionSettingSchema = new mongoose.Schema({
    isOpen: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

const AdmissionSetting = mongoose.models.AdmissionSetting || mongoose.model('AdmissionSetting', admissionSettingSchema);

// Digital Magazine Schema
const magazineSchema = new mongoose.Schema({
    title: { type: String, required: true },
    year: { type: String, required: true },
    embedUrl: { type: String, required: true },
    coverImage: { type: String, default: '' },
    description: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now }
});

const Magazine = mongoose.models.Magazine || mongoose.model('Magazine', magazineSchema);

// Middleware (moved to top)

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

// Global user and settings middleware
app.use(async (req, res, next) => {
    res.locals.user = req.session.user;
    try {
        const setting = await AdmissionSetting.findOne();
        res.locals.admissionOpen = setting ? setting.isOpen : false;
    } catch (err) {
        console.error('Error fetching admission setting:', err);
        res.locals.admissionOpen = false;
    }
    next();
});

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

hbs.registerHelper('eq', function (a, b) {
    return a === b;
});

hbs.registerHelper('ne', function (a, b) {
    return a !== b;
});

const padTwoFn = function (val) {
    if (!val) return '01';
    const num = parseInt(val, 10);
    if (!isNaN(num)) return String(num).padStart(2, '0');
    return String(val);
};

hbs.registerHelper('padTwo', padTwoFn);
if (hbs.handlebars) {
    hbs.handlebars.registerHelper('padTwo', padTwoFn);
    hbs.handlebars.registerHelper('eq', function (a, b) { return a === b; });
    hbs.handlebars.registerHelper('ne', function (a, b) { return a !== b; });
}



hbs.registerHelper('isNewArticle', function (createdAt) {
    if (!createdAt) return false;
    const articleTime = new Date(createdAt).getTime();
    const now = Date.now();
    return (now - articleTime) <= (24 * 60 * 60 * 1000);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// ==========================================
// 1. PUBLIC ADMIN LOGIN ROUTES
// ==========================================
app.get('/admin/login', (req, res) => {
    // If they are already logged in, send them straight to the dashboard
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin');
    }
    // Render the login form
    res.render('login', { layout: false, error: req.query.error === 'invalid_password' });
});

app.post('/admin/login', (req, res) => {
    const { identifier, password } = req.body;

    if (identifier === 'sisa@26' && password === 'sisa123*') {
        req.session.isAdmin = true;
        req.session.user = { fullName: 'Admin' };

        return req.session.save((err) => {
            if (err) console.error('Session save error:', err);
            // Success! Redirect to the protected dashboard
            res.redirect('/admin');
        });
    } else {
        // Failure! Redirect back with an error flag
        res.redirect('/admin/login?error=invalid_password');
    }
});

// Admin Logout Route
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// ==========================================
// 2. AUTHENTICATION MIDDLEWARE
// ==========================================
const requireAdmin = (req, res, next) => {
    // If there is no active admin session, boot them to the login page
    if (!req.session.isAdmin) {
        return res.redirect('/admin/login');
    }
    // If they are logged in, allow them to proceed to the requested route
    next();
};

// ==========================================
// 3. APPLY MIDDLEWARE FIREWALL
// Protects all remaining /admin routes
// ==========================================
app.use('/admin', requireAdmin);


// ==========================================
// PUBLIC ROUTES
// ==========================================
// Helper function to calculate if an article was published within 24 hours (1 day)
const processReadingEntries = (entries) => {
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    return entries.map(entry => {
        const obj = entry.toObject ? entry.toObject() : entry;
        obj.isNew = (now - new Date(obj.createdAt).getTime()) <= ONE_DAY_MS;
        return obj;
    });
};

app.get('/', async (req, res) => {
    try {
        const rawEntries = await ReadingEntry.find({ isApproved: true }).sort({ isImportant: -1, createdAt: -1 }).limit(3);
        const latestEntries = processReadingEntries(rawEntries);
        const albumPhotos = await AlbumPhoto.find().sort({ uploadedAt: -1 }).limit(3);
        const allVideos = await YoutubeVideo.find().sort({ uploadedAt: -1 });
        const importantMessage = await ImportantMessage.findOne({ isActive: true });
        const committees = await Committee.find().sort({ year: 1 });

        let magazines = await fetchHeyzineMagazines();

        res.render('home', {
            title: 'SIRAJUL IRFAN - Tradition Meets Technological Efficiency',
            latestEntries: latestEntries,
            albumPhotos: albumPhotos,
            youtubeVideos: allVideos,
            importantMessage: importantMessage,
            committees: committees,
            magazines: magazines,
            messageSuccess: req.query.success === 'message_sent',
            messageError: req.query.error === 'message_failed',
            user: req.session.user,
            isLandingPage: true,
            isHomePage: true
        });
    } catch (err) {
        console.error('Error fetching latest entries/photos/videos/magazines:', err);
        res.render('home', { title: 'SIRAJUL IRFAN - Tradition Meets Technological Efficiency', latestEntries: [], albumPhotos: [], youtubeVideos: [], importantMessage: null, committees: [], magazines: [], isLandingPage: true, isHomePage: true });
    }
});

// Event Euphoria Festival Landing Page Route
app.get('/eventeuphoria', async (req, res) => {
    try {
        const houses = await festflowService.fetchTeamPoints();

        res.render('eventeuphoria', {
            title: 'EVENT EUPHORIA \'26 | Annual Fest | SIRAJUL IRFAN',
            houses: houses,
            user: req.session.user,
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error rendering event euphoria page:', err);
        res.render('eventeuphoria', {
            title: 'EVENT EUPHORIA \'26 | Annual Fest | SIRAJUL IRFAN',
            houses: festflowService.FALLBACK_HOUSES,
            user: req.session.user,
            isLandingPage: true
        });
    }
});

// SPA Target Sub-Routes for Event Euphoria
app.get('/team-points', (req, res) => res.redirect('/results'));
app.get('/gallery', (req, res) => res.redirect('/eventeuphoria#gallery'));
app.get('/news', (req, res) => res.redirect('/eventeuphoria#schedule'));

// Official Results Root Page Route
app.get('/results', async (req, res) => {
    try {
        const competitions = await festflowService.fetchCompetitions();
        console.log(`[Results Controller] Rendering 'results' view with ${Array.isArray(competitions) ? competitions.length : 0} published competition(s).`);

        res.render('results', {
            title: 'OFFICIAL RESULTS | Event Euphoria \'26 | SIRAJUL IRFAN',
            competitions: Array.isArray(competitions) ? competitions : [],
            user: req.session.user,
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error rendering results page:', err);
        res.render('results', {
            title: 'OFFICIAL RESULTS | Event Euphoria \'26 | SIRAJUL IRFAN',
            competitions: festflowService.FALLBACK_COMPETITIONS,
            user: req.session.user,
            isLandingPage: true
        });
    }
});
app.get('/eventeuphoria/results', (req, res) => res.redirect('/results'));






app.get('/reading-corner', async (req, res) => {
    try {
        const rawEntries = await ReadingEntry.find({ isApproved: true }).sort({ isImportant: -1, createdAt: -1 });
        const entries = processReadingEntries(rawEntries);
        const committees = await Committee.find().sort({ year: 1 });
        res.render('reading-corner', {
            title: 'Reading Corner - SIRAJUL IRFAN',
            readingEntries: entries,
            committees: committees,
            success: req.query.success === 'submitted',
            isLandingPage: true
        });
    } catch (err) {
        console.error('Error fetching reading corner entries:', err);
        res.render('reading-corner', { title: 'Reading Corner - SIRAJUL IRFAN', readingEntries: [], committees: [] });
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

const ADMISSION_SEO = {
    title: "Sirajul Irfan Da'wa Dars | Admission Started 2026-2027 | Kodampuzha",
    metaDescription: "Official admission page for Sirajul Irfan Da'wa Dars, Kodampuzha. Offering Hifz, Islamic & secular education, computer training, library, and public speaking courses from 6th class onwards.",
    metaKeywords: "Sirajul Irfan, Da'wa Dars, Kodampuzha, Islamic education, Kerala Dars admission, Markazul Uloomisunniyya, Usthad Ameen Shamil Irfany",
    ogTitle: "Sirajul Irfan Da'wa Dars | Admission Started 2026-2027 | Kodampuzha",
    ogDescription: "Official admission page for Sirajul Irfan Da'wa Dars, Kodampuzha. Offering Hifz, Islamic & secular education, computer training, library, and public speaking courses from 6th class onwards.",
    ogImage: "/images/admition-3.jpg",
    ogUrl: "https://sirajulirfan.com/admission",
    canonicalUrl: "https://sirajulirfan.com/admission",
    isLandingPage: true
};

app.get('/admission', (req, res) => {
    res.render('admission', { ...ADMISSION_SEO });
});

app.post('/admission', async (req, res) => {
    try {
        const newAdmission = new Admission({
            fullName: req.body.fullName,
            dob: req.body.dob,
            whatsappNumber: req.body.whatsappNumber,
            email: req.body.email,
            studentClass: req.body.studentClass,
            address: req.body.address,
            previouslyStudied: req.body.previouslyStudied === 'on' || req.body.previouslyStudied === true
        });

        await newAdmission.save();
        res.render('admission', {
            ...ADMISSION_SEO,
            success: 'Application submitted successfully! Our team will contact you soon.'
        });
    } catch (err) {
        console.error('Error saving admission:', err);
        res.status(500).render('admission', {
            ...ADMISSION_SEO,
            error: 'There was an error processing your application. Please try again.'
        });
    }
});

// Admission Status Route
app.post('/admission/status', async (req, res) => {
    try {
        const { whatsappNumber } = req.body;
        const student = await Admission.findOne({ whatsappNumber });

        if (student) {
            res.render('admission', {
                ...ADMISSION_SEO,
                statusResult: {
                    fullName: student.fullName,
                    id: student._id.toString().substring(18, 24)
                }
            });
        } else {
            res.render('admission', {
                ...ADMISSION_SEO,
                statusError: whatsappNumber
            });
        }
    } catch (err) {
        console.error('Error checking status:', err);
        res.status(500).send('Error checking status');
    }
});

// AI Admission Assistant Endpoint using @google/genai with poster details & fallback
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message content is required.' });
        }

        const userMsgLower = message.toLowerCase().trim();
        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBsuEokJrZJh4d2RhUxb8QKPiF2NBrhwmU';

        // 1. Try Gemini API via @google/genai SDK
        let aiReply = null;
        try {
            const ai = new GoogleGenAI({ apiKey });
            const systemPrompt = `You are the official AI Admission Assistant for 'Sirajul Irfan Da'wa Dars' (Off Campus, Kodampuzha Da'wa College / Markazul Uloomisunniyya, Perimbalam Markaz).

OFFICIAL ADMISSION POSTER DETAILS:
- Institution Name: Sirajul Irfan Da'wa Dars (സിറാജുൽ ഇർഫാൻ ദഅ്വ ദർസ്)
- Affiliation & Location: Off Campus of Kodampuzha Da'wa College / Markazul Uloomisunniyya, Perimbalam Markaz, Manjeri, Malappuram, Kerala - 676121.
- Leadership (നേതൃത്വം): ഉസ്താദ് അമീൻ ശാമിൽ ഇർഫാനി ഒഴുക്കൂർ (Ustad Ameen Shamil Irfani Ozhookkur).
- Eligibility (യോഗ്യത): Admissions open for Class 6 onwards (6-ാം ക്ലാസ് മുതൽ അഡ്മിഷൻ ലഭ്യമാണ്).
- Contact Phone Number: +91 8891 223 348.
- Key Features & Highlights (ഫീച്ചറുകൾ):
  1. ആദർശ പഠനം (Ideological & Theological Education)
  2. തജ്വീദ് പഠനം (Tajweed & Quran Recitation)
  3. മത ഭൗതിക സമന്വയ വിദ്യാഭ്യാസം (Integrated Islamic & Modern Secular Education)
  4. കമ്പ്യൂട്ടർ പരിശീലനം (Computer Training)
  5. ഖുത്ബ്ഖാന ലൈബ്രറി (Kuthubkhana / Library)
  6. ഭാഷാ പഠനം (Language Studies)
  7. പ്രാക്ടിക്കൽ ദഅ്വ, പബ്ലിക് സ്പീക്കിങ് & എഴുത്ത് പരിശീലനം (Practical Da'wa, Public Speaking & Writing Training)

CRITICAL INSTRUCTIONS:
- Location Queries: State exact location details (Kodampuzha Da'wa College Off Campus, Perimbalam Markaz, Manjeri, Malappuram - 676121).
- Leadership Queries: Mention leadership under ഉസ്താദ് അമീൻ ശാമിൽ ഇർഫാനി ഒഴുക്കൂർ.
- Eligibility Queries: State admissions open for Class 6 onwards (6-ാം ക്ലാസ് മുതൽ).
- Contact Queries: State contact phone number +91 8891 223 348.
- Admission Flow: Guide user conversationally step-by-step to collect: 1) Full Name (പേര്), 2) Place (സ്ഥലം), 3) Date of Birth/Date (തീയതി), 4) Course. Once all 4 collected, display 📋 Admission Application Summary card with contact +91 8891 223 348 and submit option.
- Language: Respond in Malayalam if user speaks Malayalam (മലയാളം), or English if English.`;

            let contentsText = systemPrompt + '\n\n';
            if (Array.isArray(history) && history.length > 0) {
                history.forEach(item => {
                    if (item.text) {
                        contentsText += `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}\n`;
                    }
                });
            }
            contentsText += `User: ${message}`;

            const modelsToTry = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'];
            for (const model of modelsToTry) {
                try {
                    const result = await ai.models.generateContent({
                        model: model,
                        contents: contentsText
                    });
                    if (result && result.text) {
                        aiReply = result.text;
                        break;
                    }
                } catch (mErr) {
                    // Ignored to fall back
                }
            }
        } catch (sdkErr) {
            // Ignored
        }

        // 2. Intelligent Institutional Poster Fallback Processor
        if (!aiReply) {
            // Check for Location query
            if (userMsgLower.includes('location') || userMsgLower.includes('where') || userMsgLower.includes('located') || 
                userMsgLower.includes('address') || message.includes('എവിടെ') || message.includes('സ്ഥലം') || userMsgLower.includes('kodampuzha')) {
                aiReply = `📍 **Sirajul Irfan Da'wa Dars Location Details / ലൊക്കേഷൻ വിവരങ്ങൾ:**\n\n**Sirajul Irfan Da'wa Dars**\n(Off Campus: Kodampuzha Da'wa College / Markazul Uloomisunniyya)\nLocation: **Perimbalam Markaz, Manjeri, Malappuram District, Kerala - 676121.**\n📞 **Contact:** +91 8891 223 348`;
            }
            // Check for Leadership query
            else if (userMsgLower.includes('leader') || userMsgLower.includes('usthad') || userMsgLower.includes('head') || message.includes('ഉസ്താദ്') || message.includes('അമീൻ')) {
                aiReply = `✨ **Leadership / നേതൃത്വം:**\n\nSirajul Irfan Da'wa Dars is led under the esteemed guidance of:\n**ഉസ്താദ് അമീൻ ശാമിൽ ഇർഫാനി ഒഴുക്കൂർ** (Ustad Ameen Shamil Irfani Ozhookkur).\n📞 **Contact:** +91 8891 223 348`;
            }
            // Check for Eligibility / Requirements query
            else if (userMsgLower.includes('eligib') || userMsgLower.includes('age') || userMsgLower.includes('class') || message.includes('യോഗ്യത') || message.includes('ക്ലാസ്')) {
                aiReply = `🎓 **Eligibility & Admission Criteria / അഡ്മിഷൻ യോഗ്യത:**\n\n• **6-ാം ക്ലാസ് മുതൽ അഡ്മിഷൻ ലഭ്യമാണ്** (Admissions open for students from Class 6 onwards).\n• Integrated Religious & Modern Education (മത ഭൗതിക സമന്വയ വിദ്യാഭ്യാസം).\n📞 **Helpdesk Contact:** +91 8891 223 348`;
            }
            // Check for Highlights / Features / Courses query
            else if (userMsgLower.includes('feature') || userMsgLower.includes('highlight') || userMsgLower.includes('course') || message.includes('ഫീച്ചറുകൾ') || message.includes('പഠനം')) {
                aiReply = `🌟 **Key Features & Highlights of Sirajul Irfan Da'wa Dars (ഫീച്ചറുകൾ):**\n\n1. 📖 **ആദർശ പഠനം** (Ideological Education)\n2. 🎙️ **തജ്വീദ് പഠനം** (Tajweed & Recitation)\n3. 🎓 **മത ഭൗതിക സമന്വയ വിദ്യാഭ്യാസം** (Integrated Education)\n4. 💻 **കമ്പ്യൂട്ടർ പരിശീലനം** (Computer Training)\n5. 📚 **ഖുത്ബ്ഖാന ലൈബ്രറി** (Library Facilities)\n6. 🌐 **ഭാഷാ പഠനം** (Language Studies)\n7. ✍️ **പ്രാക്ടിക്കൽ ദഅ്വ, പബ്ലിക് സ്പീക്കിങ് & എഴുത്ത് പരിശീലനം** (Practical Da'wa, Public Speaking & Writing)\n\nAdmissions open from Class 6 onwards! 📞 **Contact:** +91 8891 223 348`;
            }
            // Check for Contact / Phone query
            else if (userMsgLower.includes('contact') || userMsgLower.includes('phone') || userMsgLower.includes('number') || message.includes('ഫോൺ') || message.includes('ബന്ധപ്പെടുക')) {
                aiReply = `📞 **Official Admission Contact Number / ബന്ധപ്പെടുക:**\n\n**Sirajul Irfan Da'wa Dars**\nPhone / WhatsApp: **+91 8891 223 348**\nCampus: Perimbalam Markaz, Manjeri, Malappuram.`;
            }
            // Check for Admission / Apply intent or step answers
            else if (userMsgLower.includes('admission') || userMsgLower.includes('apply') || userMsgLower.includes('register') || 
                     userMsgLower.includes('join') || message.includes('അഡ്മിഷൻ') || message.includes('അപേക്ഷ')) {
                aiReply = `Assalamu Alaikum! Welcome to Sirajul Irfan Da'wa Dars Admission Cell. 📝\n\nAdmissions are open for students from **Class 6 onwards (6-ാം ക്ലാസ് മുതൽ)**.\n\nI will guide you step-by-step to record your application details.\n\nFirst, please provide your **Full Name (പേര്)**.`;
            }
            // Stateful Step-by-Step Flow handling based on history length
            else if (Array.isArray(history) && history.length >= 2) {
                const fullHistoryText = history.map(h => h.text).join(' ') + ' ' + message;
                const lowerHist = fullHistoryText.toLowerCase();

                // Step 1: User likely answered Name, ask for Place
                if (!lowerHist.includes('place') && !lowerHist.includes('സ്ഥലം') && history.length <= 4) {
                    aiReply = `Thank you! Next, please share your **Place / Location (സ്ഥലം)**.`;
                }
                // Step 2: User likely answered Place, ask for DOB/Date
                else if (!lowerHist.includes('dob') && !lowerHist.includes('birth') && !lowerHist.includes('തീയതി') && history.length <= 6) {
                    aiReply = `Got it! Please provide your **Date of Birth or Date (തീയതി)**.`;
                }
                // Step 3: User likely answered DOB, ask for Course
                else if (!lowerHist.includes('class') && !lowerHist.includes('hifz') && !lowerHist.includes('dars') && history.length <= 8) {
                    aiReply = `Great! Which **Course / Class** would you like to apply for? (Options: Class 6+, Da'wa Dars, Hifz, Schooling, Plus One/Two, Degree).`;
                }
                // Step 4: Summary output
                else {
                    const userInputs = history.filter(h => h.role === 'user').map(h => h.text);
                    const name = userInputs[1] || userInputs[0] || 'Applicant Name';
                    const place = userInputs[2] || 'Provided Location';
                    const dob = userInputs[3] || 'Provided Date';
                    const course = userInputs[4] || message || 'Selected Course';

                    aiReply = `📋 **Admission Application Summary / അഡ്മിഷൻ അപേക്ഷാ സംഗ്രഹം**\n- **Full Name / പേര്:** ${name}\n- **Place / സ്ഥലം:** ${place}\n- **Date of Birth / തീയതി:** ${dob}\n- **Selected Course / കോഴ്‌സ്:** ${course}\n- **Institution:** Sirajul Irfan Da'wa Dars (Kodampuzha Off Campus)\n\nYour application details have been recorded! You can click **Submit Application** below or contact our desk directly at **+91 8891 223 348**.`;
                }
            }
            // General Fallback
            else {
                aiReply = `Welcome to Sirajul Irfan Da'wa Dars AI Assistant! 🌟\n\nI can help you with:\n1. 🌟 **Features & Highlights (ഫീച്ചറുകൾ)**\n2. 🎓 **Eligibility (6-ാം ക്ലാസ് മുതൽ)**\n3. 📝 **Guided Admission Application**\n4. 📞 **Contact (+91 8891 223 348)**\n\nHow may I assist you today?`;
            }
        }

        return res.json({ reply: aiReply });
    } catch (err) {
        console.error('Error in /api/chat:', err?.response?.data || err.message);
        return res.json({ reply: "Sirajul Irfan Da'wa Dars (Off Campus Kodampuzha Da'wa College / Perimbalam Markaz). Admissions open from Class 6 onwards. Contact: +91 8891 223 348." });
    }
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

app.get('/student', (req, res) => {
    res.render('studentDashboard', { title: 'Student Portal - SIRAJUL IRFAN' });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Sitemap Route
app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = 'https://sirajulirfan.com';
        
        // Fetch dynamic items
        const photos = await AlbumPhoto.find().sort({ uploadedAt: -1 });

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <!-- Static Routes -->
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/reading-corner</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/admission</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/album</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/videos</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/eventeuphoria</loc>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/results</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
`;

        // Add gallery items dynamically using image sitemap extension
        photos.forEach(photo => {
            const imgUrl = photo.imageUrl.startsWith('http') ? photo.imageUrl : `${baseUrl}${photo.imageUrl}`;
            xml += `    <url>
        <loc>${baseUrl}/album</loc>
        <image:image>
            <image:loc>${imgUrl}</image:loc>${photo.description ? `\n            <image:caption>${photo.description}</image:caption>` : ''}
        </image:image>
    </url>\n`;
        });

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Error generating sitemap:', err);
        res.status(500).send('Error generating sitemap');
    }
});

// Robots.txt Route
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Allow: /eventeuphoria
Allow: /results

Sitemap: https://sirajulirfan.com/sitemap.xml`);
});



// ==========================================
// SECURE ADMIN ROUTES (Protected by requireAdmin firewall)
// ==========================================
app.get('/admin', async (req, res) => {
    try {
        console.log('Fetching dashboard data...');
        const admissions = await Admission.find().sort({ submittedAt: -1 });
        const totalReadingEntries = await ReadingEntry.countDocuments();
        const pendingReadingCount = await ReadingEntry.countDocuments({ isApproved: false });
        const totalMessages = await Message.countDocuments();
        const totalUsers = await User.countDocuments();
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
        const liveMagazines = await fetchHeyzineMagazines();
        const totalMagazines = liveMagazines.length;

        res.render('adminDashboard', {
            title: 'Admin Dashboard - SISA Portal',
            admissions: admissions,
            totalEnrollment: admissions.length,
            totalReadingEntries,
            total_Writes: totalReadingEntries,
            pendingReadingCount,
            totalMessages,
            totalUsers,
            recentUsers,
            totalMagazines,
            activePage: 'dashboard',
            adminName: (req.session && req.session.user && req.session.user.fullName) ? req.session.user.fullName : 'Admin'
        });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.render('adminDashboard', { title: 'Admin Dashboard - SIRAJUL IRFAN', admissions: [] });
    }
});

// Toggle Admission Status
app.post('/admin/settings/admission/toggle', async (req, res) => {
    try {
        let setting = await AdmissionSetting.findOne();
        if (!setting) {
            setting = new AdmissionSetting({ isOpen: false });
        }
        setting.isOpen = req.body.isOpen === 'on' || req.body.isOpen === 'true';
        setting.updatedAt = new Date();
        await setting.save();
        res.redirect('/admin?success=settings_updated');
    } catch (err) {
        console.error('Error updating admission setting:', err);
        res.redirect('/admin?error=settings_update_failed');
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

app.post('/admin/delete/:id', async (req, res) => {
    try {
        await Admission.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error deleting admission:', err);
        res.status(500).send('Error deleting record');
    }
});

// Admin Reading Corner Routes
app.get('/admin/reading-corner', async (req, res) => {
    try {
        const rawApproved = await ReadingEntry.find({ isApproved: true }).sort({ isImportant: -1, createdAt: -1 });
        const rawPending = await ReadingEntry.find({ isApproved: false }).sort({ createdAt: -1 });

        const approvedEntries = processReadingEntries(rawApproved);
        const pendingEntries = processReadingEntries(rawPending);

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
            isImportant: req.body.isImportant === 'on' || req.body.isImportant === 'true',
            isApproved: true // Admin added entries are auto-approved
        });
        await newEntry.save();
        res.redirect('/admin/reading-corner');
    } catch (err) {
        console.error('Error saving reading entry:', err);
        res.status(500).send('Error saving entry');
    }
});

app.post('/admin/reading-corner/toggle-important/:id', async (req, res) => {
    try {
        const entry = await ReadingEntry.findById(req.params.id);
        if (entry) {
            entry.isImportant = !entry.isImportant;
            await entry.save();
        }
        res.redirect('/admin/reading-corner');
    } catch (err) {
        console.error('Error toggling important status:', err);
        res.status(500).send('Error updating entry');
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

// Admin Album Routes
app.get('/admin/album', async (req, res) => {
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

app.post('/admin/album/upload', async (req, res) => {
    try {
        const { albumName, imageUrl, description } = req.body;

        if (!imageUrl) {
            console.error('### UPLOAD ERROR: No Image URL ###');
            return res.redirect('/admin/album?error=no_image_url');
        }

        const newPhoto = new AlbumPhoto({
            imageUrl: imageUrl,
            description: albumName || description || ''
        });

        await newPhoto.save();
        res.redirect('/admin/album?success=photo_uploaded');
    } catch (dbErr) {
        console.error('### DATABASE ERROR ###', dbErr);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/album/delete/:id', async (req, res) => {
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
app.get('/admin/important-message', async (req, res) => {
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

app.post('/admin/important-message/upload', (req, res) => {
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

app.post('/admin/important-message/activate/:id', async (req, res) => {
    try {
        await ImportantMessage.updateMany({}, { isActive: false });
        await ImportantMessage.findByIdAndUpdate(req.params.id, { isActive: true });
        res.redirect('/admin/important-message?success=message_activated');
    } catch (err) {
        console.error('Error activating message:', err);
        res.redirect('/admin/important-message?error=activate_failed');
    }
});

app.post('/admin/important-message/delete/:id', async (req, res) => {
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
app.get('/admin/videos', async (req, res) => {
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

app.post('/admin/videos/add', async (req, res) => {
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

app.post('/admin/videos/delete/:id', async (req, res) => {
    try {
        await YoutubeVideo.findByIdAndDelete(req.params.id);
        res.redirect('/admin/videos?success=video_deleted');
    } catch (err) {
        console.error('Error deleting video:', err);
        res.redirect('/admin/videos?error=delete_failed');
    }
});

// Admin Committee Routes
app.get('/admin/committee', async (req, res) => {
    try {
        const committees = await Committee.find().sort({ year: 1 });
        res.render('adminCommittee', {
            title: 'Manage Committee - Admin',
            activePage: 'committee',
            committees: committees,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error('Error fetching admin committee:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/admin/committee/add', upload.fields([
    { name: 'presidentImage', maxCount: 1 },
    { name: 'gsImage', maxCount: 1 },
    { name: 'fsImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const files = req.files;
        if (!files.presidentImage || !files.gsImage || !files.fsImage) {
            return res.redirect('/admin/committee?error=missing_images');
        }

        const newCommittee = new Committee({
            year: req.body.year,
            presidentName: req.body.presidentName,
            presidentLocation: req.body.presidentLocation,
            presidentImage: files.presidentImage[0].path,
            gsName: req.body.gsName,
            gsLocation: req.body.gsLocation,
            gsImage: files.gsImage[0].path,
            fsName: req.body.fsName,
            fsLocation: req.body.fsLocation,
            fsImage: files.fsImage[0].path
        });

        await newCommittee.save();
        res.redirect('/admin/committee?success=committee_added');
    } catch (dbErr) {
        console.error('Database Error:', dbErr);
        res.redirect('/admin/committee?error=add_failed');
    }
});

app.post('/admin/committee/delete/:id', async (req, res) => {
    try {
        const committee = await Committee.findById(req.params.id);
        if (!committee) return res.redirect('/admin/committee?error=not_found');

        const images = [committee.presidentImage, committee.gsImage, committee.fsImage];
        for (const imageUrl of images) {
            if (imageUrl && imageUrl.includes('cloudinary.com')) {
                const urlParts = imageUrl.split('/');
                const filename = urlParts[urlParts.length - 1];
                const publicId = 'sisa_album/' + filename.split('.')[0];
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (cErr) {
                    console.error('Cloudinary deletion error:', cErr);
                }
            }
        }

        await Committee.findByIdAndDelete(req.params.id);
        res.redirect('/admin/committee?success=committee_deleted');
    } catch (err) {
        console.error('Error deleting committee:', err);
        res.redirect('/admin/committee?error=delete_failed');
    }
});

app.post('/admin/committee/activate/:id', async (req, res) => {
    try {
        await Committee.updateMany({}, { isActive: false });
        await Committee.findByIdAndUpdate(req.params.id, { isActive: true });
        res.redirect('/admin/committee?success=committee_activated');
    } catch (err) {
        console.error('Error activating committee:', err);
        res.redirect('/admin/committee?error=activate_failed');
    }
});


// Helper to extract clean URL if admin pastes raw <iframe> embed tag
const cleanEmbedUrl = (rawInput) => {
    if (!rawInput) return '';
    let cleaned = rawInput.trim();
    if (cleaned.includes('<iframe')) {
        const match = cleaned.match(/src=["']([^"']+)["']/i);
        if (match && match[1]) {
            return match[1];
        }
    }
    return cleaned;
};

// Admin Digital Magazine Routes (Heyzine API Live Sync)
app.get('/admin/magazines', async (req, res) => {
    try {
        const magazines = await fetchHeyzineMagazines();
        res.render('adminMagazines', {
            title: 'Digital Magazines Sync - Admin',
            activePage: 'magazines',
            magazines: magazines,
            isHeyzineConnected: true
        });
    } catch (err) {
        console.error('### ERROR FETCHING ADMIN MAGAZINES ###:', err);
        res.status(500).send('Server Error loading Digital Magazines page');
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