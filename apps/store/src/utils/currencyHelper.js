/**
 * Mengonversi harga dasar (Rupiah) ke mata uang target berdasarkan rate kurs.
 */
export const convertPrice = (priceInIdr, targetCurrency, rates) => {
  const numPrice = Number(priceInIdr) || 0;
  if (!rates || !rates[targetCurrency]) return numPrice;
  return numPrice * rates[targetCurrency];
};

/**
 * Mengonversi dan memformat harga Rupiah ke mata uang target dengan format lokal masing-masing negara.
 */
export const formatPrice = (priceInIdr, targetCurrency, rates) => {
  const converted = convertPrice(priceInIdr, targetCurrency, rates);
  
  // Konfigurasi opsi desimal. IDR dan JPY biasanya tidak memakai angka di belakang koma (sen).
  const isNoDecimal = targetCurrency === 'IDR' || targetCurrency === 'JPY';
  const options = {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: isNoDecimal ? 0 : 2,
    maximumFractionDigits: isNoDecimal ? 0 : 2,
  };

  try {
    // Tentukan locale (bahasa & format negara) yang sesuai
    let locale = 'id-ID';
    if (targetCurrency === 'USD') locale = 'en-US';
    else if (targetCurrency === 'JPY') locale = 'ja-JP';
    else if (targetCurrency === 'SGD') locale = 'en-SG';
    else if (targetCurrency === 'MYR') locale = 'ms-MY';
    else if (targetCurrency === 'BND') locale = 'ms-BN';
    else if (targetCurrency === 'THB') locale = 'th-TH';
    else if (targetCurrency === 'PHP') locale = 'en-PH';
    else if (targetCurrency === 'CNY') locale = 'zh-CN';
    else if (targetCurrency === 'EUR') locale = 'de-DE';

    return new Intl.NumberFormat(locale, options).format(converted);
  } catch (e) {
    // Fallback manual jika Intl.NumberFormat terjadi error
    const symbol = targetCurrency === 'IDR' ? 'Rp ' : 
                   targetCurrency === 'USD' ? '$' : 
                   targetCurrency === 'JPY' ? '¥' : 
                   targetCurrency === 'SGD' ? 'S$' : 
                   targetCurrency === 'MYR' ? 'RM ' :
                   targetCurrency === 'BND' ? 'B$' :
                   targetCurrency === 'THB' ? '฿' :
                   targetCurrency === 'PHP' ? '₱' :
                   targetCurrency === 'CNY' ? '¥' :
                   targetCurrency === 'EUR' ? '€' : '';
    const formattedVal = converted.toLocaleString(undefined, { 
      minimumFractionDigits: isNoDecimal ? 0 : 2,
      maximumFractionDigits: isNoDecimal ? 0 : 2
    });
    return `${symbol}${formattedVal}`;
  }
};
