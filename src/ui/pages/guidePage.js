import { el } from '../dom.js';
import { iconEl } from '../icons.js';

function section(title, ...children) {
  return el('section', { class: 'panel guide-section' }, el('h2', { class: 'panel-title', text: title }), ...children);
}

function p(text) {
  return el('p', { class: 'guide-text', text });
}

function list(items) {
  return el('ul', { class: 'guide-list' }, ...items.map((item) => el('li', { text: item })));
}

function code(text) {
  return el('pre', { class: 'guide-code' }, el('code', { text }));
}

export function renderGuidePage(ctx, container) {
  const { settings } = ctx;
  const tariff = settings.get().tariff;

  const page = el('div', { class: 'page page--guide' });
  page.append(
    el(
      'div',
      { class: 'page-head' },
      el('h1', { class: 'page-title', text: 'Panduan Penggunaan' }),
      el('p', { class: 'page-sub', text: 'Cara menghitung konsumsi energi dan biaya listrik perangkat apa pun dengan PLNCalc.' })
    )
  );

  const body = el('div', { class: 'guide-body' });

  body.appendChild(
    section(
      'Cara cepat menghitung',
      list([
        'Isi nama perangkat (wajib). Perangkat apa pun bisa dihitung, tidak harus ada dalam preset.',
        'Masukkan daya: dari label/datasheet (nominal), estimasi rata-rata, atau hasil pengukuran wattmeter/smart plug.',
        'Tentukan durasi pemakaian per hari (jam dan menit) serta hari operasi per minggu/bulan/tahun.',
        'Periksa tarif listrik per kWh — default memakai tarif contoh yang bisa Anda ubah.',
        'Hasil energi (kWh) dan biaya (Rp) per jam, hari, minggu, bulan, dan tahun muncul otomatis.',
        'Simpan ke riwayat, cetak, atau ekspor struk sebagai PNG.',
      ])
    )
  );

  body.appendChild(
    section(
      'Metode input daya',
      p('PLNCalc menyediakan tiga metode agar Anda tidak terjebak asumsi bahwa semua perangkat memakai daya label sepanjang waktu:'),
      list([
        'Daya nominal — angka yang tertera pada label atau datasheet perangkat. Cocok untuk lampu, kipas, TV, dan perangkat berdaya relatif stabil.',
        'Daya rata-rata — estimasi daya selama perangkat beroperasi. Cocok untuk AC inverter, kulkas, PC, dan server yang konsumsinya berubah-ubah.',
        'Daya hasil pengukuran — angka dari wattmeter, smart plug, atau power meter milik Anda. Ditandai sebagai data pengukuran pengguna; PLNCalc sendiri tidak mengukur listrik.',
      ])
    )
  );

  body.appendChild(
    section(
      'Mode perhitungan',
      list([
        'Daya konstan — satu nilai daya dipakai untuk seluruh durasi.',
        'Daya rata-rata — memakai nilai rata-rata yang Anda masukkan.',
        'Skenario min–maks — menghitung rentang estimasi biaya dari daya minimum dan maksimum. Rentang ini bukan batas konsumsi aktual yang dijamin.',
      ])
    )
  );

  body.appendChild(
    section(
      'Rumus perhitungan',
      p('Semua daya dinormalisasi ke watt, energi dihitung dalam kWh, dan biaya dalam rupiah. Dengan P = daya satu perangkat (W), N = jumlah unit, H = jam pemakaian pada hari operasi, D = jumlah hari operasi, dan T = tarif (Rp/kWh):'),
      code(
        [
          'totalPowerW   = P × N',
          'totalPowerKW  = totalPowerW ÷ 1000',
          'kWh per jam   = totalPowerW ÷ 1000',
          'kWh per hari  = (P × N × H) ÷ 1000',
          'kWh periode   = (P × N × H × D) ÷ 1000',
          'biaya periode = kWh periode × T',
          'biaya per jam = (P × N ÷ 1000) × T',
        ].join('\n')
      ),
      p('Default hari kalender: minggu = 7 hari, bulan = 30 hari, tahun = 365 hari. Jika perangkat hanya dipakai pada hari tertentu (misalnya 5 hari/minggu), hari operasi bulan dan tahun dihitung mengikuti jadwal tersebut, bukan selalu dikali 30 atau 365. Nilai perantara tidak dibulatkan; pembulatan hanya terjadi saat tampilan.'),
      p(
        `Contoh: perangkat 650 W dipakai 10 jam/hari selama 30 hari dengan tarif ${tariff.toLocaleString('id-ID')} Rp/kWh menghasilkan 195 kWh per bulan.`
      )
    )
  );

  body.appendChild(
    section(
      'Durasi fleksibel',
      p('Durasi bisa diisi bebas: 15 menit, 30 menit, 2,5 jam, 8 jam, hingga 24 jam per hari. Tombol preset durasi hanya memudahkan — Anda tetap bisa mengetik nilai sendiri, termasuk menit tambahan. Validasi menolak nilai negatif dan total lebih dari 24 jam per hari.'),
      p('Perangkat yang hanya dipakai sekali sehari (rice cooker 45 menit, setrika 20 menit) cukup diisi lewat menit tambahan. Perangkat yang tersambung ke stopkontak tidak otomatis dianggap menyala 24 jam.')
    )
  );

  body.appendChild(
    section(
      'Tarif listrik',
      list([
        `Tarif default ${tariff.toLocaleString('id-ID')} Rp/kWh hanyalah nilai contoh yang dapat diubah, bukan klaim tarif PLN terbaru.`,
        'Anda bisa memakai tarif default tersimpan atau mengisi tarif khusus untuk perhitungan tertentu.',
        'Yang dihitung adalah biaya konsumsi energi perangkat. Pajak, PPJ, biaya administrasi, biaya tetap, dan komponen tagihan lain tidak ditambahkan secara diam-diam.',
        'Periksa tarif resmi terbaru pada situs atau kantor PLN bila angka ini dipakai untuk keputusan penting.',
      ])
    )
  );

  body.appendChild(
    section(
      'Struk (receipt) dan ekspor PNG',
      list([
        'Setiap perhitungan otomatis menghasilkan pratinjau struk yang mengikuti hasil kalkulasi terkini.',
        'Mode Ringkas menampilkan inti perhitungan; mode Detail menambah formula, asumsi, rentang daya, catatan pengguna, dan biaya per unit.',
        'Tombol "Ekspor PNG" menghasilkan file gambar nyata hanya dari elemen struk, dengan latar putih dan resolusi 2× agar angka tetap tajam.',
        'Nama file mengikuti pola PLNCalc-Nama-Perangkat-TANGGAL.png.',
        'Di ponsel, ekspor dapat membuka share sheet bawaan; bila tidak tersedia, file langsung diunduh.',
        'Tombol "Cetak" memakai tata letak cetak khusus yang hanya menampilkan struk.',
      ])
    )
  );

  body.appendChild(
    section(
      'Multi-perangkat',
      p('Halaman Multi-Perangkat menghitung banyak perangkat sekaligus: tambah, edit, hapus, duplikat, ubah jumlah unit, dan ubah jadwal tiap perangkat. Anda dapat memakai tarif global atau tarif berbeda per perangkat. Total energi, biaya harian/bulanan/tahunan, kontribusi biaya, dan persentase tiap perangkat ditampilkan, dilengkapi struk gabungan yang bisa diekspor ke PNG. Perangkat diurutkan berdasarkan biaya terbesar, terkecil, atau nama.')
    )
  );

  body.appendChild(
    section(
      'Simulasi penghematan',
      p('Panel Simulasi Penghematan di halaman Kalkulator membandingkan skenario awal dengan skenario baru: mengurangi jam pemakaian, menurunkan daya (misalnya lampu 20 W menjadi 10 W), mengubah jumlah unit, atau membandingkan dua tarif. Selisih biaya, potensi penghematan bulanan dan tahunan, serta persentase perubahan ditampilkan. Jika hasilnya negatif, PLNCalc menyatakan bahwa biaya justru meningkat.'),
      code('savings            = biayaAwal − biayaBaru\nsavingsPercentage  = biayaAwal > 0 ? (savings ÷ biayaAwal) × 100 : 0')
    )
  );

  body.appendChild(
    section(
      'Riwayat dan data lokal',
      list([
        'Riwayat disimpan di LocalStorage browser ini dan tetap ada setelah browser ditutup.',
        'Setiap catatan menyimpan identitas perangkat, daya, metode, jumlah unit, durasi, hari operasi, tarif, energi, biaya, catatan, asumsi, dan versi skema data.',
        'Anda bisa membuka, menghitung ulang, mengedit, menduplikasi, menghapus, mencari, memfilter kategori, mengurutkan, serta mengekspor JSON atau CSV.',
        'Data tidak tersinkron antarperangkat atau antarbrowser. Gunakan Ekspor JSON sebagai cadangan.',
        'Data rusak atau kuota penyimpanan penuh ditangani dengan pesan kesalahan berbahasa Indonesia, bukan kegagalan senyap.',
      ])
    )
  );

  body.appendChild(
    section(
      'Batasan estimasi',
      p('Model dasar PLNCalc adalah estimasi dari daya dikali waktu. Konsumsi nyata bisa berbeda karena karakteristik perangkat:'),
      list([
        'Kulkas dan freezer memakai kompresor yang hidup-mati, sehingga daya rata-rata jauh lebih rendah dari daya label.',
        'AC inverter menurunkan daya saat suhu ruangan mendekati target.',
        'Rice cooker punya mode memasak (daya tinggi) dan menghangatkan (daya rendah).',
        'PC dan server berubah konsumsinya mengikuti beban CPU/GPU.',
        'Mesin cuci memiliki siklus berbeda (cuci, bilas, spin, pemanas air).',
        'Motor listrik punya arus awal yang lebih besar dan faktor daya yang memengaruhi konsumsi nyata.',
      ]),
      p('Untuk hasil yang lebih mendekati kenyataan, gunakan daya rata-rata atau hasil pengukuran alat ukur Anda. Angka yang ditampilkan PLNCalc adalah estimasi, bukan pengukuran aktual.')
    )
  );

  body.appendChild(
    section(
      'Mode offline (PWA)',
      p('PLNCalc dapat dipasang sebagai aplikasi web dan dipakai tanpa internet. Perhitungan, struk, riwayat, dan preset berjalan sepenuhnya di perangkat Anda; tidak ada backend, akun wajib, atau API eksternal yang dibutuhkan untuk kalkulasi. Setelah pembaruan versi terpasang, aplikasi akan menawarkan muat ulang agar tidak tertinggal pada cache lama.')
    )
  );

  const note = el('div', { class: 'info-bar' });
  note.append(iconEl('info', { size: 16 }), el('span', { text: 'Butuh bantuan cepat? Buka halaman Kalkulator dan isi nama serta daya perangkat — hasil muncul otomatis.' }));
  page.appendChild(note);
  page.appendChild(body);
  container.appendChild(page);
  return () => {};
}
