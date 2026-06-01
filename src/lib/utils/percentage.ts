export function toPercentValue(value: number) {
  return value * 100;
}

export function fromPercentValue(value: number) {
  return value / 100;
}

export function formatPercent(value: number, fractionDigits = 1) {
  return `${toPercentValue(value).toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}%`;
}

export function formatPoint(value: number, fractionDigits = 1) {
  return `${toPercentValue(value).toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}%p`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
