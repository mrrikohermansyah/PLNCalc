import { describe, it, expect } from 'vitest';
import {
  calculateDevice,
  calculateMulti,
  calculateSavings,
  normalizePowerW,
  resolveDays,
  EngineError,
} from '../src/core/engine.js';

function baseInput(overrides = {}) {
  return {
    name: 'Lampu LED',
    category: 'Penerangan',
    quantity: 1,
    powerValue: 100,
    powerUnit: 'W',
    powerMethod: 'nominal',
    calcMode: 'constant',
    hoursPerDay: 1,
    extraMinutes: 0,
    daysPerWeek: 7,
    tariff: 1000,
    ...overrides,
  };
}

describe('mesin perhitungan', () => {
  it('kasus 1: 1.000 W selama 1 jam = 1 kWh', () => {
    const r = calculateDevice(baseInput({ powerValue: 1000, hoursPerDay: 1 }));
    expect(r.energy.perHour).toBe(1);
    expect(r.energy.perDay).toBe(1);
  });

  it('kasus 2: 100 W × 2 unit × 5 jam = 1 kWh per hari operasi', () => {
    const r = calculateDevice(baseInput({ powerValue: 100, quantity: 2, hoursPerDay: 5 }));
    expect(r.energy.perDay).toBe(1);
    expect(r.power.totalW).toBe(200);
  });

  it('kasus 3: 650 W × 10 jam × 30 hari = 195 kWh per bulan', () => {
    const r = calculateDevice(baseInput({ powerValue: 650, hoursPerDay: 10 }));
    expect(r.energy.perMonth).toBe(195);
  });

  it('kasus 4: mengubah tarif hanya mengubah biaya, bukan energi', () => {
    const a = calculateDevice(baseInput({ tariff: 1000 }));
    const b = calculateDevice(baseInput({ tariff: 2000 }));
    expect(b.energy).toEqual(a.energy);
    expect(b.cost.perMonth).toBe(a.cost.perMonth * 2);
  });

  it('kasus 5: mengubah jumlah unit mengubah total energi proporsional', () => {
    const a = calculateDevice(baseInput({ quantity: 1 }));
    const b = calculateDevice(baseInput({ quantity: 3 }));
    expect(b.energy.perMonth).toBeCloseTo(a.energy.perMonth * 3, 10);
    expect(b.power.totalW).toBe(a.power.totalW * 3);
  });

  it('kasus 6: nilai negatif ditolak', () => {
    expect(() => calculateDevice(baseInput({ powerValue: -5 }))).toThrow(EngineError);
    expect(() => calculateDevice(baseInput({ tariff: -1 }))).toThrow(EngineError);
    expect(() => calculateDevice(baseInput({ quantity: 0 }))).toThrow(EngineError);
    expect(() => calculateDevice(baseInput({ quantity: 1.5 }))).toThrow(EngineError);
  });

  it('kasus 7: penggunaan 24 jam dihitung dengan benar', () => {
    const r = calculateDevice(baseInput({ powerValue: 100, hoursPerDay: 24 }));
    expect(r.energy.perDay).toBeCloseTo(2.4, 10);
    expect(r.schedule.hoursPerDay).toBe(24);
  });

  it('kasus 8: pecahan jam didukung (2,5 jam dan menit tambahan)', () => {
    const a = calculateDevice(baseInput({ powerValue: 1000, hoursPerDay: 2.5 }));
    expect(a.energy.perDay).toBeCloseTo(2.5, 10);
    const b = calculateDevice(baseInput({ powerValue: 1000, hoursPerDay: 0, extraMinutes: 45 }));
    expect(b.schedule.hoursPerDay).toBeCloseTo(0.75, 10);
    expect(b.energy.perDay).toBeCloseTo(0.75, 10);
  });

  it('kasus 9: konversi kW ke W benar', () => {
    expect(normalizePowerW(1.5, 'kW')).toBe(1500);
    expect(normalizePowerW(900, 'W')).toBe(900);
    const r = calculateDevice(baseInput({ powerValue: 2, powerUnit: 'kW', hoursPerDay: 1 }));
    expect(r.power.totalW).toBe(2000);
  });

  it('kasus 10: daya nol menghasilkan biaya nol', () => {
    const r = calculateDevice(baseInput({ powerValue: 0 }));
    expect(r.cost.perMonth).toBe(0);
    expect(r.energy.perYear).toBe(0);
  });

  it('kasus 11: tidak membulatkan angka perantara', () => {
    const r = calculateDevice(baseInput({ powerValue: 1, hoursPerDay: 1, tariff: 1444.7 }));
    expect(r.energy.perMonth).toBeCloseTo(0.001 * 30, 10);
    expect(Number.isInteger(r.cost.perMonth)).toBe(false);
    expect(r.cost.perMonth).toBeCloseTo(r.energy.perMonth * 1444.7, 6);
  });

  it('kasus 12: jadwal mingguan, bulanan, tahunan konsisten', () => {
    const r = calculateDevice(baseInput({ powerValue: 100, hoursPerDay: 1, daysPerWeek: 7 }));
    expect(r.schedule.daysPerMonth).toBe(30);
    expect(r.schedule.daysPerYear).toBe(365);
    expect(r.energy.perYear).toBeCloseTo((r.energy.perWeek * 365) / 7, 6);

    const part = calculateDevice(baseInput({ powerValue: 100, hoursPerDay: 1, daysPerWeek: 5 }));
    expect(part.schedule.daysPerMonth).toBe(21);
    expect(part.schedule.daysPerYear).toBe(261);
  });

  it('jadwal eksplisit bulan/tahun dipakai apa adanya', () => {
    const r = calculateDevice(
      baseInput({ powerValue: 100, hoursPerDay: 1, daysPerWeek: 2, daysPerMonth: 20, daysPerYear: 250 })
    );
    expect(r.schedule.daysPerMonth).toBe(20);
    expect(r.schedule.daysPerYear).toBe(250);
    expect(r.energy.perYear).toBeCloseTo(0.1 * 250, 10);
  });

  it('rentang min–maks menghasilkan rentang biaya', () => {
    const r = calculateDevice(
      baseInput({ calcMode: 'range', powerMin: 100, powerMax: 300, hoursPerDay: 1 })
    );
    expect(r.power.isRange).toBe(true);
    expect(r.costRange.min.perMonth).toBeCloseTo(0.1 * 30 * 1000, 6);
    expect(r.costRange.max.perMonth).toBeCloseTo(0.3 * 30 * 1000, 6);
    expect(r.costRange.max.perMonth).toBeGreaterThan(r.costRange.min.perMonth);
    expect(r.assumptions.join(' ')).toContain('rentang estimasi');
  });

  it('durasi di atas 24 jam ditolak', () => {
    expect(() => calculateDevice(baseInput({ hoursPerDay: 25 }))).toThrow(EngineError);
    expect(() => calculateDevice(baseInput({ hoursPerDay: 24, extraMinutes: 1 }))).toThrow(EngineError);
  });

  it('biaya per unit = total ÷ jumlah unit, unit hanya dikali sekali', () => {
    const r = calculateDevice(baseInput({ powerValue: 100, quantity: 4, hoursPerDay: 5 }));
    expect(r.power.totalW).toBe(400);
    expect(r.perUnitCost.perMonth * 4).toBeCloseTo(r.cost.perMonth, 6);
    expect(r.energy.perDay).toBeCloseTo(2, 10);
  });

  it('kWh per jam = total daya ÷ 1000', () => {
    const r = calculateDevice(baseInput({ powerValue: 350, quantity: 2 }));
    expect(r.energy.perHour).toBe(0.7);
    expect(r.cost.perHour).toBeCloseTo(0.7 * 1000, 10);
  });

  it('resolveDays default 7/30/365', () => {
    expect(resolveDays({})).toEqual({ daysPerWeek: 7, daysPerMonth: 30, daysPerYear: 365 });
  });
});

describe('kalkulator multi-perangkat', () => {
  it('kasus 16: total multi-perangkat benar', () => {
    const devices = [
      baseInput({ name: 'AC', powerValue: 650, hoursPerDay: 10 }),
      baseInput({ name: 'Laptop', powerValue: 65, hoursPerDay: 8 }),
      baseInput({ name: 'Router', powerValue: 12, hoursPerDay: 24 }),
    ];
    const multi = calculateMulti(devices);
    expect(multi.results).toHaveLength(3);
    expect(multi.totalEnergy.perMonth).toBeCloseTo(
      multi.results.reduce((sum, r) => sum + r.energy.perMonth, 0),
      6
    );
    expect(multi.totalCost.perMonth).toBeCloseTo(
      multi.results.reduce((sum, r) => sum + r.cost.perMonth, 0),
      6
    );
    const acShare = multi.contribution.find((c) => c.name === 'AC');
    expect(acShare.percentage).toBeGreaterThan(50);
    const totalPct = multi.contribution.reduce((s, c) => s + c.percentage, 0);
    expect(totalPct).toBeCloseTo(100, 6);
  });

  it('tarif global dipakai saat perangkat tidak punya tarif sendiri', () => {
    const d = baseInput({ name: 'TV', tariff: undefined });
    const multi = calculateMulti([d], { globalTariff: 2500 });
    expect(multi.results[0].tariff).toBe(2500);
    expect(multi.mixedTariffs).toBe(false);
  });

  it('tarif per perangkat berbeda dihormati dan ditandai', () => {
    const multi = calculateMulti([
      baseInput({ name: 'A', tariff: 1000 }),
      baseInput({ name: 'B', tariff: 2000 }),
    ]);
    expect(multi.mixedTariffs).toBe(true);
    expect(multi.assumptions[0]).toContain('tarif berbeda');
  });

  it('daftar kosong ditolak', () => {
    expect(() => calculateMulti([])).toThrow(EngineError);
  });
});

describe('simulasi penghematan', () => {
  it('kasus 17: selisih penghematan benar', () => {
    const current = calculateDevice(baseInput({ name: 'PC', powerValue: 300, hoursPerDay: 10 }));
    const next = calculateDevice(baseInput({ name: 'PC', powerValue: 300, hoursPerDay: 6 }));
    const s = calculateSavings(current, next);
    expect(s.savingsMonthly).toBeCloseTo(current.cost.perMonth - next.cost.perMonth, 6);
    expect(s.savingsYearly).toBeCloseTo(s.savingsMonthly * 12, 6);
    expect(s.percentage).toBeCloseTo(40, 6);
    expect(s.increased).toBe(false);
  });

  it('biaya naik ditandai sebagai increased', () => {
    const current = calculateDevice(baseInput({ powerValue: 100, hoursPerDay: 4 }));
    const next = calculateDevice(baseInput({ powerValue: 200, hoursPerDay: 4 }));
    const s = calculateSavings(current, next);
    expect(s.increased).toBe(true);
    expect(s.savingsMonthly).toBeLessThan(0);
    expect(s.percentage).toBeLessThan(0);
  });

  it('input tidak valid ditolak', () => {
    expect(() => calculateSavings(null, {})).toThrow(EngineError);
  });
});
