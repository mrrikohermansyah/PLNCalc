import { POWER_METHODS, CALC_MODES, RECEIPT_DISCLAIMER } from './constants.js';

const MAX_SAFE_INPUT = 1e15;

export class EngineError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'EngineError';
    this.field = field;
  }
}

export function normalizePowerW(powerValue, powerUnit) {
  const value = Number(powerValue);
  if (!Number.isFinite(value)) throw new EngineError('Nilai daya tidak valid.', 'powerValue');
  if (value < 0) throw new EngineError('Daya tidak boleh negatif.', 'powerValue');
  if (value > MAX_SAFE_INPUT) throw new EngineError('Nilai daya terlalu besar.', 'powerValue');
  return powerUnit === 'kW' ? value * 1000 : value;
}

export function effectiveHoursPerDay(hoursPerDay, extraMinutes = 0) {
  const h = Number(hoursPerDay) || 0;
  const m = Number(extraMinutes) || 0;
  return h + m / 60;
}

export function resolveDays({ daysPerWeek, daysPerMonth, daysPerYear } = {}) {
  const week = daysPerWeek == null || daysPerWeek === '' ? 7 : Number(daysPerWeek);
  const month =
    daysPerMonth == null || daysPerMonth === '' ? Math.round((week * 30) / 7) : Number(daysPerMonth);
  const year =
    daysPerYear == null || daysPerYear === '' ? Math.round((week * 365) / 7) : Number(daysPerYear);
  return { daysPerWeek: week, daysPerMonth: month, daysPerYear: year };
}

function computePeriods(totalPowerW, hoursPerDay, days, tariff) {
  const perHour = totalPowerW / 1000;
  const perDay = (totalPowerW * hoursPerDay) / 1000;
  const energy = {
    perHour,
    perDay,
    perWeek: perDay * days.daysPerWeek,
    perMonth: perDay * days.daysPerMonth,
    perYear: perDay * days.daysPerYear,
  };
  const cost = {
    perHour: perHour * tariff,
    perDay: perDay * tariff,
    perWeek: energy.perWeek * tariff,
    perMonth: energy.perMonth * tariff,
    perYear: energy.perYear * tariff,
  };
  return { energy, cost };
}

function buildAssumptions(input, qty, isRange) {
  const notes = [];
  const method = POWER_METHODS[input.powerMethod];
  if (input.powerMethod === 'nominal') {
    notes.push('Daya memakai nilai nominal pada label/datasheet perangkat.');
  } else if (input.powerMethod === 'average') {
    notes.push(
      'Daya memakai estimasi rata-rata yang dimasukkan pengguna; cocok untuk perangkat dengan konsumsi berubah-ubah.'
    );
  } else if (input.powerMethod === 'measured') {
    notes.push(
      'Daya memakai hasil pengukuran pengguna (wattmeter/smart plug/power meter). Aplikasi tidak mengukur listrik secara langsung.'
    );
  }
  if (method) notes[notes.length - 1] = `${method.label}. ${notes[notes.length - 1]}`;
  if (isRange) {
    notes.push(
      'Hasil berupa rentang estimasi dari skenario daya minimum dan maksimum, bukan batas konsumsi aktual yang dijamin.'
    );
  }
  if (qty > 1) notes.push(`Total memperhitungkan ${qty} unit perangkat.`);
  return notes;
}

export function calculateDevice(input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new EngineError('Nama perangkat wajib diisi.', 'name');

  const qty = Number(input.quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new EngineError('Jumlah unit harus bilangan bulat positif.', 'quantity');
  }

  const tariff = Number(input.tariff);
  if (!Number.isFinite(tariff) || tariff < 0) {
    throw new EngineError('Tarif tidak boleh negatif.', 'tariff');
  }
  if (tariff > MAX_SAFE_INPUT) throw new EngineError('Nilai tarif terlalu besar.', 'tariff');

  const hours = effectiveHoursPerDay(input.hoursPerDay ?? 0, input.extraMinutes ?? 0);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new EngineError('Durasi penggunaan tidak valid.', 'hoursPerDay');
  }
  if (hours > 24) {
    throw new EngineError('Total durasi tidak boleh melebihi 24 jam per hari.', 'hoursPerDay');
  }

  const days = resolveDays(input);
  for (const [key, value, max] of [
    ['daysPerWeek', days.daysPerWeek, 7],
    ['daysPerMonth', days.daysPerMonth, 31],
    ['daysPerYear', days.daysPerYear, 366],
  ]) {
    if (!Number.isFinite(value) || value < 0 || value > max) {
      throw new EngineError(`Nilai hari operasi tidak masuk akal (0–${max}).`, key);
    }
  }

  const calcMode = input.calcMode ?? 'constant';
  const isRange = calcMode === 'range';

  let powerPerUnitW;
  let rangeW = null;
  if (isRange) {
    const minW = normalizePowerW(input.powerMin ?? 0, input.powerUnit);
    const maxW = normalizePowerW(input.powerMax ?? 0, input.powerUnit);
    if (minW > maxW) {
      throw new EngineError('Daya minimum tidak boleh lebih besar dari daya maksimum.', 'powerMin');
    }
    rangeW = { min: minW, max: maxW };
    powerPerUnitW = (minW + maxW) / 2;
  } else {
    powerPerUnitW = normalizePowerW(input.powerValue ?? 0, input.powerUnit);
  }

  const totalPowerW = powerPerUnitW * qty;
  const base = computePeriods(totalPowerW, hours, days, tariff);

  const result = {
    input: {
      name,
      category: input.category ?? 'Kustom',
      brand: String(input.brand ?? '').trim(),
      model: String(input.model ?? '').trim(),
      notes: String(input.notes ?? '').trim(),
      quantity: qty,
      powerValue: Number(input.powerValue ?? 0),
      powerUnit: input.powerUnit === 'kW' ? 'kW' : 'W',
      powerMethod: input.powerMethod ?? 'nominal',
      calcMode,
      powerMin: isRange ? Number(input.powerMin ?? 0) : null,
      powerMax: isRange ? Number(input.powerMax ?? 0) : null,
      hoursPerDay: Number(input.hoursPerDay ?? 0),
      extraMinutes: Number(input.extraMinutes ?? 0),
      daysPerWeek: days.daysPerWeek,
      daysPerMonth: input.daysPerMonth === '' || input.daysPerMonth == null ? null : Number(input.daysPerMonth),
      daysPerYear: input.daysPerYear === '' || input.daysPerYear == null ? null : Number(input.daysPerYear),
      tariff,
      tariffName: String(input.tariffName ?? '').trim(),
    },
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    reportNumber: input.reportNumber ?? null,
    power: {
      perUnitW: powerPerUnitW,
      totalW: totalPowerW,
      totalKW: totalPowerW / 1000,
      method: input.powerMethod ?? 'nominal',
      calcMode,
      isRange,
      rangeW,
    },
    schedule: { hoursPerDay: hours, ...days },
    tariff,
    energy: base.energy,
    cost: base.cost,
    perUnitCost: Object.fromEntries(
      Object.entries(base.cost).map(([k, v]) => [k, qty > 0 ? v / qty : 0])
    ),
    assumptions: buildAssumptions(input, qty, isRange),
  };

  if (isRange) {
    const minRes = computePeriods(rangeW.min * qty, hours, days, tariff);
    const maxRes = computePeriods(rangeW.max * qty, hours, days, tariff);
    result.energyRange = { min: minRes.energy, max: maxRes.energy };
    result.costRange = { min: minRes.cost, max: maxRes.cost };
  }

  return result;
}

export function calculateMulti(devices, { globalTariff } = {}) {
  if (!Array.isArray(devices) || devices.length === 0) {
    throw new EngineError('Daftar perangkat kosong.');
  }
  const results = devices.map((device) => {
    const tariff = device.tariff != null && device.tariff !== '' ? Number(device.tariff) : Number(globalTariff);
    return calculateDevice({ ...device, tariff });
  });

  const sumPeriods = (key) => {
    const totals = { perHour: 0, perDay: 0, perWeek: 0, perMonth: 0, perYear: 0 };
    for (const r of results) {
      for (const period of Object.keys(totals)) totals[period] += r[key][period];
    }
    return totals;
  };

  const totalEnergy = sumPeriods('energy');
  const totalCost = sumPeriods('cost');
  const monthTotal = totalCost.perMonth;

  const contribution = results.map((r) => {
    const share = monthTotal > 0 ? r.cost.perMonth / monthTotal : 0;
    return {
      name: r.input.name,
      quantity: r.input.quantity,
      costPerMonth: r.cost.perMonth,
      energyPerMonth: r.energy.perMonth,
      share,
      percentage: share * 100,
    };
  });

  const mixedTariffs = new Set(results.map((r) => r.tariff)).size > 1;
  const assumptions = mixedTariffs
    ? ['Total gabungan memakai tarif berbeda per perangkat sesuai pengaturan masing-masing.']
    : globalTariff != null
      ? ['Total gabungan memakai tarif global untuk seluruh perangkat.']
      : [];

  return { results, totalEnergy, totalCost, contribution, mixedTariffs, assumptions };
}

export function calculateSavings(currentResult, newResult) {
  const currentMonthly = currentResult?.cost?.perMonth;
  const newMonthly = newResult?.cost?.perMonth;
  if (!Number.isFinite(currentMonthly) || !Number.isFinite(newMonthly)) {
    throw new EngineError('Data skenario tidak valid untuk simulasi penghematan.');
  }
  const savingsMonthly = currentMonthly - newMonthly;
  const percentage =
    currentMonthly > 0 ? (savingsMonthly / currentMonthly) * 100 : newMonthly > 0 ? -100 : 0;
  return {
    currentMonthly,
    newMonthly,
    savingsMonthly,
    savingsYearly: savingsMonthly * 12,
    percentage,
    increased: savingsMonthly < 0,
  };
}

export function buildFormulas(result) {
  const { input, power, schedule, tariff } = result;
  const p = power.perUnitW;
  const n = input.quantity;
  const h = schedule.hoursPerDay;
  const lines = [
    `Total daya = P × N = ${p} W × ${n} = ${power.totalW} W`,
    `Energi/hari = (P × N × H) ÷ 1000 = (${p} × ${n} × ${h}) ÷ 1000 = ${result.energy.perDay} kWh`,
    `Biaya/bulan = kWh × T = ${result.energy.perMonth} × ${tariff} = ${result.cost.perMonth}`,
    `Biaya/tahun = kWh × T = ${result.energy.perYear} × ${tariff} = ${result.cost.perYear}`,
  ];
  return lines;
}

export { POWER_METHODS, CALC_MODES, RECEIPT_DISCLAIMER };
