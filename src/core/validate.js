const MAX_VALUE = 1e15;

function asNumber(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return { empty: true, value: NaN };
    const lastDot = trimmed.lastIndexOf('.');
    const lastComma = trimmed.lastIndexOf(',');
    if (lastComma > lastDot) {
      return { empty: false, value: Number(trimmed.replace(/\./g, '').replace(/,/g, '.')) };
    }
    return { empty: false, value: Number(trimmed.replace(/,/g, '')) };
  }
  return { empty: value == null, value: Number(value) };
}

export function parseLocaleNumber(value) {
  return asNumber(value).value;
}

function checkNumber(errors, field, label, raw, { min = -Infinity, max = Infinity, integer = false, required = true } = {}) {
  const { empty, value } = asNumber(raw);
  if (empty) {
    if (required) errors[field] = `${label} wajib diisi.`;
    return null;
  }
  if (!Number.isFinite(value)) {
    errors[field] = `${label} harus berupa angka.`;
    return null;
  }
  if (Math.abs(value) > MAX_VALUE) {
    errors[field] = `${label} terlalu besar.`;
    return null;
  }
  if (integer && !Number.isInteger(value)) {
    errors[field] = `${label} harus bilangan bulat.`;
    return null;
  }
  if (value < min) {
    errors[field] =
      min === 0
        ? value < 0
          ? `${label} tidak boleh negatif.`
          : `${label} harus lebih besar dari nol.`
        : `${label} minimal ${min}.`;
    return null;
  }
  if (value > max) {
    errors[field] = `${label} maksimal ${max}.`;
    return null;
  }
  return value;
}

export function validateDeviceInput(raw) {
  const errors = {};
  const values = {};

  const name = String(raw.name ?? '').trim();
  if (!name) errors.name = 'Nama perangkat wajib diisi.';
  values.name = name;

  values.category = String(raw.category ?? 'Kustom');
  values.brand = String(raw.brand ?? '').trim();
  values.model = String(raw.model ?? '').trim();
  values.notes = String(raw.notes ?? '').trim();

  const quantity = checkNumber(errors, 'quantity', 'Jumlah unit', raw.quantity, {
    min: 1,
    integer: true,
  });
  if (quantity != null) values.quantity = quantity;

  values.powerUnit = raw.powerUnit === 'kW' ? 'kW' : 'W';
  values.powerMethod = ['nominal', 'average', 'measured'].includes(raw.powerMethod)
    ? raw.powerMethod
    : 'nominal';
  values.calcMode = ['constant', 'average', 'range'].includes(raw.calcMode) ? raw.calcMode : 'constant';

  if (values.calcMode === 'range') {
    const min = checkNumber(errors, 'powerMin', 'Daya minimum', raw.powerMin, { min: 0 });
    const max = checkNumber(errors, 'powerMax', 'Daya maksimum', raw.powerMax, { min: 0 });
    if (min != null && max != null && min > max) {
      errors.powerMin = 'Daya minimum tidak boleh melebihi daya maksimum.';
    }
    if (min != null) values.powerMin = min;
    if (max != null) values.powerMax = max;
    values.powerValue = 0;
  } else {
    const power = checkNumber(errors, 'powerValue', 'Nilai daya', raw.powerValue, { min: 0 });
    if (power != null) values.powerValue = power;
    values.powerMin = null;
    values.powerMax = null;
  }

  const hours = checkNumber(errors, 'hoursPerDay', 'Jam penggunaan per hari', raw.hoursPerDay, {
    min: 0,
    max: 24,
    required: false,
  });
  const minutes = checkNumber(errors, 'extraMinutes', 'Menit tambahan', raw.extraMinutes, {
    min: 0,
    max: 59,
    required: false,
  });
  if (hours != null) values.hoursPerDay = hours;
  else if (!errors.hoursPerDay) values.hoursPerDay = 0;
  if (minutes != null) values.extraMinutes = minutes;
  else if (!errors.extraMinutes) values.extraMinutes = 0;

  const totalHours = (values.hoursPerDay ?? 0) + (values.extraMinutes ?? 0) / 60;
  if (totalHours > 24) {
    errors.hoursPerDay = 'Total durasi tidak boleh melebihi 24 jam per hari.';
  }

  const daysPerWeek = checkNumber(errors, 'daysPerWeek', 'Hari penggunaan per minggu', raw.daysPerWeek, {
    min: 0,
    max: 7,
    integer: true,
    required: false,
  });
  const daysPerMonth = checkNumber(errors, 'daysPerMonth', 'Hari penggunaan per bulan', raw.daysPerMonth, {
    min: 0,
    max: 31,
    integer: true,
    required: false,
  });
  const daysPerYear = checkNumber(errors, 'daysPerYear', 'Hari penggunaan per tahun', raw.daysPerYear, {
    min: 0,
    max: 366,
    integer: true,
    required: false,
  });
  values.daysPerWeek = daysPerWeek ?? 7;
  values.daysPerMonth = daysPerMonth ?? null;
  values.daysPerYear = daysPerYear ?? null;

  const tariff = checkNumber(errors, 'tariff', 'Tarif listrik per kWh', raw.tariff, { min: 0 });
  if (tariff != null) values.tariff = tariff;
  values.tariffName = String(raw.tariffName ?? '').trim();

  return { valid: Object.keys(errors).length === 0, errors, values };
}

export function firstError(errors) {
  const first = Object.values(errors)[0];
  return first ?? null;
}
