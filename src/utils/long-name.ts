export const parseLongName = (name: string) => {
  const items = name.split(' ').filter((v) => v !== '');
  return {
    permissions: items[0],
    owner: items[2],
    group: items[3],
  }
}