export function parseDurationToMillis(input: string): number {
  const regex: RegExp = /^(\d+)([smhdw])$/; // supports seconds, minutes, hours, days, weeks
  const match: RegExpMatchArray | null = input.match(regex);

  if (!match) {
    throw new Error(`Invalid duration format: ${input}`);
  }

  const value: number = parseInt(match[1]!, 10); // Use non-null assertion
  const unit: string = match[2] || ''; // Provide a fallback value

  let multiplier: number;
  switch (unit) {
    case 's': // seconds
      multiplier = 1000;
      break;
    case 'm': // minutes
      multiplier = 1000 * 60;
      break;
    case 'h': // hours
      multiplier = 1000 * 60 * 60;
      break;
    case 'd': // days
      multiplier = 1000 * 60 * 60 * 24;
      break;
    case 'w': // weeks
      multiplier = 1000 * 60 * 60 * 24 * 7;
      break;
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }

  const offsetMillis: number = value * multiplier;
  return Date.now() + offsetMillis;
}

export function parseDurationToSeconds(input: string): number {
  const regex: RegExp = /^(\d+)([smhdw])$/; // supports seconds, minutes, hours, days, weeks
  const match: RegExpMatchArray | null = input.match(regex);

  if (!match) {
    throw new Error(`Invalid duration format: ${input}`);
  }

  const value: number = parseInt(match[1]!, 10);
  const unit: string = match[2] || '';

  let multiplier: number;
  switch (unit) {
    case 's': // seconds
      multiplier = 1;
      break;
    case 'm': // minutes
      multiplier = 60;
      break;
    case 'h': // hours
      multiplier = 60 * 60;
      break;
    case 'd': // days
      multiplier = 60 * 60 * 24;
      break;
    case 'w': // weeks
      multiplier = 60 * 60 * 24 * 7;
      break;
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }

  return value * multiplier;
}

export function getNextUtcMidnight(): Date {
  const now = new Date();
  const utcMidnight = new Date(now.toUTCString()).setUTCHours(0, 0, 0, 0);
  return new Date(
    utcMidnight > now.getTime()
      ? utcMidnight
      : utcMidnight + 24 * 60 * 60 * 1000
  );
}
