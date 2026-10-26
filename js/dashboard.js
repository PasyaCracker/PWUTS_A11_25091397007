


/* ---------- A. Konstanta & hitungan ---------- */
const HARI_LAPORAN = 30;   // statistik dihitung dari 30 hari terakhir
const BATAS_STOK_TIPIS = 3; // stok kurang dari 3 dianggap menipis
const JUMLAH_MINGGU = 6;   // jumlah batang di grafik

let dataPesanan = [];
let dataProduk = [];

// Pesanan dalam 30 hari terakhir (hari ini termasuk)
function pesananPeriode() {
    const batas = tanggalDariOffset(HARI_LAPORAN - 1);
    return dataPesanan.filter(function (p) { return p.tanggal >= batas; });
}

function jumlahkan(daftar) {
    return daftar.reduce(function (jumlah, p) { return jumlah + totalPesanan(p); }, 0);
}

// Dashboard ini khusus preloved. Produk tanpa field kategori dianggap preloved.
function produkPreloved() {
    return dataProduk.filter(function (p) { return (p.kategori || "preloved") === "preloved"; });
}


/* ---------- B. Kartu statistik & laporan ---------- */

function renderStatistik() {
    const periode = pesananPeriode();
    const pendapatan = jumlahkan(periode);
    const preloved = produkPreloved();

    // Kartu statistik
    $("#stat-penjualan").text(rupiah(pendapatan));
    $("#stat-pesanan-baru").text(dataPesanan.filter(function (p) { return p.status === "baru"; }).length);
    $("#stat-produk").text(preloved.filter(function (p) { return p.stok > 0; }).length);
    $("#stat-stok-tipis").text(preloved.filter(function (p) { return p.stok < BATAS_STOK_TIPIS; }).length);

    // Ringkasan laporan (rata-rata dijaga supaya tidak dibagi nol)
    $("#lap-jumlah").text(periode.length);
    $("#lap-pendapatan").text(rupiah(pendapatan));
    $("#lap-rata").text(rupiah(periode.length ? Math.round(pendapatan / periode.length) : 0));
}


/* ---------- C. Grafik penjualan ---------- */

// Ringkas angka untuk label sumbu: 1500000 -> "1,5 jt", 250000 -> "250 rb"
function ringkas(n) {
    if (n >= 1000000) return (n / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
    if (n >= 1000) return (n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " rb";
    return String(n);
}

function labelRentang(awal, akhir) {
    if (awal.getMonth() === akhir.getMonth()) {
        return awal.getDate() + "–" + akhir.getDate() + " " + BULAN[akhir.getMonth()];
    }
    return awal.getDate() + " " + BULAN[awal.getMonth()] + "–" + akhir.getDate() + " " + BULAN[akhir.getMonth()];
}

// Kelompokkan penjualan per minggu: [{label, total, jumlah}, ...] dari yang terlama
function penjualanMingguan(jumlahMinggu) {
    const hasil = [];
    for (let i = jumlahMinggu - 1; i >= 0; i--) {
        const akhir = hariIni();
        akhir.setDate(akhir.getDate() - i * 7);
        const awal = new Date(akhir);
        awal.setDate(awal.getDate() - 6);

        const a = keIso(awal), b = keIso(akhir);
        const daftar = dataPesanan.filter(function (p) { return p.tanggal >= a && p.tanggal <= b; });

        hasil.push({ label: labelRentang(awal, akhir), total: jumlahkan(daftar), jumlah: daftar.length });
    }
    return hasil;
}

// Cari batas atas sumbu Y yang "bulat" supaya garis bantunya rapi
function batasAtas(maks) {
    const langkahKandidat = [100000, 200000, 250000, 500000, 1000000, 2000000, 2500000, 5000000, 10000000];
    const langkah = langkahKandidat.find(function (k) { return maks / k <= 4; }) || 10000000;
    return { langkah: langkah, atas: Math.max(langkah, Math.ceil(maks / langkah) * langkah) };
}

function renderGrafik() {
    const minggu = penjualanMingguan(JUMLAH_MINGGU);
    const maks = Math.max.apply(null, minggu.map(function (m) { return m.total; }));
    const skala = batasAtas(maks);

    const W = 600, H = 260;
    const kiri = 58, kanan = 12, atas = 22, bawah = 34;
    const lebarPlot = W - kiri - kanan;
    const tinggiPlot = H - atas - bawah;
    const slot = lebarPlot / minggu.length;
    const lebarBatang = slot * 0.55;

    let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H + '" role="img" ' +
        'aria-label="Grafik penjualan per minggu selama ' + JUMLAH_MINGGU + ' minggu terakhir">';

    // Garis bantu + label sumbu Y
    for (let t = 0; t <= skala.atas; t += skala.langkah) {
        const y = atas + tinggiPlot - (t / skala.atas) * tinggiPlot;
        svg += '<line class="grid" x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y + '" y2="' + y + '"/>';
        svg += '<text x="' + (kiri - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + ringkas(t) + "</text>";
    }

    // Batang + nilai + label minggu
    minggu.forEach(function (m, i) {
        const tinggi = (m.total / skala.atas) * tinggiPlot;
        const x = kiri + i * slot + (slot - lebarBatang) / 2;
        const y = atas + tinggiPlot - tinggi;
        const tengah = x + lebarBatang / 2;

        svg += '<rect class="bar" x="' + x + '" y="' + y + '" width="' + lebarBatang + '" height="' + tinggi + '" rx="4">' +
            "<title>" + m.label + ": " + rupiah(m.total) + " (" + m.jumlah + " pesanan)</title></rect>";
        if (m.total > 0) {
            svg += '<text class="nilai" x="' + tengah + '" y="' + (y - 6) + '" text-anchor="middle">' + ringkas(m.total) + "</text>";
        }
        svg += '<text x="' + tengah + '" y="' + (H - 12) + '" text-anchor="middle">' + m.label + "</text>";
    });

    svg += "</svg>";
    $("#chartPenjualan").addClass("terisi").html(svg);
}


/* ---------- D. Tabel pesanan terbaru ---------- */

function renderPesananTerbaru() {
    const terbaru = dataPesanan.slice().sort(urutkanTerbaru).slice(0, 5);
    let isi = "";

    if (terbaru.length === 0) {
        isi = '<tr><td colspan="5" class="empty-row">Belum ada pesanan.</td></tr>';
    }

    terbaru.forEach(function (p) {
        isi += `
    <tr>
      <td>#${esc(p.kode)}</td>
      <td>${esc(p.pembeli)}</td>
      <td>${rupiah(totalPesanan(p))}</td>
      <td>${formatTanggal(p.tanggal)}</td>
      <td>${badgeStatus(p.status)}</td>
    </tr>`;
    });

    $("#tabel-pesanan-terbaru").html(isi);
}


/* ---------- E. Ekspor CSV ---------- */

// Bungkus satu sel CSV: kutip ganda digandakan. Sel teks yang diawali = + - @
// diberi tanda ' di depan supaya Excel tidak menganggapnya rumus (CSV injection).
function selCsv(nilai, teks) {
    let s = String(nilai);
    if (teks && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
}

function eksporLaporan() {
    const periode = pesananPeriode().sort(urutkanTerbaru);

    if (periode.length === 0) {
        toast("Tidak ada transaksi untuk diekspor.", true);
        return;
    }

    const baris = [["Kode", "Tanggal", "Pembeli", "Status", "Pembayaran", "Item", "Total (Rp)"]
        .map(function (h) { return selCsv(h, false); }).join(",")];

    periode.forEach(function (p) {
        const item = p.items.map(function (i) { return i.nama + " x" + i.qty; }).join("; ");
        baris.push([
            selCsv(p.kode, true),
            selCsv(p.tanggal, false),
            selCsv(p.pembeli, true),
            selCsv(STATUS[p.status] ? STATUS[p.status].label : p.status, true),
            selCsv(p.pembayaran, true),
            selCsv(item, true),
            totalPesanan(p) // angka murni, tanpa kutip
        ].join(","));
    });

    // ﻿ = penanda supaya Excel membaca huruf dengan benar
    const blob = new Blob(["﻿" + baris.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-transaksi-" + keIso(new Date()) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast("Laporan " + periode.length + " transaksi diekspor.");
}


/* ---------- F. Jalankan ---------- */

$(document).ready(function () {
    // Dua AJAX sekaligus: halaman diisi setelah KEDUANYA selesai
    $.when(
        ambilData(KUNCI_PESANAN, "data/pesanan.json", normalisasiPesanan),
        ambilData(KUNCI_PRODUK, "data/produk.json")
    )
        .done(function (pesanan, produk) {
            dataPesanan = pesanan;
            dataProduk = produk;
            renderStatistik();
            renderGrafik();
            renderPesananTerbaru();
        })
        .fail(function (err) {
            console.error(err);
            $("#chartPenjualan").text("Gagal memuat data. Buka halaman lewat server lokal (Live Server / XAMPP), bukan file://");
        });

    $("#btn-ekspor").on("click", eksporLaporan);
});
