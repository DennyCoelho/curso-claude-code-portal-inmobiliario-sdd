export function formatContactMobile(raw: string, selectionStart = raw.length) {
  const countryDigits = /^\s*\+55/.test(raw) ? 2 : 0;
  const digits = raw.replace(/\D/g, "").slice(countryDigits, countryDigits + 11);
  const digitPosition = Math.max(0, Math.min(digits.length, raw.slice(0, selectionStart).replace(/\D/g, "").length - countryDigits));
  let value = "";
  if (digits.length) value = `(${digits.slice(0, 2)}`;
  if (digits.length > 2) value += `) ${digits.slice(2, 7)}`;
  if (digits.length > 7) value += `-${digits.slice(7)}`;

  let caret = 0;
  let consumed = 0;
  while (caret < value.length && consumed < digitPosition) {
    if (/\d/.test(value[caret])) consumed++;
    caret++;
  }
  return { value, caret };
}
