const PLACEHOLDER_WORDS = ["demo", "sample", "dummy", "lorem", "placeholder"];

const PLACEHOLDER_NAMES = new Set([
  "john doe",
  "jane smith",
  "test user",
  "demo user",
  "admin user",
  "your name",
  "full name",
]);

const DISPOSABLE_EMAIL_DOMAINS = [
  "example.com",
  "test.com",
  "mailinator.com",
  "tempmail.com",
  "yopmail.com",
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function hasPlaceholderWord(value: string) {
  const lowered = normalize(value);
  return PLACEHOLDER_WORDS.some((word) => new RegExp(`\\b${word}\\b`, "i").test(lowered));
}

export function validateRealisticUser(name?: string | null, email?: string | null): string | null {
  if (name) {
    const n = normalize(name);
    if (PLACEHOLDER_NAMES.has(n) || hasPlaceholderWord(n)) {
      return "Please use your real full name.";
    }
  }

  if (email) {
    const e = normalize(email);
    const [, domain = ""] = e.split("@");
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      return "Please use a real business or personal email address.";
    }
  }

  return null;
}

export function validateRealisticShop(input: {
  name: string;
  description?: string | null;
  email?: string | null;
}): string | null {
  if (hasPlaceholderWord(input.name)) {
    return "Shop name looks like placeholder text. Please use your real shop name.";
  }

  if (input.description && hasPlaceholderWord(input.description)) {
    return "Shop description looks like placeholder text. Please provide real details.";
  }

  if (input.email) {
    const emailIssue = validateRealisticUser(undefined, input.email);
    if (emailIssue) return emailIssue;
  }

  return null;
}

export function validateRealisticProduct(input: {
  name: string;
  description: string;
  tags?: string[];
}): string | null {
  if (hasPlaceholderWord(input.name)) {
    return "Product name looks like placeholder text. Please use a real product name.";
  }

  if (hasPlaceholderWord(input.description)) {
    return "Product description looks like placeholder text. Please provide real details.";
  }

  if (input.tags?.some((tag) => hasPlaceholderWord(tag))) {
    return "Tags contain placeholder text. Please use real product tags.";
  }

  return null;
}
