/* =========================================================
   pesanan.js - Pesanan Masuk (tab status, detail, konfirmasi resi)
   Butuh js/umum.js

   Alur status:  baru --(Mulai Kemas)--> dikemas --(isi resi)--> dikirim --(Tandai Selesai)--> selesai

   Daftar isi:
   A. Data & konstanta
   B. Muat data
   C. Tampilkan tab & tabel
   D. Modal detail
   E. Validasi form resi
   F. Ubah status ("server" tiruan)
   G. Event handler
   ========================================================= */


/* ---------- A. Data & konstanta ---------- */
let dataPesanan = [];   // satu-satunya sumber data
let tabAktif = "baru";  // tab yang sedang dibuka
let idTerpilih = null;  // pesanan yang sedang dibuka di modal

const KURIR_VALID = ["JNE", "J&T", "SiCepat", "Pos Indonesia"];


/* ---------- B. Muat data ---------- */

// dariJson = true -> abaikan localStorage, ambil ulang dari data/pesanan.json
function muatPesanan(dariJson) {
    if (dariJson) hapusStorage(KUNCI_PESANAN);

    ambilData(KUNCI_PESANAN, "data/pesanan.json", normalisasiPesanan)
        .done(function (data) {
            dataPesanan = data;
            renderSemua();
        })
        .fail(function (err) {
            console.error(err);
            $("#tabel-pesanan").html(
                '<tr><td colspan="6" class="empty-row">' + esc(err.message) + ". " +
                "Pastikan halaman dibuka lewat server lokal (Live Server / XAMPP), bukan file://</td></tr>"
            );
        });
}

function cariPesanan(id) {
    return dataPesanan.find(function (p) { return String(p.id) === String(id); });
}


/* ---------- C. Tampilkan tab & tabel ---------- */

function renderSemua() {
    renderTab();
    renderTabel();
}

// Angka kecil di tiap tab = jumlah pesanan dengan status itu
function renderTab() {
    Object.keys(STATUS).forEach(function (s) {
        const jumlah = dataPesanan.filter(function (p) { return p.status === s; }).length;
        $('.tab[data-status="' + s + '"] .count').text(jumlah);
    });
}

function renderTabel() {
    const kata = $("#cari-pesanan").val().trim().toLowerCase();

    const daftar = dataPesanan
        .filter(function (p) {
            const cocokTab = p.status === tabAktif;
            const cocokKata = !kata ||
                String(p.kode).toLowerCase().includes(kata) ||
                String(p.pembeli).toLowerCase().includes(kata);
            return cocokTab && cocokKata;
        })
        .sort(urutkanTerbaru);

    let isi = "";

    if (daftar.length === 0) {
        isi = '<tr><td colspan="6" class="empty-row">' +
            (kata ? "Tidak ada pesanan yang cocok." : 'Belum ada pesanan dengan status "' + STATUS[tabAktif].label + '".') +
            "</td></tr>";
    } else {
        daftar.forEach(function (p) {
            isi += `
    <tr data-id="${p.id}">
      <td>#${esc(p.kode)}</td>
      <td>${esc(p.pembeli)}</td>
      <td>${rupiah(totalPesanan(p))}</td>
      <td>${formatTanggal(p.tanggal)}</td>
      <td>${badgeStatus(p.status)}</td>
      <td><button type="button" class="btn btn-outline btn-sm btn-detail" data-id="${p.id}">Detail</button></td>
    </tr>`;
        });
    }

    $("#tabel-pesanan").html(isi);
}


/* ---------- D. Modal detail ---------- */

function bukaDetail(id) {
    const p = cariPesanan(id);
    if (!p) return;
    idTerpilih = p.id;
    isiModal(p);
    $("#modal-detail").addClass("open");
}

function tutupModal() {
    $("#modal-detail").removeClass("open");
    idTerpilih = null;
}

// Isi ulang seluruh isi modal dari data satu pesanan
function isiModal(p) {
    $("#judul-detail").text("Detail Pesanan " + p.kode);

    // Info pembeli (kiri) dan pembayaran (kanan)
    let kanan = `
      <dt>Pembayaran</dt><dd>${esc(p.pembayaran)}</dd>
      <dt>Status</dt><dd>${badgeStatus(p.status)}</dd>`;
    if (p.kurir) {
        kanan += `<dt>Kurir / No. resi</dt><dd>${esc(p.kurir)} / ${esc(p.resi)}</dd>`;
    }
    $("#info-pesanan").html(`
      <div>
        <dt>Pembeli</dt><dd>${esc(p.pembeli)}</dd>
        <dt>Alamat</dt><dd>${esc(p.alamat)}</dd>
        <dt>Tanggal</dt><dd>${formatTanggal(p.tanggal)}</dd>
      </div>
      <div>${kanan}</div>`);

    // Daftar barang
    let baris = "";
    (p.items || []).forEach(function (item) {
        baris += `<tr>
      <td>${esc(item.nama)}</td>
      <td>${item.qty}</td>
      <td>${rupiah(item.harga)}</td>
      <td>${rupiah(item.qty * item.harga)}</td>
    </tr>`;
    });
    $("#detail-item").html(baris);
    $("#detail-total").text(rupiah(totalPesanan(p)));

    $("#aksi-pesanan").html(htmlAksi(p));
}

// Bagian bawah modal berubah sesuai status pesanan
function htmlAksi(p) {
    if (p.status === "baru") {
        return `<p class="catatan">Pesanan baru. Periksa stok barang, lalu mulai dikemas.</p>
      <button type="button" class="btn" id="btn-kemas">Mulai Kemas</button>`;
    }

    if (p.status === "dikemas") {
        const opsi = KURIR_VALID.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("");
        return `<form id="form-resi" novalidate>
      <h3>Konfirmasi Pengiriman</h3>
      <div class="form-row">
        <div class="form-group">
          <label for="kurir">Kurir</label>
          <select id="kurir" name="kurir">${opsi}</select>
          <small class="error" data-for="kurir"></small>
        </div>
        <div class="form-group">
          <label for="resi">Nomor resi</label>
          <input type="text" id="resi" name="resi" maxlength="20" autocomplete="off">
          <small class="error" data-for="resi"></small>
        </div>
      </div>
      <button type="submit" class="btn" id="btn-kirim">Konfirmasi Pengiriman</button>
    </form>`;
    }

    if (p.status === "dikirim") {
        return `<p class="catatan">Dikirim lewat ${esc(p.kurir)} dengan resi <strong>${esc(p.resi)}</strong>.
      Klik tombol di bawah setelah barang diterima pembeli.</p>
      <button type="button" class="btn" id="btn-selesai">Tandai Selesai</button>`;
    }

    return '<p class="catatan">Pesanan ini sudah selesai.</p>';
}


/* ---------- E. Validasi form resi ---------- */

// Mengembalikan objek { namaField: "pesan error" }. Objek kosong = valid.
function validasiResi(kurir, resi, idSaatIni) {
    const e = {};

    if (KURIR_VALID.indexOf(kurir) === -1) {
        e.kurir = "Pilih kurir yang tersedia.";
    }

    if (resi === "") {
        e.resi = "Nomor resi wajib diisi.";
    } else if (!/^[A-Za-z0-9]+$/.test(resi)) {
        e.resi = "Nomor resi hanya boleh huruf dan angka (tanpa spasi atau simbol).";
    } else if (resi.length < 8 || resi.length > 20) {
        e.resi = "Nomor resi harus 8 sampai 20 karakter.";
    } else {
        const dipakai = dataPesanan.some(function (p) {
            return p.resi && p.resi.toUpperCase() === resi.toUpperCase() && String(p.id) !== String(idSaatIni);
        });
        if (dipakai) e.resi = "Nomor resi ini sudah dipakai pesanan lain.";
    }

    return e;
}


/* ---------- F. Ubah status ("server" tiruan) ---------- */

/* Jalankan perubahan pada satu pesanan lalu simpan.
   Kalau gagal di tengah jalan, data dikembalikan seperti semula (rollback). */
function ubahPesanan(id, ubah) {
    const cadangan = JSON.stringify(dataPesanan);
    try {
        const p = cariPesanan(id);
        if (!p) throw new Error("Pesanan tidak ditemukan.");
        const pesan = ubah(p);
        simpanStorage(KUNCI_PESANAN, dataPesanan);
        return pesan;
    } catch (err) {
        dataPesanan = JSON.parse(cadangan);
        throw err;
    }
}

function kemasPesanan(id) {
    return ubahPesanan(id, function (p) {
        if (p.status !== "baru") throw new Error("Status pesanan sudah berubah. Muat ulang halaman.");
        p.status = "dikemas";
        return "Pesanan " + p.kode + " sedang dikemas.";
    });
}

function kirimPesanan(id, kurir, resi) {
    return ubahPesanan(id, function (p) {
        if (p.status !== "dikemas") throw new Error("Pesanan ini tidak berstatus Dikemas.");
        p.status = "dikirim";
        p.kurir = kurir;
        p.resi = resi.toUpperCase();
        return "Pesanan " + p.kode + " ditandai dikirim.";
    });
}

function selesaikanPesanan(id) {
    return ubahPesanan(id, function (p) {
        if (p.status !== "dikirim") throw new Error("Pesanan ini tidak berstatus Dikirim.");
        p.status = "selesai";
        return "Pesanan " + p.kode + " selesai.";
    });
}

/* Dipakai ketiga aksi: kunci tombol, "kirim", lalu segarkan tabel + modal.
   $tombol = tombol yang diklik, kerjakan = salah satu fungsi di atas */
function prosesAksi($tombol, teksProses, kerjakan) {
    const teksAsli = $tombol.text();
    $tombol.prop("disabled", true).text(teksProses);

    simulasiServer(kerjakan)
        .done(function (pesan) {
            renderSemua();
            const p = cariPesanan(idTerpilih);
            if (p) isiModal(p); // modal langsung menampilkan langkah berikutnya
            toast(pesan);
        })
        .fail(function (err) {
            $tombol.prop("disabled", false).text(teksAsli);
            toast(err.message, true);
        });
}


/* ---------- G. Event handler ---------- */

$(document).ready(function () {
    muatPesanan();

    // --- Tab status ---
    $(".tabs").on("click", ".tab", function () {
        tabAktif = $(this).data("status");
        $(".tab").removeClass("active");
        $(this).addClass("active");
        renderTabel();
    });

    $("#cari-pesanan").on("input", renderTabel);

    // --- Buka detail (tombol dibuat lewat JS -> event delegation) ---
    $("#tabel-pesanan").on("click", ".btn-detail", function () {
        bukaDetail($(this).data("id"));
    });

    // --- Tutup modal ---
    $(".tutup-modal").on("click", tutupModal);
    $("#modal-detail").on("click", function (e) {
        if (e.target === this) tutupModal();
    });
    $(document).on("keydown", function (e) {
        if (e.key === "Escape") tutupModal();
    });

    // --- Aksi di dalam modal (isinya dibuat ulang tiap status berubah -> delegation) ---
    $("#aksi-pesanan")
        .on("click", "#btn-kemas", function () {
            const id = idTerpilih;
            prosesAksi($(this), "Memproses...", function () { return kemasPesanan(id); });
        })
        .on("click", "#btn-selesai", function () {
            const id = idTerpilih;
            prosesAksi($(this), "Memproses...", function () { return selesaikanPesanan(id); });
        })
        .on("input change", "input, select", function () {
            if (this.id) hapusError(this.id); // hapus pesan error begitu pengguna memperbaiki
        })
        .on("submit", "#form-resi", function (e) {
            e.preventDefault(); // cegah halaman reload

            const id = idTerpilih;
            const kurir = $("#kurir").val();
            const resi = $("#resi").val().trim();

            const errors = validasiResi(kurir, resi, id);
            hapusSemuaError();

            if (Object.keys(errors).length > 0) {
                Object.keys(errors).forEach(function (f) { setError(f, errors[f]); });
                $("#" + (errors.kurir ? "kurir" : "resi")).trigger("focus");
                return; // berhenti di sini, tidak ada yang dikirim
            }

            prosesAksi($("#btn-kirim"), "Menyimpan...", function () { return kirimPesanan(id, kurir, resi); });
        });

    // --- Reset ke data awal dari pesanan.json ---
    $("#btn-reset").on("click", function () {
        if (!confirm("Kembalikan semua pesanan ke data awal (dari pesanan.json)? Perubahan status yang sudah kamu buat akan hilang.")) return;
        tutupModal();
        tabAktif = "baru";
        $(".tab").removeClass("active").filter('[data-status="baru"]').addClass("active");
        muatPesanan(true);
        toast("Data pesanan dikembalikan ke awal.");
    });
});
