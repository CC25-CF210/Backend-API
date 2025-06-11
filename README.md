<h1 align="center"><b>Kalkulori</b>: Aplikasi Penghitung Kalori</h1>
<div align="center">
  <img src="./public/Kalkulori-LOGO-Text.png" width="300" alt="Logo Kalkulori" />
  <h4>Backend API untuk aplikasi rekomendasi makanan dengan manajemen profil pengguna, tracking kalori, dan sistem rekomendasi berbasis machine learning.</h4>
</div>

---

## ℹ️ Info Umum

📌 **Backend Kalkulori** adalah service RESTful yang menyediakan infrastruktur backend untuk aplikasi tracking kalori dan rekomendasi makanan. API ini dibangun menggunakan **Hapi.js** framework dengan integrasi **Firebase** untuk autentikasi dan penyimpanan data, serta dilengkapi dengan fitur *machine learning* untuk rekomendasi makanan yang personal.

🔍 Sistem backend ini berfungsi sebagai **penghubung antara client dan machine learning models**, yang memproses data pengguna dan memberikan rekomendasi makanan berdasarkan preferensi dan target kalori. Backend ini dirancang untuk:
* 🎯 Menyediakan API yang scalable dan secure untuk aplikasi mobile/web.
* 💡 Mengelola data pengguna, profil, dan riwayat konsumsi makanan.
* ❄️ Mengintegrasikan model *machine learning* untuk rekomendasi yang personal.
* 📝 Menyediakan sistem autentikasi dan otorisasi yang *robust*.

### ⚠️ Tantangan yang Dihadapi

Dalam pengembangan backend untuk sistem rekomendasi makanan, beberapa tantangan utama yang dihadapi meliputi:
* **🔄 Integrasi ML Models**: Mengintegrasikan model machine learning dengan API backend untuk memberikan rekomendasi real-time yang cepat dan akurat.
* **⚙️ Data Management**: Mengelola dan menyinkronkan data makanan yang besar (50.000+ items) dengan performa query yang optimal.
* **📊 User Data Privacy**: Memastikan keamanan data personal pengguna seperti profil kesehatan, riwayat konsumsi, dan preferensi diet.
* **🚀 Scalability**: Merancang arsitektur yang dapat menangani pertumbuhan jumlah pengguna dan request concurrent.

---

## ✨ Fitur

Backend Kalkulori menyediakan fitur-fitur utama berikut melalui *endpoint* RESTful API-nya:

### 🔐 Authentication & User Management
* **👤 Register & Login**: Sistem autentikasi menggunakan Firebase Authentication dengan JWT token management untuk keamanan maksimal.
* **🔒 Secure Endpoints**: Middleware autentikasi untuk melindungi endpoint yang memerlukan login pengguna.
* **📋 Profil Management**: CRUD operations untuk data profil pengguna termasuk informasi kesehatan, target diet, dan preferensi makanan.
  
### 🍽️ Food Database & Search
* **📊 Database Makanan**: Akses ke 50.000+ data makanan dengan informasi nutrisi yang komprehensif melalui RESTful API.
* **🔍 Smart Search**: Algoritma pencarian dengan fuzzy matching untuk membantu pengguna menemukan makanan dengan mudah.
* **➕ Food Management**: Endpoint untuk menambah, update, dan mengelola data makanan dalam database.

### 📈 Meal Tracking & Logging
* **📝 Daily Logging**: API untuk mencatat konsumsi makanan harian dengan tracking kalori dan nutrisi real-time.
* **📊 Nutritional Analysis**: Endpoint untuk menganalisis intake nutrisi harian dan memberikan ringkasan kesehatan.
* **📅 Historical Data**: Penyimpanan dan akses data historis untuk analisis trend konsumsi jangka panjang.

### 🤖 ML-Powered Recommendations
* **🎯 Meal Suggestions**: Integration dengan machine learning models untuk memberikan rekomendasi makanan berdasarkan profil dan target pengguna.
* **📅 Meal Plan Generation**: API untuk menghasilkan rencana makan lengkap dengan distribusi kalori dan nutrisi yang optimal.
* **⚖️ Calorie Management**: Sistem untuk menghitung dan menyesuaikan target kalori berdasarkan BMR dan TDEE pengguna.

---

## 🛠️ Pengembangan

### 🔐 Autentikasi & Otorisasi
Sistem autentikasi Kalkulori dibangun menggunakan Firebase Authentication yang terintegrasi dengan JWT token management untuk keamanan maksimal. Pengguna dapat melakukan registrasi akun baru dengan email dan password melalui endpoint `/api/auth/register`, yang secara otomatis membuat profil pengguna di database. Proses login dilakukan melalui `/api/auth/login` yang mengembalikan access token dan refresh token untuk sesi yang aman.

Setiap request ke endpoint yang memerlukan autentikasi akan diverifikasi melalui middleware authMiddleware yang memvalidasi JWT token. Token verification endpoint `/api/auth/verify-token` memungkinkan aplikasi client untuk memvalidasi status login pengguna secara real-time. Sistem juga menyediakan logout functionality yang tidak hanya menghapus token dari client, tetapi juga melakukan revocation di server untuk mencegah penggunaan token yang sudah expired.

### 👤 Manajemen Profil Pengguna
Fitur manajemen profil pengguna memberikan kontrol penuh kepada user untuk mengatur informasi personal mereka. Endpoint `/api/users/profile` dengan method GET memungkinkan pengambilan data profil lengkap termasuk informasi dasar. Update profil dilakukan melalui PUT request ke endpoint yang sama, dengan validasi data untuk memastikan informasi yang disimpan akurat dan konsisten.

Profil pengguna menyimpan data kritis seperti usia, jenis kelamin, tinggi badan, berat badan, tingkat aktivitas, dan target berat badan yang akan berpengaruh ke tujuan diet (menurunkan berat badan, mempertahankan, atau menambah). Data ini digunakan untuk kalkulasi BMR (Basal Metabolic Rate) dan TDEE (Total Daily Energy Expenditure) yang menjadi dasar rekomendasi kalori harian. Sistem juga tracking perubahan profil untuk analisis progress pengguna dari waktu ke waktu.

### 🍽️ Database Makanan
Database makanan Kalkulori menyediakan akses ke 50.000+ data makanan dengan informasi nutrisi yang komprehensif. Endpoint `/api/foods` memberikan akses ke seluruh database makanan, sementara `/api/foods/{foodId}` memungkinkan pengambilan detail spesifik suatu makanan. Admin atau pengguna dengan privilege tertentu dapat menambahkan makanan baru melalui POST request ke `/api/foods` dengan validasi data nutrisi yang ketat.

Fitur pencarian makanan `/api/search` menggunakan algoritma fuzzy matching untuk membantu pengguna menemukan makanan dengan mudah, bahkan dengan typo atau variasi nama. Sistem juga mendukung penambahan makanan dari hasil pencarian eksternal melalui `/api/search/add`, yang mengintegrasikan data dari sumber eksternal ke database lokal. Update dan delete operations tersedia untuk maintenance data makanan, dengan logging untuk audit trail.

### 📊 Meal Tracking & Logging
Sistem meal tracking memungkinkan pengguna mencatat konsumsi makanan harian melalui endpoint `/api/meals`. Setiap meal entry mencakup informasi makanan yang dikonsumsi, jumlah porsi, waktu konsumsi, dan kategori meal (breakfast, lunch, dinner, snack). Data ini diproses secara real-time untuk menghitung total intake nutrisi harian.

Endpoint `/api/logs/{log_date}` menyediakan ringkasan nutrisi harian yang komprehensif, termasuk total kalori, breakdown makronutrient, persentase target harian yang tercapai, dan analisis kualitas diet. Sistem juga menyimpan historical data untuk trend analysis dan progress tracking jangka panjang. Update dan delete functionality tersedia untuk koreksi data entry yang salah.

### 🤖 Smart Meal Recommendations
Fitur rekomendasi cerdas menggunakan machine learning algorithm untuk memberikan saran makanan yang personal dan relevan. Endpoint `/api/meals/`suggestion menganalisis riwayat konsumsi, preferensi diet, target nutrisi, dan defisiensi nutrisi untuk menghasilkan rekomendasi makanan yang optimal. Algoritma mempertimbangkan variasi, keseimbangan nutrisi, dan preferensi personal pengguna.

Meal plan generation `/api/meal-plans/generate` menciptakan rencana makan lengkap untuk periode tertentu (harian, mingguan, atau bulanan) berdasarkan profil pengguna. Sistem mempertimbangkan target kalori, distribusi makronutrient, variasi makanan, dan constraint diet khusus. Generated meal plan dapat langsung ditambahkan ke meal entries melalui `/api/meal-plans/add-full-plan` atau ditambahkan per-meal melalui `/api/meal-plans/add-meal`.

---

## 💻 Teknologi
Proyek ini dikembangkan menggunakan teknologi-teknologi berikut:
- **Framework**: Hapi.js v21.4.0
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK v13.4.0
- **Security**: JSON Web Token (JWT)
- **HTTP Client**: Axios v1.9.0
- **Data Processing**: Papa Parse v5.5.3
- **Development**: Nodemon v3.1.10
- **Runtime**: Node.js >=16.0.0

---

## 📚 API Endpoints

### Autentikasi
```http
POST   /api/auth/register        # Registrasi pengguna baru
POST   /api/auth/login           # Login pengguna
POST   /api/auth/verify-token    # Verifikasi token
POST   /api/auth/logout          # Logout pengguna
```

### Profil Pengguna
```http
GET    /api/users/profile        # Ambil profil pengguna
PUT    /api/users/profile        # Update profil pengguna
```

### Manajemen Makanan
```http
GET    /api/foods                # Daftar makanan dengan limitation dan pagination
GET    /api/foods/{id}           # Detail makanan berdasarkan ID
POST   /api/foods                # Tambah makanan baru (admin)
GET    /api/search               # Pencarian makanan
POST   /api/search/add           # Tambah makanan ke daily log dari hasil pencarian
```

### Tracking Makanan
```http
GET    /api/meals                # Daftar makanan pengguna
POST   /api/meals                # Tambah makanan ke daily log dari add-page
DELETE /api/meals/{id}           # Hapus meal entry
```

### Rekomendasi & Meal Plan
```http
GET    /api/meals/suggestion           # Saran makanan berdasarkan tipe makanan user
POST   /api/meals/suggestion/add       # Tambah makanan ke daily log dari saran
GET    /api/meal-plans/generate        # Generate meal plan
POST   /api/meal-plans/add-meal        # Tambah makanan dari meal plan
POST   /api/meal-plans/add-full-plan   # Tambah full meal plan
GET    /api/meals/{recipeId}/details   # Detail makanan
```

### Daily Logs
```http
GET    /api/logs/                # Log user
GET    /api/logs/{date}          # Log harian berdasarkan tanggal
```

### Makanan Kustom Pengguna [SOON]
```http
GET    /api/users/foods          # Daftar makanan kustom pengguna [SOON]
POST   /api/users/foods          # Tambah makanan kustom baru [SOON]
```

---

## ⚡ Setup
Untuk menjalankan proyek ini secara lokal, ikuti ketentuan dan langkah-langkah berikut:

### Prerequisites
- Node.js (>= 16.0.0)
- Firebase Project dengan Authentication dan Firestore enabled
- Environment variables configured

### Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/FEBE-Capstone-Kalkulori/Backend-API.git
   cd Backend-API
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```
   
3. **Setup Firebase Project**
   ```http
   https://console.firebase.google.com/
   ```
   
   - Ikuti langkah-langkah yang diminta Firebase ketika membuat New Project.
   - Aktifkan *Authentication* dan *Firestore Database* di Project Firebase.
   - Project Overview -> Web App -> Register App.


   ```bash
   npm install firebase
   ```
   
   - Continue to console.
   - Project Settings -> Service accounts -> Pilih Node.js sebagai Admin SDK -> Generate new private key.
   
4. **Environment Setup**

   Isi file `serviceAccount.json` di `./src/config/private/` directory dengan file service account yang baru saja di generate/download seperti dibawah ini:
   ```json
   {
      "type": "service_account",
      "project_id": "your-firebase-project-id",
      "private_key_id": "abcd1234efgh5678ijkl9012mnop3456qrst7890",
      "private_key": "-----BEGIN PRIVATE KEY-----\n\n-----END PRIVATE KEY-----\n",
      "client_email": "firebase-adminsdk-xyz@your-project.iam.gserviceaccount.com",
      "client_id": "123456789012345678901",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xyz%40your-project.iam.gserviceaccount.com",
      "universe_domain": "googleapis.com"
   }
   ```
   
   Buat file `.env` di root directory:
   ```env
   PORT=9000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key
   ```

5. **Import Food Data (Optional)**
   ```bash
   npm run import-foods
   ```

6. **Start Development Server**
   ```bash
   npm run dev
   ```

7. **Start Production Server**
   ```bash
   npm start
   ```

### 🔧 Development Scripts

```bash
# Development dengan auto-reload
npm run dev

# Production mode
npm start

# Import CSV data
npm run import-csv

# Import foods data
npm run import-foods
```

---

## 📖 API Documentation

Setelah server berjalan, kunjungi:
- **API Documentation**: `http://localhost:9000/api`

### Authentication Headers

Untuk endpoint yang memerlukan autentikasi, sertakan header:
```http
Authorization: Bearer <user-token>
```

### Response Format

API menggunakan format response yang konsisten:

**Success Response:**
```json
{
  "status": "success",
  "message": "Success description",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "status": "fail|error",
  "message": "Error description"
}
```

---

## 🔒 Security Features

- **Firebase Authentication** - Secure user authentication
- **JWT Token Validation** - Protected endpoints
- **CORS Configuration** - Cross-origin request handling
- **Input Validation** - Request payload validation
- **Error Handling** - Comprehensive error responses

---

## 🚀 Deployment

### Environment Variables untuk Production
```env
NODE_ENV=production
PORT=9000
# ... other config
```

### Server akan bind ke:
- **Development**: `localhost:9000`
- **Production**: `0.0.0.0:9000`

---
