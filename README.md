Admin Preloved – Catatan Pengerjaan

Halaman admin untuk jalur preloved (barang bekas perlengkapan outdoor) pada proyek web "preloved + sewa perlengkapan pendakian". Dibangun dengan HTML, CSS, dan jQuery (tanpa Bootstrap).

Tiga halaman: Dashboard, Kelola Produk, Pesanan Masuk.

1. Cara menjalankan

Buka lewat server lokal, jangan klik dua kali file HTML-nya.

VS Code: pasang ekstensi Live Server, klik kanan index.html lalu Open with Live Server.
XAMPP/Laragon: taruh folder di htdocs / www, buka http://localhost/PWUTS_A11_25091397007/.

Alasannya: AJAX ($.getJSON) tidak bisa membaca file JSON kalau halaman dibuka dengan alamat file://. Kalau tabel menampilkan "Gagal memuat data", hampir pasti penyebabnya ini.

2. Struktur folder
WebUTSAmir/
├── index.html        Dashboard
├── produk.html       Kelola Produk
├── pesanan.html      Pesanan Masuk
├── style.css         Satu CSS untuk semua halaman
├── data/
│   ├── produk.json   Data awal produk (14 item: 8 preloved, 6 sewa)
│   └── pesanan.json  Data awal pesanan (27 pesanan dummy)
├── img/              Foto produk (sebagian masih placeholder)
└── js/
    ├── jquery-4.0.0.min.js
    ├── umum.js       Fungsi bersama: format rupiah, esc(), toast, tanggal, penyimpanan, AJAX
    ├── app.js        Logika halaman Produk
    ├── pesanan.js    Logika halaman Pesanan
    └── dashboard.js  Logika halaman Dashboard

Urutan script di setiap halaman: jQuery → umum.js → file halaman.

3. Fitur per halaman

Dashboard

Kartu statistik: total penjualan (30 hari terakhir), pesanan baru, produk aktif, stok menipis (stok < 3).
Grafik penjualan per minggu (6 minggu), digambar sendiri dengan SVG tanpa library.
Laporan transaksi (jumlah, pendapatan, rata-rata order) dan tombol Ekspor ke CSV.
Lima pesanan terbaru.

Kelola Produk

Tabel produk dengan thumbnail, pencarian nama, filter kategori dan kondisi.
Tambah, edit, dan hapus produk lewat modal. Form yang sama dipakai untuk tambah dan edit (dibedakan oleh input tersembunyi #produk-id: kosong berarti tambah).
Tombol tambah/kurangi stok langsung di tabel.
Galeri foto multi-angle (depan, belakang, samping, detail, cacat) dengan preview.

Pesanan Masuk

Tab status dengan badge jumlah, kolom cari, dan modal detail.
Alur: baru → dikemas → dikirim → selesai.
Konfirmasi pengiriman lewat form resi (kurir + nomor resi).


