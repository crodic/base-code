export function formatCurrency(number: number): string {
    const formattedNumber = number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formattedCurrency = `${formattedNumber} VNĐ`;
    return formattedCurrency;
}
