export function required(value: string, field: string): string | null {
  return value.trim() ? null : `${field} is required.`;
}

export function minLength(value: string, n: number, field: string): string | null {
  return value.length >= n ? null : `${field} must be at least ${n} characters.`;
}

export function email(value: string): string | null {
  return /\S+@\S+\.\S+/.test(value) ? null : "Enter a valid email address.";
}

export function validate(validators: Array<() => string | null>): string | null {
  for (const run of validators) {
    const result = run();
    if (result) return result;
  }
  return null;
}
