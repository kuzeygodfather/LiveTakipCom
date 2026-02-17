export function maskName(name: string | null | undefined): string {
  if (!name) return 'Bilinmiyor';
  return name
    .split(' ')
    .map(word => {
      if (word.length <= 1) return word;
      return word[0] + '*'.repeat(word.length - 1);
    })
    .join(' ');
}

export function getIstanbulDateStartUTC(daysAgo: number = 0): string {
  const now = new Date();
  const istanbulTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));

  istanbulTime.setDate(istanbulTime.getDate() - daysAgo);
  istanbulTime.setHours(0, 0, 0, 0);

  const utcEquivalent = new Date(istanbulTime.toLocaleString('en-US', { timeZone: 'UTC' }));

  return utcEquivalent.toISOString();
}

export function getIstanbulDateEndUTC(daysAgo: number = 0): string {
  const now = new Date();
  const istanbulTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));

  istanbulTime.setDate(istanbulTime.getDate() - daysAgo);
  istanbulTime.setHours(23, 59, 59, 999);

  const utcEquivalent = new Date(istanbulTime.toLocaleString('en-US', { timeZone: 'UTC' }));

  return utcEquivalent.toISOString();
}
