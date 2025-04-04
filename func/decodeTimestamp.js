const decodeTimestamp = async (ptstmp) => {
    const zdate = new Date(ptstmp); // konversi ke objek `Date`
  
    // mengeset time zone ke GMT+7
    const formattedDate = zdate.toLocaleString('en-GB', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    // console.log(formattedDate);
  
    return `(${formattedDate})`;
  };
  
  module.exports = decodeTimestamp;