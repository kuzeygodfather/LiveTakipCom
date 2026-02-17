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

export function formatDateInIstanbulTimezone(utcDateString: string): string {
  const date = new Date(utcDateString);
  const istanbulDateString = date.toLocaleString('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = istanbulDateString.split(/[\/,\s]+/);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function convertIstanbulDateToUTC(dateString: string, isEndOfDay: boolean = false): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const istanbulDate = new Date();
  istanbulDate.setFullYear(year, month - 1, day);

  if (isEndOfDay) {
    istanbulDate.setHours(23, 59, 59, 999);
  } else {
    istanbulDate.setHours(0, 0, 0, 0);
  }

  const istanbulTimeStr = istanbulDate.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
  const utcDate = new Date(istanbulTimeStr);

  return utcDate.toISOString();
}
