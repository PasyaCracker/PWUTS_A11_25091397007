


/* ---------- A. Data & konstanta ---------- */
let dataProduk = [];                 // satu-satunya sumber data
let fotoForm = ["", "", "", "", ""]; // foto yang sedang ada di form (5 slot, slot 0 = foto depan)

const KONDISI_VALID = ["Seperti baru", "Baik", "Cukup"];
const KATEGORI_VALID = ["preloved", "sewa"];
const TIPE_FOTO_VALID = ["image/png", "image/jpeg", "image/webp"];
const MAKS_UKURAN_FOTO = 2 * 1024 * 1024; // 2 MB
const URUTAN_FIELD = ["nama", "harga", "stok", "kategori", "kondisi", "deskripsi", "foto"];


/* ---------- B. Helper ---------- */


/* ---------- C. Muat & simpan data ---------- */

// dariJson = true -> abaikan localStorage, ambil ulang dari data/produk.json
function muatProduk(dariJson) {
    if (!dariJson) {
        const tersimpan = bacaStorage(KUNCI_PRODUK);
        if (tersimpan) {
            dataProduk = tersimpan;
            renderTable();
            return;
        }
    }

    // AJAX: minta file JSON, hasilnya sudah berupa array JavaScript
    $.getJSON("data/produk.json")
        .done(function (data) {
            dataProduk = data;
            try { simpanStorage(KUNCI_PRODUK, dataProduk); } catch (err) { /* abaikan, data tetap tampil */ }
            renderTable();
        })
        .fail(function (xhr, status, error) {
            console.error("Gagal memuat produk:", status, error);
            $("#tabel-produk").html(
                '<tr><td colspan="6" class="empty-row">Gagal memuat data produk. ' +
                'Pastikan halaman dibuka lewat server lokal (Live Server / XAMPP), bukan file://</td></tr>'
            );
        });
}


/* ---------- D. Tampilkan tabel ---------- */

// Terapkan pencarian + filter, hasilnya array baru (dataProduk tidak diubah)
function dataTersaring() {
    const kata = $("#cari-produk").val().trim().toLowerCase();
    const kondisi = $("#filter-kondisi").val();
    const kategori = $("#filter-kategori").val();

    return dataProduk.filter(function (p) {
        const cocokNama = !kata || String(p.nama).toLowerCase().includes(kata);
        const cocokKondisi = !kondisi || p.kondisi === kondisi;
        const cocokKategori = !kategori || (p.kategori || "preloved") === kategori;
        return cocokNama && cocokKondisi && cocokKategori;
    });
}

function renderTable() {
    const daftar = dataTersaring();
    let isi = "";

    if (dataProduk.length === 0) {
        isi = '<tr><td colspan="6" class="empty-row">Belum ada produk. Klik "+ Tambah Produk".</td></tr>';
    } else if (daftar.length === 0) {
        isi = '<tr><td colspan="6" class="empty-row">Tidak ada produk yang cocok dengan pencarian.</td></tr>';
    } else {
        daftar.forEach(function (p) {
            const sewa = p.kategori === "sewa";
            isi += `
    <tr data-id="${p.id}">
      <td><img class="thumb" src="${esc(p.foto)}" alt="" onerror="this.onerror=null;this.removeAttribute('src')"></td>
      <td class="nama-cell">
        <div class="nama">${esc(p.nama)}</div>
        <span class="badge badge-kat ${sewa ? "badge-sewa" : "badge-preloved"}">${sewa ? "Sewa" : "Preloved"}</span>
      </td>
      <td>${rupiah(p.harga)}${sewa ? ' <span class="harga-unit">/hari</span>' : ""}</td>
      <td>${esc(p.kondisi)}</td>
      <td>
        <div class="stock-ctrl">
          <button type="button" class="btn-stok" data-id="${p.id}" data-delta="-1" ${p.stok <= 0 ? "disabled" : ""} aria-label="Kurangi stok">&minus;</button>
          <strong>${p.stok}</strong>
          <button type="button" class="btn-stok" data-id="${p.id}" data-delta="1" aria-label="Tambah stok">+</button>
        </div>
        ${p.stok < 3 ? '<span class="badge badge-warn">Menipis</span>' : ""}
      </td>
      <td>
        <button type="button" class="btn btn-outline btn-sm btn-edit" data-id="${p.id}">Edit</button>
        <button type="button" class="btn btn-danger btn-sm btn-hapus" data-id="${p.id}">Hapus</button>
      </td>
    </tr>`;
        });
    }

    $("#tabel-produk").html(isi);
}


/* ---------- E. Modal & form ---------- */

// mode: "tambah" atau "edit". Untuk edit, kirim juga objek produknya.
function bukaModal(mode, produk) {
    $("#form-produk")[0].reset();
    hapusSemuaError();

    if (mode === "edit") {
        $("#judul-modal").text("Edit Produk");
        $("#produk-id").val(produk.id);
        $("#nama").val(produk.nama);
        $("#harga").val(produk.harga);
        $("#stok").val(produk.stok);
        $("#kategori").val(produk.kategori || "preloved");
        $("#kondisi").val(produk.kondisi);
        $("#deskripsi").val(produk.deskripsi);

        // 5 slot foto: foto utama + foto lain (kalau ada)
        const lain = produk.fotoLain || [];
        fotoForm = [produk.foto || "", lain[0] || "", lain[1] || "", lain[2] || "", lain[3] || ""];
    } else {
        $("#judul-modal").text("Tambah Produk");
        $("#produk-id").val(""); // kosong = produk baru
        fotoForm = ["", "", "", "", ""];
    }

    tampilFoto();
    $("#modal-produk").addClass("open");
    $("#nama").trigger("focus");
}

function tutupModal() {
    $("#modal-produk").removeClass("open");
}

function ambilForm() {
    return {
        id: $("#produk-id").val(),
        nama: $("#nama").val().trim(),
        harga: $("#harga").val().trim(),
        stok: $("#stok").val().trim(),
        kategori: $("#kategori").val(),
        kondisi: $("#kondisi").val(),
        deskripsi: $("#deskripsi").val().trim(),
        foto: fotoForm.slice()
    };
}


/* ---------- F. Foto ---------- */

// Tampilkan isi fotoForm ke 5 slot + preview besar
function tampilFoto() {
    const url = function (src) { return 'url("' + String(src).replace(/"/g, "%22") + '")'; };

    $(".gallery-thumbs .slot").each(function (i) {
        const $slot = $(this);
        if (fotoForm[i]) {
            $slot.addClass("has-img").css("background-image", url(fotoForm[i]));
        } else {
            $slot.removeClass("has-img").css("background-image", "");
        }
    });

    const utama = fotoForm.find(function (f) { return f; });
    const $main = $("#gallery-utama");
    if (utama) {
        $main.addClass("has-img").css("background-image", url(utama));
    } else {
        $main.removeClass("has-img").css("background-image", "");
    }
}

// Baca file -> kecilkan (maks 800px) -> hasilnya teks base64 yang muat di localStorage
function bacaGambar(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = function () { reject(new Error("Gagal membaca file.")); };
        reader.onload = function () {
            const img = new Image();
            img.onerror = function () { reject(new Error("File bukan gambar yang valid.")); };
            img.onload = function () {
                const skala = Math.min(1, 800 / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * skala);
                canvas.height = Math.round(img.height * skala);
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#fff"; // PNG transparan -> latar putih
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function pilihFoto(file, indeks) {
    if (!file) return;

    if (TIPE_FOTO_VALID.indexOf(file.type) === -1) {
        setError("foto", "Format foto harus PNG, JPG, atau WEBP.");
        return;
    }
    if (file.size > MAKS_UKURAN_FOTO) {
        setError("foto", "Ukuran foto maksimal 2 MB.");
        return;
    }

    bacaGambar(file)
        .then(function (dataUrl) {
            fotoForm[indeks] = dataUrl;
            hapusError("foto");
            tampilFoto();
        })
        .catch(function (err) {
            setError("foto", err.message);
        });
}


/* ---------- G. Validasi ---------- */

// Mengembalikan objek { namaField: "pesan error" }. Objek kosong = semua valid.
function validasi(d) {
    const e = {};

    // Nama
    if (d.nama === "") e.nama = "Nama produk wajib diisi.";
    else if (d.nama.length < 3) e.nama = "Nama minimal 3 karakter.";
    else if (d.nama.length > 60) e.nama = "Nama maksimal 60 karakter.";
    else {
        const kembar = dataProduk.some(function (p) {
            return String(p.nama).toLowerCase() === d.nama.toLowerCase() && String(p.id) !== String(d.id);
        });
        if (kembar) e.nama = "Sudah ada produk dengan nama ini.";
    }

    // Harga: hanya angka bulat > 0
    if (d.harga === "") e.harga = "Harga wajib diisi.";
    else if (!/^\d+$/.test(d.harga)) e.harga = "Harga harus berupa angka bulat (tanpa titik/koma).";
    else if (Number(d.harga) <= 0) e.harga = "Harga harus lebih dari 0.";
    else if (Number(d.harga) > 100000000) e.harga = "Harga maksimal Rp 100.000.000.";

    // Stok: angka bulat >= 0
    if (d.stok === "") e.stok = "Stok wajib diisi.";
    else if (!/^\d+$/.test(d.stok)) e.stok = "Stok harus berupa angka bulat, tidak boleh negatif.";
    else if (Number(d.stok) > 9999) e.stok = "Stok maksimal 9999.";

    // Pilihan harus salah satu dari daftar (cegah nilai diubah lewat DevTools)
    if (KATEGORI_VALID.indexOf(d.kategori) === -1) e.kategori = "Pilih kategori yang tersedia.";
    if (KONDISI_VALID.indexOf(d.kondisi) === -1) e.kondisi = "Pilih kondisi yang tersedia.";

    // Deskripsi
    if (d.deskripsi === "") e.deskripsi = "Deskripsi wajib diisi.";
    else if (d.deskripsi.length < 10) e.deskripsi = "Deskripsi minimal 10 karakter.";
    else if (d.deskripsi.length > 300) e.deskripsi = "Deskripsi maksimal 300 karakter.";

    // Foto depan wajib
    if (!d.foto[0]) e.foto = "Foto depan wajib diisi.";

    return e;
}

function tampilkanError(errors) {
    hapusSemuaError();
    Object.keys(errors).forEach(function (field) { setError(field, errors[field]); });
}

function fokusKeErrorPertama(errors) {
    const pertama = URUTAN_FIELD.find(function (f) { return errors[f]; });
    if (!pertama) return;
    if (pertama === "foto") {
        $("#gallery-utama")[0].scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        $("#" + pertama).trigger("focus");
    }
}


/* ---------- H. "Server" tiruan ----------
   Karena belum ada backend, proses simpan dilakukan di browser (localStorage).
   Bentuknya sengaja dibuat mirip AJAX asli: mengembalikan promise (.done/.fail),
   ada jeda waktu, dan tombol dikunci selama "mengirim".

   Nanti kalau sudah ada backend PHP/Laravel, cukup ganti isi kirimKeServer()
   dengan $.ajax sungguhan, bagian lain tidak perlu diubah:

   function kirimKeServer(aksi, payload) {
       return $.ajax({
           url: "api/produk.php?aksi=" + aksi,
           method: "POST",
           data: JSON.stringify(payload),
           contentType: "application/json",
           dataType: "json"
       });
   }
   (Pastikan situsnya HTTPS dan server memvalidasi ulang datanya:
    validasi di browser hanya untuk kenyamanan, bukan keamanan.)
*/

function tambahProduk(d) {
    const idBaru = dataProduk.reduce(function (maks, p) { return Math.max(maks, Number(p.id)); }, 0) + 1;
    dataProduk.push({
        id: idBaru,
        foto: d.foto[0],
        nama: d.nama,
        harga: Number(d.harga),
        kondisi: d.kondisi,
        stok: Number(d.stok),
        kategori: d.kategori,
        deskripsi: d.deskripsi,
        fotoLain: d.foto.slice(1)
    });
    return "Produk berhasil ditambahkan.";
}

function ubahProduk(d) {
    const idx = dataProduk.findIndex(function (p) { return String(p.id) === String(d.id); });
    if (idx === -1) throw new Error("Produk tidak ditemukan.");
    dataProduk[idx] = Object.assign({}, dataProduk[idx], {
        foto: d.foto[0],
        nama: d.nama,
        harga: Number(d.harga),
        kondisi: d.kondisi,
        stok: Number(d.stok),
        kategori: d.kategori,
        deskripsi: d.deskripsi,
        fotoLain: d.foto.slice(1)
    });
    return "Perubahan berhasil disimpan.";
}

function hapusProduk(id) {
    const sebelum = dataProduk.length;
    dataProduk = dataProduk.filter(function (p) { return String(p.id) !== String(id); });
    if (dataProduk.length === sebelum) throw new Error("Produk tidak ditemukan.");
    return "Produk berhasil dihapus.";
}

function ubahStok(id, delta) {
    const p = dataProduk.find(function (x) { return String(x.id) === String(id); });
    if (!p) throw new Error("Produk tidak ditemukan.");
    if (p.stok + delta < 0) throw new Error("Stok tidak boleh kurang dari 0.");
    p.stok += delta;
    return "Stok " + p.nama + " sekarang " + p.stok + ".";
}

function kirimKeServer(aksi, payload) {
    const d = $.Deferred();
    const jeda = aksi === "stok" ? 80 : 350;

    setTimeout(function () {
        const cadangan = JSON.stringify(dataProduk); // untuk dikembalikan kalau gagal
        try {
            let pesan;
            if (aksi === "tambah") pesan = tambahProduk(payload);
            else if (aksi === "ubah") pesan = ubahProduk(payload);
            else if (aksi === "hapus") pesan = hapusProduk(payload.id);
            else if (aksi === "stok") pesan = ubahStok(payload.id, payload.delta);
            else throw new Error("Aksi tidak dikenal.");

            simpanStorage(KUNCI_PRODUK, dataProduk);
            d.resolve(pesan);
        } catch (err) {
            dataProduk = JSON.parse(cadangan); // batalkan perubahan
            const penuh = err && err.name === "QuotaExceededError";
            d.reject(new Error(penuh ? "Penyimpanan browser penuh. Coba foto yang lebih kecil." : err.message));
        }
    }, jeda);

    return d.promise();
}


/* ---------- I. Event handler ---------- */

$(document).ready(function () {
    muatProduk();

    // --- Buka / tutup modal ---
    $("#btn-tambah").on("click", function () { bukaModal("tambah"); });

    $(".tutup-modal").on("click", tutupModal);

    $("#modal-produk").on("click", function (e) {
        if (e.target === this) tutupModal(); // klik area gelap di luar kotak
    });

    $(document).on("keydown", function (e) {
        if (e.key === "Escape") tutupModal();
    });

    // --- Pencarian & filter (render ulang tiap berubah) ---
    $("#cari-produk").on("input", renderTable);
    $("#filter-kondisi, #filter-kategori").on("change", renderTable);

    // --- Reset ke data awal dari produk.json ---
    $("#btn-reset").on("click", function () {
        if (!confirm("Kembalikan semua data ke awal (dari produk.json)? Perubahan yang sudah kamu buat akan hilang.")) return;
        hapusStorage(KUNCI_PRODUK);
        muatProduk(true);
        toast("Data dikembalikan ke awal.");
    });

    // --- Tombol di dalam tabel: dibuat lewat JS, jadi pakai event delegation ---
    $("#tabel-produk")
        .on("click", ".btn-edit", function () {
            const id = $(this).data("id");
            const produk = dataProduk.find(function (p) { return String(p.id) === String(id); });
            if (produk) bukaModal("edit", produk);
        })
        .on("click", ".btn-hapus", function () {
            const id = $(this).data("id");
            const produk = dataProduk.find(function (p) { return String(p.id) === String(id); });
            if (!produk) return;
            if (!confirm('Hapus "' + produk.nama + '"? Tindakan ini tidak bisa dibatalkan.')) return;

            kirimKeServer("hapus", { id: id })
                .done(function (pesan) { renderTable(); toast(pesan); })
                .fail(function (err) { toast(err.message, true); });
        })
        .on("click", ".btn-stok", function () {
            kirimKeServer("stok", { id: $(this).data("id"), delta: Number($(this).data("delta")) })
                .done(function () { renderTable(); })
                .fail(function (err) { toast(err.message, true); });
        });

    // --- Foto: klik slot -> pilih file ---
    $(".gallery-thumbs").on("change", "input[type=file]", function () {
        const indeks = Number($(this).closest(".slot").data("slot"));
        pilihFoto(this.files[0], indeks);
        this.value = ""; // supaya file yang sama bisa dipilih lagi
    });

    // --- Hapus pesan error begitu pengguna mulai memperbaiki isian ---
    $("#form-produk").on("input change", "input, select, textarea", function () {
        if (this.id) hapusError(this.id);
    });

    // --- Submit: validasi dulu, baru kirim ---
    $("#form-produk").on("submit", function (e) {
        e.preventDefault(); // cegah halaman reload

        const data = ambilForm();
        const errors = validasi(data);

        if (Object.keys(errors).length > 0) {
            tampilkanError(errors);
            fokusKeErrorPertama(errors);
            return; // berhenti di sini, tidak ada yang dikirim
        }

        const aksi = data.id ? "ubah" : "tambah";
        const $btn = $("#btn-simpan").prop("disabled", true).text("Menyimpan...");

        kirimKeServer(aksi, data)
            .done(function (pesan) {
                renderTable();
                tutupModal();
                toast(pesan);
            })
            .fail(function (err) {
                toast(err.message, true);
            })
            .always(function () {
                $btn.prop("disabled", false).text("Simpan");
            });
    });
});
