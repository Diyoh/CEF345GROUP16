export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(amount);
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};