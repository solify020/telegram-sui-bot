export function formatDateString(dateString: string): string {
    // Create a Date object from the input string
    const date = new Date(dateString);

    // Get the year, month, and date with padding
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is zero-based
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Get the hours, minutes, and seconds with padding
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    // Format the date to "YYYY/MM/DD HH:MM:SS"
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}