<h1 align="center"><b>Kalkulori</b>: Sistem Rekomendasi Makanan</h1>
<div align="center">
  <img src="./public/Kalkulori-LOGO-Text.png" width="300" alt="Logo Kalkulori" />
  <h4>Aplikasi web rekomendasi makanan menggunakan pendekatan berbasis konten dengan Scikit-Learn, FastAPI, dan TensorFlow.</h4>
</div>

---

## ℹ️ Info Umum

📌 **Kalkulori** adalah sistem rekomendasi makanan cerdas yang dirancang untuk membantu pengguna mencapai tujuan diet mereka dengan menyediakan rencana makan dan saran makanan yang dipersonalisasi. Di dunia yang makin peduli kesehatan saat ini, menjaga pola makan seimbang sangat penting. Proyek ini memanfaatkan *machine learning* untuk menawarkan rekomendasi yang tepat, mengatasi keterbatasan sistem rekomendasi diet yang canggih.

🔍 Sistem ini menggunakan **pendekatan berbasis konten**, yang berarti sistem menganalisis kandungan nutrisi, bahan, dan kata kunci resep untuk membuat rekomendasi. Pendekatan ini sangat efektif karena:
* 🎯 Tidak memerlukan data dari pengguna lain untuk memulai.
* 💡 Memberikan rekomendasi yang sangat relevan dengan pengguna individu.
* ❄️ Membantu menghindari masalah (*cold start*) yang sering ditemukan dalam sistem penyaringan kolaboratif.
* 📝 Menawarkan transparansi dalam rekomendasinya.

### ⚠️ Tantangan yang Dihadapi

Meskipun penyaringan berbasis konten memiliki banyak keuntungan, sistem ini juga datang dengan tantangan, seperti:
* **🔄 Kurangnya kebaruan dan keragaman**: Sistem mungkin merekomendasikan item yang sangat mirip dengan yang sudah disukai pengguna, berpotensi membatasi paparan makanan baru.
* **⚙️ Skalabilitas**: Menangani sejumlah besar item dan fitur mereka bisa menjadi intensif secara komputasi.
* **📊 Kualitas atribut**: Rekomendasi sangat bergantung pada keakuratan dan konsistensi atribut makanan (kata kunci, info gizi).

---

## ✨ Fitur

Kalkulori menawarkan fitur-fitur utama berikut melalui *endpoint* API-nya:

### 🍽️ Suggestion Meal
* **🔍 Saran Berbasis Kata Kunci**: Merekomendasikan resep berdasarkan **kata kunci** yang diberikan pengguna (misalnya, 'tinggi protein', 'asia', 'vegetarian') dan **jumlah kalori target**.
* **📊 Pengelompokan Kalori (*Calorie Binning*)**: Memanfaatkan model TensorFlow yang telah dilatih sebelumnya untuk memprediksi kelompok kalori yang paling mungkin untuk resep, membantu dalam menemukan resep yang mendekati target kalori.
* **🎚 Peringkat & Randomisasi Cerdas**: Memberi peringkat saran berdasarkan skor kecocokan kata kunci dan probabilitas kalori yang diprediksi, kemudian mengambil sampel secara acak dari kumpulan kandidat teratas untuk memastikan keragaman.

### 📅 Meal Plan
* **🎯 Meal Plan yang Dipersonalisasi**: Menghasilkan rencana makan sehari penuh (Sarapan, Makan Siang, Makan Malam, ditambah makanan tambahan opsional) berdasarkan **target total kalori** yang ditentukan.
* **⚖️ Toleransi Kalori**: Memungkinkan persentase toleransi yang dapat dikonfigurasi di sekitar target kalori untuk menemukan kombinasi makanan yang sesuai.
* **🏆 Pemilihan Berbasis Prioritas**: Resep diprioritaskan berdasarkan jenis makanan (Sarapan, Makan Siang, Makan Malam) dan kata kunci spesifik/umum untuk memastikan pilihan yang relevan.
* **📋Output Resep Terperinci**: Setiap makanan dalam rencana menyertakan detail resep yang komprehensif seperti bahan, waktu memasak, dan rincian nutrisi lengkap.

### 🔎 Search Meal
* **🔤 Pencarian Nama Resep**: Memungkinkan pengguna mencari resep berdasarkan **nama** sebagian atau penuh.
* **📝 Detail Resep Komprehensif**: Menyediakan detail lengkap untuk setiap resep melalui ID-nya, termasuk bahan, waktu memasak, dan semua informasi nutrisi.

---

## 📋 Deskripsi

Kalkulori Backend API adalah service RESTful yang menyediakan infrastruktur backend untuk aplikasi tracking kalori dan rekomendasi makanan. API ini dibangun menggunakan **Hapi.js** framework dengan integrasi **Firebase** untuk autentikasi dan penyimpanan data, serta dilengkapi dengan fitur machine learning untuk rekomendasi makanan yang personal.

## ✨ Fitur Utama

### 🔐 Autentikasi & Otorisasi
- **Firebase Authentication** - Login/Register dengan email dan password
- **JWT Token Management** - Secure token-based authentication
- **Token Verification** - Middleware untuk proteksi endpoint
- **Session Management** - Logout dengan token revocation

### 👤 Manajemen Profil Pengguna
- **User Profile Management** - CRUD operasi profil pengguna
- **Personal Information** - Tracking data pribadi untuk kalkulasi kalori
- **Preference Settings** - Pengaturan preferensi diet dan tujuan

### 🍽️ Database Makanan
- **Food Database** - Database lengkap informasi nutrisi makanan
- **Custom Foods** - Pengguna dapat menambah makanan kustom
- **Food Search** - Pencarian makanan berdasarkan nama atau kategori
- **Nutrition Information** - Detail lengkap nilai gizi per makanan

### 📊 Tracking Makanan
- **Meal Entries** - Pencatatan konsumsi makanan harian
- **Daily Logs** - Ringkasan nutrisi harian
- **Meal Categories** - Kategorisasi makanan (sarapan, makan siang, makan malam, snack)
- **Portion Control** - Tracking porsi dan serving size

### 🤖 Rekomendasi Cerdas
- **Meal Suggestions** - Saran makanan berdasarkan profil pengguna
- **Meal Plan Generation** - Generate rencana makan otomatis
- **Smart Recommendations** - Rekomendasi berbasis machine learning
- **Recipe Details** - Detail resep lengkap dengan bahan dan instruksi

## 🏗️ Arsitektur

```
kalkulori-be/
├── src/
│   ├── controllers/          # Business logic handlers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── foodController.js
│   │   └── mealController.js
│   ├── middleware/           # Custom middleware
│   │   └── auth.js
│   ├── database/            # Database configurations
│   ├── scripts/             # Utility scripts
│   ├── routes.js            # API route definitions
│   └── server.js           # Main server file
├── package.json
└── README.md
```

## 🛠️ Teknologi

- **Framework**: Hapi.js v21.4.0
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK v13.4.0
- **Security**: JSON Web Token (JWT)
- **HTTP Client**: Axios v1.9.0
- **Data Processing**: Papa Parse v5.5.3
- **Development**: Nodemon v3.1.10
- **Runtime**: Node.js >=16.0.0

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
GET    /api/foods                # Daftar semua makanan
GET    /api/foods/{id}           # Detail makanan berdasarkan ID
POST   /api/foods                # Tambah makanan baru (admin)
PUT    /api/foods/{id}           # Update makanan
DELETE /api/foods/{id}           # Hapus makanan
GET    /api/search               # Pencarian makanan
POST   /api/search/add           # Tambah makanan dari hasil pencarian
```

### Makanan Kustom Pengguna
```http
GET    /api/users/foods          # Daftar makanan kustom pengguna
POST   /api/users/foods          # Tambah makanan kustom baru
```

### Tracking Makanan
```http
GET    /api/meals                # Daftar meal entries pengguna
POST   /api/meals                # Tambah meal entry baru
PUT    /api/meals/{id}           # Update meal entry
DELETE /api/meals/{id}           # Hapus meal entry
GET    /api/meals/updated        # Meal entries dengan format terbaru
```

### Rekomendasi & Meal Plan
```http
GET    /api/meals/suggestion           # Saran makanan
POST   /api/meals/suggestion/add       # Tambah dari saran
GET    /api/meal-plans/generate        # Generate meal plan
POST   /api/meal-plans/add-meal        # Tambah makanan dari meal plan
POST   /api/meal-plans/add-full-plan   # Tambah full meal plan
GET    /api/meals/{recipeId}/details   # Detail resep
```

### Daily Logs
```http
GET    /api/logs/{date}          # Log harian berdasarkan tanggal
```

### Health Check
```http
GET    /api/health               # Status kesehatan API
GET    /api                      # Dokumentasi API
```

## 🚀 Quick Start

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

3. **Environment Setup**
   
   Buat file `.env` di root directory:
   ```env
   PORT=9000
   NODE_ENV=development
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Import Food Data (Optional)**
   ```bash
   npm run import-foods
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Start Production Server**
   ```bash
   npm start
   ```

## 🔧 Development Scripts

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

## 📖 API Documentation

Setelah server berjalan, kunjungi:
- **Health Check**: `http://localhost:9000/api/health`
- **API Documentation**: `http://localhost:9000/api`

### Authentication Headers

Untuk endpoint yang memerlukan autentikasi, sertakan header:
```http
Authorization: Bearer <your-firebase-id-token>
```

### Response Format

API menggunakan format response yang konsisten:

**Success Response:**
```json
{
  "status": "success",
  "message": "Operation completed successfully",
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

## 🔒 Security Features

- **Firebase Authentication** - Secure user authentication
- **JWT Token Validation** - Protected endpoints
- **CORS Configuration** - Cross-origin request handling
- **Input Validation** - Request payload validation
- **Error Handling** - Comprehensive error responses

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

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Team

Kalkulori Backend API dikembangkan oleh tim Capstone FEBE Kalkulori.

## 📞 Support

Jika Anda mengalami masalah atau memiliki pertanyaan, silakan:
- Buat issue di repository ini
- Hubungi tim development

---

<div align="center">
  Made with ❤️ for healthier eating habits
</div>