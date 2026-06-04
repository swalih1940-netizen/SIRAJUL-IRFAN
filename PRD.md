# Product Requirements Document (PRD)
## Dars Management & Annual Fest Portal

### 1. Project Overview
The objective of this project is to develop a comprehensive web platform for a traditional Dars (Islamic Education System). The website will serve as a centralized hub for managing academic activities, organizing the annual student fest, and facilitating online donations from well-wishers.

### 2. Objectives
* **Digitize Management:** Transition from manual record-keeping to a digital system for student and staff data.
* **Fest Coordination:** Provide a real-time, transparent system to manage the annual fest, track house/group points, and display results to the public.
* **Streamline Donations:** Enable a secure and easy-to-use donation portal for the public to contribute financially to the institution.

### 3. Target Audience
* **Admins/Committee Members:** For complete control over data, fest events, and finances.
* **Teachers (Ustads):** To manage student academics and fest scores.
* **Students:** To view their profiles, fest points, and academic updates.
* **Public & Donors:** To learn about the institution, view fest updates, and make contributions.

---

### 4. Key Features & Requirements

#### 4.1. Public Interface (Front-end)
* **Home Page:** Introduction to the Dars, recent news, announcements, and vision/mission.
* **About Us:** History of the institution, profiles of key Ustads, and committee members.
* **Annual Fest Portal:**
  * Live point table (House-wise/Group-wise).
  * Program schedules and event categories.
  * Media gallery (Photos/Videos of past and current fests).
* **Donation Page:**
  * Secure payment gateway integration (e.g., Razorpay, Stripe).
  * Options for one-time or recurring donations.
  * Automated digital receipt generation sent via email.

#### 4.2. Admin Dashboard (Backend Control)
* **Student Management:**
  * Add/Edit/Delete student records.
  * Track attendance and exam results.
* **Fest Management System:**
  * Create groups/houses and assign students.
  * Add events and assign judges/coordinators.
  * Input and update live points for different events.
* **Donation & Financial Tracking:**
  * View total funds collected.
  * Filter donations by date, amount, or donor name.
  * Generate financial reports.

#### 4.3. Student Portal
* **Secure Login:** Unique ID and password for each student.
* **Dashboard:** View personal details, attendance, and exam marks.
* **Fest Section:** View individual scores, upcoming events they are participating in, and group standings.

---

### 5. Technology Stack (Proposed)
* **Backend Framework:** Node.js with Express.js (Fast, scalable, and excellent for real-time updates).
* **Database:** MongoDB (NoSQL structure is highly efficient for managing varied student and fest data).
* **Frontend/View Engine:** Handlebars (HBS) for dynamic server-side rendering, combined with HTML, CSS (Bootstrap/Tailwind), and vanilla JavaScript.
* **Payment Gateway:** Razorpay or PayU (Optimized for Indian transactions).
* **Hosting:** AWS, DigitalOcean, or Vercel/Render for deploying the Node.js application.

### 6. Security Requirements
* Role-Based Access Control (RBAC) to ensure students cannot access admin settings.
* Data encryption for sensitive student data and donor details.
* SSL Certificate (HTTPS) for secure browsing and safe payment processing.

### 7. Future Scope
* Integration of an Alumni Network portal.
* E-learning module for online classes and study material distribution.
* Mobile Application linked to the same database.