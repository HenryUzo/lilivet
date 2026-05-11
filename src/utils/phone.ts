const NON_DIGIT_REGEX = /\D+/g;

export function normalizePhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(NON_DIGIT_REGEX, "");

  if (digits.length === 10) {
    return `1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits;
  }

  return digits;
}
