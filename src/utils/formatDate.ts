// Function to format date as DD-MM-YY
export const formatDate = (dateString: string | Date) => {
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

// Function to format date and time as D MMM YYYY hh:mm AM/PM (e.g., 11 May 2026 05:20 PM)
export const formatDateTime = (dateString: string | Date) => {
  const d = new Date(dateString);
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hoursStr = String(hours).padStart(2, "0");
  
  return `${day} ${month} ${year} ${hoursStr}:${minutes} ${ampm}`;
};