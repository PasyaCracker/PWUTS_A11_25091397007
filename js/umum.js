/* =========================================================
   umum.js - fungsi bantu yang dipakai SEMUA halaman
   (produk.html, pesanan.html, index.html)

   Muat file ini SETELAH jQuery dan SEBELUM js halaman masing-masing:
     <script src="js/jquery-4.0.0.min.js"></script>
     <script src="js/umum.js"></script>
     <script src="js/app.js"></script>        (atau pesanan.js / dashboard.js)

   Daftar isi:
   1. Konstanta
   2. Format & keamanan teks
   3. Tanggal
   4. Penyimpanan (localStorage) + ambil data (AJAX)
   5. "Server" tiruan
   6. Helper pesan error form
   7. Helper data pesanan
   ========================================================= */


/* ---------- 1. Konstanta ---------- */
const KUNCI_PRODUK = "produk_admin_v1";
const KUNCI_PESANAN = "pesanan_admin_v1";

// Urutan alur pesanan: baru -> dikemas -> dikirim -> selesai
const STATUS = {
    baru:    { label: "Baru",    badge: "badge-baru" },
    dikemas: { label: "Dikemas", badge: "badge-dikemas" },
    dikirim: { label: "Dikirim", badge: "badge-dikirim" },
    selesai: { label: "Selesai", badge: "badge-selesai" }
};


/* ---------- 2. Format & keamanan teks ---------- */

// Ubah angka jadi "Rp 150.000"
function rupiah(angka) {
    return Number(angka).toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    });
}

// Cegah teks dari pengguna menyusup jadi HTML/script (XSS)
function esc(teks) {
    return String(teks).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function badgeStatus(status) {
    const s = STATUS[status] || { label: status, badge: "" };
    return '<span class="badge ' + s.badge + '">' + esc(s.label) + "</span>";
}

// Pesan kecil di pojok kanan atas
function toast(pesan, gagal) {
    const $t = $("<div>").addClass("toast").text(pesan);
    if (gagal) $t.addClass("toast-gagal");
    $t.appendTo("body");
    setTimeout(function () { $t.remove(); }, 2800);
}


/* ---------- 3. Tanggal ----------
   Tanggal disimpan sebagai teks "2026-10-26" (tahun-bulan-tanggal).
   Format ini bisa dibandingkan langsung sebagai teks: "2026-10-05" < "2026-10-26". */
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad(n) { return String(n).padStart(2, "0"); }

function keIso(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function dariIso(iso) {
    const bagian = iso.split("-").map(Number);
    return new Date(bagian[0], bagian[1] - 1, bagian[2]);
}

function hariIni() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// n hari yang lalu -> "2026-10-19"
function tanggalDariOffset(n) {
    const d = hariIni();
    d.setDate(d.getDate() - n);
    return keIso(d);
}

// "2026-10-26" -> "26 Okt 2026"
function formatTanggal(iso) {
    const d = dariIso(iso);
    return d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear();
}


/* ---------- 4. Penyimpanan + ambil data ---------- */

function bacaStorage(kunci) {
    try {
        const mentah = localStorage.getItem(kunci);
        return mentah ? JSON.parse(mentah) : null;
    } catch (err) {
        return null; // storage diblokir / isinya rusak -> anggap kosong
    }
}

// Melempar error kalau gagal (misal penyimpanan penuh)
function simpanStorage(kunci, data) {
    localStorage.setItem(kunci, JSON.stringify(data));
}

function hapusStorage(kunci) {
    try { localStorage.removeItem(kunci); } catch (err) { /* abaikan */ }
}

/* Ambil data: localStorage dulu, kalau kosong baru minta file JSON lewat AJAX.
   olah (opsional) = fungsi untuk merapikan data JSON sebelum disimpan.
   Mengembalikan promise: pakai .done(function (data) {...}) dan .fail(...) */
function ambilData(kunci, url, olah) {
    const d = $.Deferred();
    const tersimpan = bacaStorage(kunci);

    if (tersimpan) {
        d.resolve(tersimpan);
        return d.promise();
    }

    $.getJSON(url)
        .done(function (data) {
            const hasil = olah ? olah(data) : data;
            try { simpanStorage(kunci, hasil); } catch (err) { /* abaikan, data tetap dipakai */ }
            d.resolve(hasil);
        })
        .fail(function () {
            d.reject(new Error("Gagal memuat " + url));
        });

    return d.promise();
}


/* ---------- 5. "Server" tiruan ----------
   Belum ada backend, jadi "kirim ke server" disimulasikan: jalankan fungsi
   kerjakan() setelah jeda singkat, hasilnya lewat promise (.done / .fail).
   Nanti tinggal diganti $.ajax sungguhan, bagian lain tidak perlu diubah. */
function simulasiServer(kerjakan, jeda) {
    const d = $.Deferred();
    setTimeout(function () {
        try {
            d.resolve(kerjakan());
        } catch (err) {
            d.reject(err);
        }
    }, jeda === undefined ? 350 : jeda);
    return d.promise();
}


/* ---------- 6. Helper pesan error form ----------
   Pola HTML-nya:  <input id="nama">  +  <small class="error" data-for="nama"></small> */
function setError(field, pesan) {
    $('[data-for="' + field + '"]').text(pesan);
    $("#" + field).addClass("is-invalid");
}

function hapusError(field) {
    $('[data-for="' + field + '"]').text("");
    $("#" + field).removeClass("is-invalid");
}

function hapusSemuaError() {
    $(".error").text("");
    $(".is-invalid").removeClass("is-invalid");
}


/* ---------- 7. Helper data pesanan ---------- */

// Total = jumlah (qty x harga) semua item. Total tidak disimpan, selalu dihitung ulang.
function totalPesanan(p) {
    return (p.items || []).reduce(function (jumlah, item) {
        return jumlah + Number(item.qty) * Number(item.harga);
    }, 0);
}

/* File pesanan.json menyimpan "hariLalu" (misal 3 = tiga hari yang lalu), bukan tanggal tetap,
   supaya dashboard selalu terisi walau dibuka di hari yang berbeda.
   Fungsi ini mengubahnya jadi tanggal asli sekali saja, saat data pertama kali dimuat. */
function normalisasiPesanan(data) {
    return data.map(function (p) {
        const baru = Object.assign({}, p);
        if (baru.hariLalu !== undefined && !baru.tanggal) {
            baru.tanggal = tanggalDariOffset(baru.hariLalu);
        }
        delete baru.hariLalu;
        return baru;
    });
}

// Urutan terbaru dulu (tanggal, lalu id)
function urutkanTerbaru(a, b) {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1;
    return b.id - a.id;
}
