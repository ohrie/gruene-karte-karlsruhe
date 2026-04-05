import type { Map as MapLibreMap } from 'maplibre-gl';

const TABLE_TENNIS_ICON_ID = 'table-tennis-icon';

export function registerTableTennisIcon(map: MapLibreMap): void {
    if (map.hasImage(TABLE_TENNIS_ICON_ID)) return;

    const size = 48;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    const tableX = 6;
    const tableY = 9;
    const tableW = 36;
    const tableH = 18;
    const radius = 4;

    ctx.fillStyle = '#4aa6c9';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(tableX + radius, tableY);
    ctx.lineTo(tableX + tableW - radius, tableY);
    ctx.quadraticCurveTo(tableX + tableW, tableY, tableX + tableW, tableY + radius);
    ctx.lineTo(tableX + tableW, tableY + tableH - radius);
    ctx.quadraticCurveTo(tableX + tableW, tableY + tableH, tableX + tableW - radius, tableY + tableH);
    ctx.lineTo(tableX + radius, tableY + tableH);
    ctx.quadraticCurveTo(tableX, tableY + tableH, tableX, tableY + tableH - radius);
    ctx.lineTo(tableX, tableY + radius);
    ctx.quadraticCurveTo(tableX, tableY, tableX + radius, tableY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size / 2, tableY + 1);
    ctx.lineTo(size / 2, tableY + tableH - 1);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#46616b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tableX + 10, tableY + tableH);
    ctx.lineTo(tableX + 8, tableY + tableH + 11);
    ctx.moveTo(tableX + tableW - 10, tableY + tableH);
    ctx.lineTo(tableX + tableW - 8, tableY + tableH + 11);
    ctx.stroke();

    const imageData = ctx.getImageData(0, 0, size, size);
    map.addImage(TABLE_TENNIS_ICON_ID, {
        width: size,
        height: size,
        data: new Uint8Array(imageData.data),
    });
}
