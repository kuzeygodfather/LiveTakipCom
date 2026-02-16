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
